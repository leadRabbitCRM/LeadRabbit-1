import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { parseStringPromise } from "xml2js";
import jwt from "jsonwebtoken";

export async function POST(request) {
  try {
    // Get customer database from JWT token
    const token = request.cookies.get("appToken")?.value;
    let dbName = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        dbName = decoded.dbName;
      } catch {
        // If token is invalid, this could be a webhook call - use leadrabbit_superadmin
        dbName = "leadrabbit_superadmin";
      }
    } else {
      // No token - this could be a webhook call
      dbName = "leadrabbit_superadmin";
    }

    const client = await clientPromise;
    const db = client.db(dbName);

    // Get request body for date range
    const body = await request.json().catch(() => ({}));
    const { startDate, endDate } = body;

    console.log("99acres sync request - Raw dates received:", { startDate, endDate });

    const accounts = await db
      .collection("99acresIntegrations")
      .find({ isActive: true })
      .toArray();

    let totalLeadsSynced = 0;
    const errors = [];
    const successfulAccounts = [];

    for (const account of accounts) {
      let syncEndDate;
      let syncStartDate;
      
      if (startDate && endDate) {
        // Check what format we received
        console.log("Date format check:", { 
          startDate, 
          endDate,
          startDateType: typeof startDate,
          endDateType: typeof endDate
        });

        // Parse dates as local time (YYYY-MM-DD format)
        // Handle both YYYY-MM-DD and ISO formats
        let startParts, endParts;
        
        if (startDate.includes('T')) {
          // ISO format - extract just the date part
          startParts = startDate.split('T')[0].split('-');
          endParts = endDate.split('T')[0].split('-');
          console.log("Parsed as ISO format");
        } else {
          // YYYY-MM-DD format
          startParts = startDate.split('-');
          endParts = endDate.split('-');
          console.log("Parsed as YYYY-MM-DD format");
        }
        
        syncStartDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 0, 0, 0);
        syncEndDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 0, 0, 0);
        
        console.log(`📅 99acres sync dates parsed:`, {
          receivedStart: startDate,
          receivedEnd: endDate,
          parsedStart: syncStartDate.toString(),
          parsedEnd: syncEndDate.toString(),
          localStart: syncStartDate.toLocaleDateString(),
          localEnd: syncEndDate.toLocaleDateString()
        });
      } else {
        // Default to last 7 days
        syncEndDate = new Date();
        syncStartDate = new Date(syncEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        console.log("Using default 7-day range");
      }

      // Format dates as YYYY-MM-DD HH:MM:SS for the 99acres API
      const formatDateForXml = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      const requestXml = `<?xml version='1.0'?><query><user_name>${account.username}</user_name><pswd>${account.password}</pswd><start_date>${formatDateForXml(syncStartDate)}</start_date><end_date>${formatDateForXml(syncEndDate)}</end_date></query>`;

      console.log(
        `📅 99acres sync: ${account.username} - Date range: ${syncStartDate.toLocaleDateString()} to ${syncEndDate.toLocaleDateString()}`
      );

      const response = await fetch(
        "https://www.99acres.com/99api/v1/getmy99Response/OeAuXClO43hwseaXEQ/uid/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `xml=${encodeURIComponent(requestXml)}`,
        }
      );


      const xmlText = await response.text();

      const parsedXml = await parseStringPromise(xmlText);

      // Check for errors in response
      if (parsedXml.Xml.$.ActionStatus !== "true") {
        const errorDetail = parsedXml.Xml.ErrorDetail?.[0];
        const errorCode = errorDetail?.Code?.[0] || "UNKNOWN";
        const errorMessage = errorDetail?.Message?.[0] || "Unknown error";
        
        const fullError = `[${errorCode}] ${errorMessage}`;
        console.error(
          `❌ 99acres API error for ${account.username}: ${fullError}`
        );
        
        // Collect error for response
        errors.push({
          account: account.username,
          code: errorCode,
          message: errorMessage,
        });
        
        // Update account with error status
        await db.collection("99acresIntegrations").updateOne(
          { _id: account._id },
          {
            $set: {
              lastSyncError: fullError,
              lastSyncAt: new Date(),
            },
          }
        );
        continue;
      }

      if (parsedXml.Xml.Resp) {
        const responses = Array.isArray(parsedXml.Xml.Resp)
          ? parsedXml.Xml.Resp
          : [parsedXml.Xml.Resp];

        for (const resp of responses) {
          const qryDtl = resp.QryDtl[0];
          const cntctDtl = resp.CntctDtl[0];

          const leadData = {
            source: "99acres",
            accountId: account._id,
            username: account.username,
            status: "New",
            queryId: qryDtl.$.TblId,
            responseType: qryDtl.$.ResType,
            productId: qryDtl.ProdId[0]._,
            productStatus: qryDtl.ProdId[0].$.Status,
            productType: qryDtl.ProdId[0].$.Type,
            propertyDescription: qryDtl.CmpctLabl[0],
            queryInfo: qryDtl.QryInfo[0],
            receivedOn: new Date(qryDtl.RcvdOn[0].replace(/\//g, '-')),
            name: cntctDtl.Name[0],
            email: cntctDtl.Email[0],
            phone: cntctDtl.Phone[0],
            createdAt: new Date(),
          };

          // Check if lead already exists
          const existingLead = await db.collection("leads").findOne({
            source: "99acres",
            queryId: leadData.queryId,
          });

          if (!existingLead) {
            await db.collection("leads").insertOne(leadData);
            totalLeadsSynced++;
          }
        }

        // Update last sync time and clear error
        await db.collection("99acresIntegrations").updateOne(
          { _id: account._id },
          {
            $set: {
              lastSync: syncEndDate,
              lastSyncError: null,
            },
          }
        );

        // Add to successful accounts
        successfulAccounts.push(account.username);
      } else {
        console.warn(`⚠️ No leads found for ${account.username}`);
      }
    }

    const hasErrors = errors.length > 0;
    console.log(
      `${hasErrors ? "⚠️" : "✅"} 99acres sync completed: ${totalLeadsSynced} leads synced from ${successfulAccounts.length} account(s)${
        hasErrors ? `, ${errors.length} error(s) occurred` : ""
      }`
    );

    return NextResponse.json({
      success: !hasErrors,
      leadsProcessed: totalLeadsSynced,
      successfulAccounts,
      errors: hasErrors ? errors : [],
    });
  } catch (error) {
    console.error("Error syncing 99acres leads:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

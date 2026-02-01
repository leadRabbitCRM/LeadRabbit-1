import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { parseStringPromise } from "xml2js";

/**
 * 99acres Webhook Endpoint
 * 
 * Receives real-time lead data from 99acres when customers respond to property queries.
 * 
 * Usage:
 * POST /api/webhook/99acres
 * Body: XML with lead data
 * 
 * Expected payload structure:
 * <Xml ActionStatus="true">
 *   <Resp>
 *     <QryDtl QueryId="...">...</QryDtl>
 *     <CntctDtl>
 *       <Name>...</Name>
 *       <Email>...</Email>
 *       <Phone>...</Phone>
 *     </CntctDtl>
 *   </Resp>
 * </Xml>
 */
export async function POST(request) {
  try {
    // Get the raw body as text
    const bodyText = await request.text();

    // Parse XML
    const parsedXml = await parseStringPromise(bodyText);

    if (!parsedXml.Xml) {
      return NextResponse.json(
        { error: "Invalid XML structure" },
        { status: 400 }
      );
    }

    // Check ActionStatus
    if (parsedXml.Xml.$.ActionStatus !== "true") {
      const errorDetail = parsedXml.Xml.ErrorDetail?.[0];
      const errorMessage = errorDetail?.Message?.[0] || "Unknown error";
      console.warn(`❌ 99acres webhook: ActionStatus false - ${errorMessage}`);
      return NextResponse.json(
        { success: false, message: "ActionStatus is false", error: errorMessage },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    let totalLeadsProcessed = 0;
    const processedCustomers = new Set();

    // Get all active 99acres accounts across all databases
    const superAdminDb = client.db("leadrabbit_superadmin");
    const customers = await superAdminDb
      .collection("customers")
      .find({ isActive: true })
      .toArray();

    // Parse responses from webhook
    const responses = Array.isArray(parsedXml.Xml.Resp)
      ? parsedXml.Xml.Resp
      : [parsedXml.Xml.Resp];

    console.log(
      `📨 99acres webhook received: ${responses.length} lead(s) to process`
    );

    // Process each lead
    for (const resp of responses) {
      const qryDtl = resp.QryDtl?.[0];
      const cntctDtl = resp.CntctDtl?.[0];

      if (!qryDtl || !cntctDtl) {
        console.warn("⚠️ 99acres webhook: Invalid response structure");
        continue;
      }

      // Extract lead data from XML
      const leadData = {
        source: "99acres",
        name: (cntctDtl.Name?.[0] || "Unknown").trim(),
        email: (cntctDtl.Email?.[0] || "").toLowerCase().trim(),
        phone: (cntctDtl.Phone?.[0] || "").trim(),
        status: "New",
        createdAt: new Date(),
        updatedAt: new Date(),
        metaData: {
          platform: "99acres",
          queryId: qryDtl.$.QueryId,
          responseType: qryDtl.$.ResType,
          propertyDescription: cntctDtl.CmpctLabl?.[0] || qryDtl.CmpctLabl?.[0],
          queryInfo: qryDtl.QryInfo?.[0],
          receivedOn: qryDtl.RcvdOn?.[0],
          projectId: qryDtl.ProjId?.[0],
          projectName: qryDtl.ProjName?.[0],
          cityName: qryDtl.CityName?.[0],
          propertyType: qryDtl.ResCom?.[0], // R = Residential, C = Commercial
          price: parseInt(qryDtl.Price?.[0] || "0"),
          phoneVerified: qryDtl.PhoneVerificationStatus?.[0] === "VERIFIED",
          emailVerified: qryDtl.EmailVerificationStatus?.[0] === "VERIFIED",
          identity: qryDtl.IDENTITY?.[0],
          propertyCode: qryDtl.PROPERTY_CODE?.[0],
          productId: qryDtl.ProdId?.[0]._,
          productStatus: qryDtl.ProdId?.[0].$.Status,
          productType: qryDtl.ProdId?.[0].$.Type,
        },
      };

      // Store in all customer databases that have active 99acres accounts
      for (const customer of customers) {
        const customerDb = client.db(customer.dbName);
        
        // Check if customer has active 99acres integration
        const has99AcresAccount = await customerDb
          .collection("99acresIntegrations")
          .findOne({ isActive: true });

        if (!has99AcresAccount) {
          continue;
        }

        // Check if lead already exists (by queryId)
        const existingLead = await customerDb
          .collection("leads")
          .findOne({
            source: "99acres",
            "metaData.queryId": leadData.metaData.queryId,
          });

        if (!existingLead) {
          // Add accountId to lead data so it's counted correctly
          const leadWithAccountId = {
            ...leadData,
            accountId: has99AcresAccount._id,
          };

          // Insert the lead
          const result = await customerDb
            .collection("leads")
            .insertOne(leadWithAccountId);

          console.log(
            `✅ 99acres webhook: Lead "${leadData.name}" created for customer ${customer.name} (ID: ${result.insertedId})`
          );
          totalLeadsProcessed++;
          processedCustomers.add(customer.name);
        } else {
          console.log(
            `⚠️ 99acres webhook: Duplicate lead detected (QueryId: ${leadData.metaData.queryId}) for ${customer.name}`
          );
        }
      }
    }

    const summaryLog = Array.from(processedCustomers).length > 0
      ? ` across customers: ${Array.from(processedCustomers).join(", ")}`
      : " (no active 99acres accounts found)";

    console.log(
      `✅ 99acres webhook completed: ${totalLeadsProcessed} leads processed${summaryLog}`
    );

    return NextResponse.json({
      success: true,
      leadsProcessed: totalLeadsProcessed,
      message: `Successfully processed ${totalLeadsProcessed} leads`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 99acres webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

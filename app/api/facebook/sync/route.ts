// app/api/facebook/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { MetaLead, CRMLead } from "@/lib/models/MetaLead";
import jwt from "jsonwebtoken";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    // Get optional pageId from request body
    const body = await req.json().catch(() => ({}));
    const { pageId, startDate, endDate } = body;

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);

    const metaPagesCollection = db.collection("meta_pages");
    const metaLeadsCollection = db.collection("meta_leads");
    const crmLeadsCollection = db.collection("leads");

    // Build query - if pageId provided, sync only that page, otherwise sync all active pages
    const query: any = { isActive: true };
    if (pageId) {
      query.pageId = pageId;
    }

    // Get Meta pages to sync
    const activePages = await metaPagesCollection
      .find(query)
      .toArray();

    let totalLeadsSynced = 0;

    for (const page of activePages) {
      const formLeadCounts: { [formId: string]: number } = {};

      for (const form of page.leadForms || []) {
        try {
          // Build Facebook API URL with optional date filtering
          let apiUrl = `https://graph.facebook.com/v18.0/${form.formId}/leads?access_token=${page.accessToken}`;
          
          // Add date filtering if provided
          if (startDate && endDate) {
            // Convert dates to Unix timestamps (Facebook API uses seconds)
            const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
            const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
            apiUrl += `&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${startTimestamp}},{"field":"time_created","operator":"LESS_THAN","value":${endTimestamp}}]`;
          }

          // Fetch leads from Facebook API
          const leadsResponse = await fetch(apiUrl);

          const leadsData = await leadsResponse.json();

          if (leadsData.error) {
            console.error(
              `❌ Error fetching leads for form ${form.formId}:`,
              leadsData.error,
            );
            continue;
          }

          const leads = leadsData.data || [];
          let formLeadsCount = 0;

          for (const lead of leads) {
            const metaLead: MetaLead = {
              leadId: lead.id,
              created_time: new Date(lead.created_time),
              field_data: lead.field_data || [],
              form_id: form.formId,
              form_name: form.formName || form.name || "",
              page_id: page.pageId,
              platform: "facebook",
              processed: false,
            };

            // Store Meta lead
            await metaLeadsCollection.updateOne(
              { leadId: lead.id },
              { $set: metaLead },
              { upsert: true },
            );

            // Convert to CRM lead
            const crmLead = convertMetaLeadToCRM(metaLead, form.formName || form.name);

            if (crmLead) {
              const existingLead = await crmLeadsCollection.findOne({
                "metaData.leadId": lead.id,
              });

              if (!existingLead) {
                const { _id, ...leadData } = crmLead;
                await crmLeadsCollection.insertOne(leadData);
                totalLeadsSynced++;
              }

              // Mark Meta lead as processed
              await metaLeadsCollection.updateOne(
                { leadId: lead.id },
                { $set: { processed: true } },
              );
            }

            formLeadsCount++;
          }

          // Store the lead count for this form
          formLeadCounts[form.formId] = formLeadsCount;
        } catch (formError) {
          console.error(`❌ Error processing form ${form.formId}:`, formError);
        }
      }

      // Update the page's lead forms with the new lead counts
      const updatedLeadForms = (page.leadForms || []).map((form: any) => ({
        ...form,
        leads: Array(formLeadCounts[form.formId] || 0).fill(null), // Create array with correct length
      }));

      await metaPagesCollection.updateOne(
        { pageId: page.pageId },
        { $set: { leadForms: updatedLeadForms } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${totalLeadsSynced} new leads`,
      leadsSynced: totalLeadsSynced,
    });
  } catch (error) {
    console.error("❌ Meta sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync Meta leads",
      },
      { status: 500 },
    );
  }
}

function convertMetaLeadToCRM(metaLead: MetaLead, formName?: string): CRMLead | null {
  try {
    const fieldData = metaLead.field_data || [];

    let name = "";
    let email = "";
    let phone = "";

    // Parse Meta field data
    for (const field of fieldData) {
      switch (field.name.toLowerCase()) {
        case "full_name":
        case "name":
          name = field.values[0] || "";
          break;
        case "email":
          email = field.values[0] || "";
          break;
        case "phone_number":
        case "phone":
          phone = field.values[0] || "";
          break;
      }
    }

    // Generate name from first_name and last_name if full_name not available
    if (!name) {
      const firstName =
        fieldData.find((f) => f.name.toLowerCase() === "first_name")
          ?.values[0] || "";
      const lastName =
        fieldData.find((f) => f.name.toLowerCase() === "last_name")
          ?.values[0] || "";
      name = `${firstName} ${lastName}`.trim();
    }

    // Validate required fields
    if (!name && !email) {
      console.warn(
        "❌ Lead missing both name and email, cannot create CRM lead",
      );
      return null;
    }

    const crmLead: CRMLead = {
      name: name || "Unknown",
      email: email,
      phone: phone,
      source: metaLead.platform,
      status: "New",
      createdAt: new Date(metaLead.created_time),
      updatedAt: new Date(),
      metaData: {
        leadId: metaLead.leadId,
        formId: metaLead.form_id || "",
        formName: formName || metaLead.form_name || "",
        pageId: metaLead.page_id || "",
        platform: metaLead.platform,
        originalFields: metaLead.field_data,
      },
      priority: "medium",
      tags: [`${metaLead.platform}-lead`],
    };

    return crmLead;
  } catch (err) {
    console.error("Error converting Meta lead to CRM:", err);
    return null;
  }
}

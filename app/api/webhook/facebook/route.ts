// app/api/webhook/facebook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "@/lib/mongodb";
import { MetaLead, CRMLead } from "@/lib/models/MetaLead";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Webhook verification endpoint (GET)
export async function GET(req: NextRequest) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("🔔 Webhook verification request:");
    console.log(`   Mode: ${mode}`);
    console.log(`   Token: ${token}`);
    console.log(`   Challenge: ${challenge}`);
    console.log(`   Expected Token: ${process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN}`);

    if (
      mode === "subscribe" &&
      token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
    ) {
      console.log("✅ Webhook verification successful");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error("❌ Facebook webhook verification failed");
      console.error(`   Mode match: ${mode === "subscribe"}`);
      console.error(`   Token match: ${token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN}`);
      return new NextResponse("Forbidden", { status: 403 });
    }
  } catch (error) {
    console.error("❌ Webhook verification error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Webhook POST endpoint for receiving lead notifications
export async function POST(req: NextRequest) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.text();
    console.log("📥 Webhook received:", body);
    
    const signature =
      req.headers.get("x-hub-signature-256") ||
      req.headers.get("x-hub-signature");

    console.log("🔐 Signature:", signature ? "Present" : "Missing");

    // Verify webhook signature in production
    if (
      process.env.NODE_ENV === "production" &&
      !verifyWebhookSignature(body, signature)
    ) {
      console.error("❌ Signature verification failed");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = JSON.parse(body);
    console.log("📦 Parsed webhook data:", JSON.stringify(data, null, 2));

    const { entry } = data;
    if (!entry || !Array.isArray(entry)) {
      console.error("❌ Invalid payload format - no entry array");
      return new NextResponse("Bad Request", { status: 400 });
    }

    console.log(`✅ Processing ${entry.length} entry/entries`);

    // Send response immediately to avoid timeout
    const response = new NextResponse("OK", { status: 200 });

    // Process leads asynchronously
    processWebhookEntry(entry).catch((err) => {
      console.error("❌ Error processing webhook entry:", err);
    });

    return response;
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
): boolean {
  try {
    if (!signature || !process.env.FACEBOOK_APP_SECRET) {
      console.error("❌ No signature or app secret provided");
      return false;
    }

    // Handle both SHA1 and SHA256 signatures
    let expectedHash: string;
    let receivedHash: string;

    if (signature.startsWith("sha256=")) {
      receivedHash = signature.split("sha256=")[1];
      expectedHash = crypto
        .createHmac("sha256", process.env.FACEBOOK_APP_SECRET)
        .update(payload)
        .digest("hex");
    } else if (signature.startsWith("sha1=")) {
      receivedHash = signature.split("sha1=")[1];
      expectedHash = crypto
        .createHmac("sha1", process.env.FACEBOOK_APP_SECRET)
        .update(payload)
        .digest("hex");
    } else {
      console.error("❌ Invalid signature format");
      return false;
    }

    return receivedHash === expectedHash;
  } catch (err) {
    console.error("❌ Signature verification error:", err);
    return false;
  }
}

/**
 * Fetch complete lead data from Facebook API
 * GET https://graph.facebook.com/v24.0/{leadgen_id}?access_token=PAGE_ACCESS_TOKEN
 */
async function fetchFacebookLeadData(leadId: string, accessToken?: string): Promise<any[]> {
  try {
    if (!accessToken) {
      console.warn(`⚠️ No access token available for fetching lead ${leadId}`);
      return [];
    }

    const facebookApiUrl = `https://graph.facebook.com/v24.0/${leadId}`;
    const params = new URLSearchParams();
    params.append("access_token", accessToken);

    console.log(`📡 Calling Facebook API: GET ${facebookApiUrl}`);
    
    const response = await fetch(`${facebookApiUrl}?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Facebook API error (${response.status}):`, errorData);
      return [];
    }

    const leadData = await response.json();
    console.log(`✅ Facebook API response:`, JSON.stringify(leadData, null, 2));

    // Extract field_data from the response
    if (leadData.field_data && Array.isArray(leadData.field_data)) {
      console.log(`✅ Extracted ${leadData.field_data.length} fields from lead data`);
      return leadData.field_data;
    }

    console.warn(`⚠️ No field_data in Facebook API response`);
    return [];
  } catch (err) {
    console.error(`❌ Error fetching Facebook lead data:`, err);
    return [];
  }
}

async function processWebhookEntry(entries: any[]) {
  console.log(`🔄 Processing ${entries.length} webhook entries`);
  
  for (const pageEntry of entries) {
    console.log(`📄 Page Entry ID: ${pageEntry.id}`);
    console.log(`📋 Changes:`, JSON.stringify(pageEntry.changes, null, 2));
    
    for (const change of pageEntry.changes) {
      console.log(`🔔 Change field: ${change.field}, item: ${change.value?.item}`);
      
      // Handle both old format (item=lead) and new format (field=leadgen)
      if (change.field === "leadgen" || change.value.item === "lead") {
        const leadId = change.value.leadgen_id || change.value.lead_id;
        const formId = change.value.form_id;
        
        if (leadId && formId) {
          console.log(`🎯 Lead detected! Form ID: ${formId}, Lead ID: ${leadId}`);
          await processNewLead(
            pageEntry.id,
            formId,
            leadId,
            change.value.field_data,
          );
        } else {
          console.log(`⚠️ Missing required fields - Lead ID: ${leadId}, Form ID: ${formId}`);
        }
      } else {
        console.log(`⏭️ Skipping non-lead item: ${change.value.item}`);
      }
    }
  }
}

async function processNewLead(
  pageId: string,
  formId: string,
  leadId: string,
  fieldData?: any[],
) {
  try {
    console.log(`\n🆕 Processing new lead:`);
    console.log(`   Page ID: ${pageId}`);
    console.log(`   Form ID: ${formId}`);
    console.log(`   Lead ID: ${leadId}`);
    console.log(`   Field Data from webhook:`, JSON.stringify(fieldData, null, 2));
    
    const client = await clientPromise;
    if (!client) {
      console.error("❌ MongoDB client unavailable for webhook");
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(process.env.DB_NAME);

    // Check if the page is active
    const metaPagesCollection = db.collection("meta_pages");
    const page = await metaPagesCollection.findOne({ pageId });
    
    console.log(`🔍 Page lookup result:`, page ? `Found: ${page.name}, Active: ${page.isActive}` : "Not found");
    
    if (!page) {
      console.log(`⚠️ Skipping lead ${leadId} - Page ${pageId} not found in database`);
      console.log(`💡 Make sure to add this page instance via the "Add Instance" button in the connector settings`);
      return;
    }
    
    if (!page.isActive) {
      console.log(`⚠️ Skipping lead ${leadId} - Page ${pageId} is not enabled`);
      console.log(`💡 Enable this page instance in the connector settings to start receiving leads`);
      return;
    }

    const metaLeadsCollection = db.collection("meta_leads");
    const crmLeadsCollection = db.collection("leads");

    console.log(`✅ Page is active, processing lead...`);

    // Fetch full lead data from Facebook API
    let fullFieldData = fieldData || [];
    if (!fieldData || fieldData.length === 0) {
      console.log(`📡 Fetching full lead data from Facebook API...`);
      fullFieldData = await fetchFacebookLeadData(leadId, page.accessToken || page.pageAccessToken);
      if (fullFieldData && fullFieldData.length > 0) {
        console.log(`✅ Retrieved ${fullFieldData.length} fields from Facebook API`);
        console.log(`   Data:`, JSON.stringify(fullFieldData, null, 2));
      } else {
        console.warn(`⚠️ No field data retrieved from Facebook API`);
        fullFieldData = [];
      }
    }

    // Create Meta lead record with ALL field data
    const metaLead: MetaLead = {
      leadId: leadId,
      created_time: new Date(),
      field_data: fullFieldData,
      form_id: formId,
      page_id: pageId,
      platform: "facebook",
      processed: false,
    };

    // Store Meta lead
    await metaLeadsCollection.updateOne(
      { leadId: leadId },
      { $set: metaLead },
      { upsert: true },
    );
    console.log(`💾 Stored Meta lead in database`);

    // Convert to CRM lead format
    const crmLead = convertMetaLeadToCRM(metaLead);
    console.log(`🔄 CRM Lead conversion:`, crmLead ? "Success" : "Failed");

    if (crmLead) {
      // Store in CRM leads collection
      await crmLeadsCollection.updateOne(
        { "metaData.leadId": leadId },
        { $set: crmLead },
        { upsert: true },
      );
      console.log(`✅ Stored CRM lead in database`);

      // Mark Meta lead as processed
      await metaLeadsCollection.updateOne(
        { leadId: leadId },
        { $set: { processed: true } },
      );
      console.log(`✅ Lead ${leadId} processed successfully!`);

      // Update the lead count in the page's lead forms
      await updateLeadFormCount(metaPagesCollection, pageId, formId);
    } else {
      console.log(`❌ Failed to convert lead to CRM format`);
      await metaLeadsCollection.updateOne(
        { leadId: leadId },
        {
          $set: {
            processed: false,
            error_message: "Failed to convert to CRM format",
          },
        },
      );
    }
  } catch (err) {
    console.error(`❌ Error processing lead ${leadId}:`, err);

    // Update Facebook lead with error
    try {
      const client = await clientPromise;
      if (!client) {
        console.error("MongoDB client unavailable for lead retrieval");
        return new Response(`Failed to fetch lead data`, { status: 500 });
      }
      const db = client!.db(process.env.DB_NAME);
      await db
        .collection("meta_leads")
        .updateOne(
          { leadId: leadId },
          {
            $set: {
              processed: false,
              error_message:
                err instanceof Error ? err.message : "Unknown error",
            },
          },
        );
    } catch (updateErr) {
      console.error("Failed to update lead with error:", updateErr);
    }
  }
}

async function updateLeadFormCount(
  metaPagesCollection: any,
  pageId: string,
  formId: string
) {
  try {
    const page = await metaPagesCollection.findOne({ pageId });
    if (!page || !page.leadForms) return;

    // Find the form and increment its lead count
    const updatedLeadForms = page.leadForms.map((form: any) => {
      if (form.formId === formId) {
        const currentCount = form.leads?.length || 0;
        return {
          ...form,
          leads: Array(currentCount + 1).fill(null), // Increment count
        };
      }
      return form;
    });

    await metaPagesCollection.updateOne(
      { pageId },
      { $set: { leadForms: updatedLeadForms } }
    );
    console.log(`📊 Updated lead count for form ${formId}`);
  } catch (err) {
    console.error(`❌ Error updating lead form count:`, err);
  }
}

function convertMetaLeadToCRM(metaLead: MetaLead): CRMLead | null {
  try {
    // Extract common fields from Meta lead data
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

    // Convert all field data into a structured format
    const allFields: Record<string, any> = {};
    for (const field of fieldData) {
      const fieldName = field.name;
      const fieldValue = field.values && field.values.length > 0 ? field.values[0] : null;
      allFields[fieldName] = fieldValue;
    }

    const crmLead: CRMLead = {
      name: name || "Unknown",
      email: email,
      phone: phone,
      source: metaLead.platform,
      status: "New",
      createdAt: new Date(),
      updatedAt: new Date(),
      metaData: {
        leadId: metaLead.leadId,
        formId: metaLead.form_id || "",
        pageId: metaLead.page_id || "",
        platform: metaLead.platform,
        originalFields: metaLead.field_data,
        allFields: allFields, // Store ALL extracted fields
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

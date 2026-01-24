// app/api/facebook/pages/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);
    const metaPagesCollection = db.collection("meta_pages");

    const pages = await metaPagesCollection.find({}).toArray();

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching Facebook pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
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

    const { pageId, action } = await req.json();

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);
    const metaPagesCollection = db.collection("meta_pages");

    if (action === "enable") {
      // Enable page integration and set up webhook subscription
      const page = await metaPagesCollection.findOne({ pageId });

      if (!page) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      // Subscribe to webhooks for this page
      const webhookUrl = `${process.env.URL}/api/webhook/facebook`;
      const subscribeResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            access_token: page.accessToken,
            subscribed_fields: "leadgen",
          }),
        },
      );

      const subscribeData = await subscribeResponse.json();

      if (subscribeData.success) {
        // Fetch and store lead forms for this page
        await fetchAndStoreLeadForms(pageId, page.accessToken, dbName);

        // Update page status
        await metaPagesCollection.updateOne(
          { pageId },
          {
            $set: {
              isActive: true,
              lastUpdated: new Date(),
              webhookSubscribed: true,
            },
          },
        );

        return NextResponse.json({
          success: true,
          message: "Page integration enabled",
        });
      } else {
        return NextResponse.json(
          { error: "Failed to subscribe to webhooks" },
          { status: 400 },
        );
      }
    } else if (action === "disable") {
      // Disable page integration
      await metaPagesCollection.updateOne(
        { pageId },
        {
          $set: {
            isActive: false,
            lastUpdated: new Date(),
            webhookSubscribed: false,
          },
        },
      );

      return NextResponse.json({
        success: true,
        message: "Page integration disabled",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing Facebook page:", error);
    return NextResponse.json(
      { error: "Failed to manage page" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
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

    const { pageId } = await req.json();

    if (!pageId) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);
    const metaPagesCollection = db.collection("meta_pages");

    // Delete the page
    const result = await metaPagesCollection.deleteOne({ pageId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Page instance deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Facebook page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 },
    );
  }
}

async function fetchAndStoreLeadForms(pageId: string, accessToken: string, dbName: string) {
  try {
    // Fetch lead forms for the page
    const formsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?access_token=${accessToken}`,
    );
    const formsData = await formsResponse.json();

    const client = await clientPromise;
    if (!client) {
      console.error("MongoDB client unavailable for lead forms fetch");
      return;
    }
    const db = client!.db(dbName);
    const metaPagesCollection = db.collection("meta_pages");

    const leadForms =
      formsData.data?.map((form: any) => ({
        formId: form.id,
        locale: form.locale,
        name: form.name,
        status: form.status,
        leads: [],
      })) || [];

    // Update page with lead forms
    await metaPagesCollection.updateOne(
      { pageId },
      { $set: { leadForms } },
    );
  } catch (error) {
    console.error("Error fetching lead forms:", error);
  }
}

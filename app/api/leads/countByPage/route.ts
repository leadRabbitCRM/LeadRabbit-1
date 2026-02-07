import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    if (!token) {
      console.error("❌ leadsCountByPage: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      console.error("❌ leadsCountByPage: No dbName in token");
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      console.error("❌ leadsCountByPage: MongoDB client unavailable");
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    
    const db = client!.db(dbName);
    const leadsCollection = db.collection("leads");

    const pageId = req.nextUrl.searchParams.get("pageId");
    const formId = req.nextUrl.searchParams.get("formId");

    console.log(`🔍 leadsCountByPage query - pageId: ${pageId}, formId: ${formId}`);

    if (!pageId) {
      console.error("❌ pageId is required");
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    if (formId) {
      // Count leads for a specific form
      const query = { 
        "metaData.pageId": pageId,
        "metaData.formId": formId 
      };
      console.log(`🔎 Querying leads with filter:`, JSON.stringify(query));
      const count = await leadsCollection.countDocuments(query);
      
      console.log(`✅ leadsCountByPage: Found ${count} leads for pageId=${pageId}, formId=${formId}`);
      return NextResponse.json({ count, pageId, formId }, { status: 200 });
    } else {
      // Count leads for a page (all forms)
      const query = { 
        "metaData.pageId": pageId
      };
      console.log(`🔎 Querying leads with filter:`, JSON.stringify(query));
      const count = await leadsCollection.countDocuments(query);
      
      console.log(`✅ leadsCountByPage: Found ${count} leads for pageId=${pageId}`);
      return NextResponse.json({ count, pageId }, { status: 200 });
    }
  } catch (error) {
    console.error("❌ Error in leadsCountByPage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

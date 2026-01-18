import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

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
      console.error("❌ getAllLeads: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    console.log("✅ getAllLeads: Using database:", dbName);

    if (!dbName) {
      console.error("❌ getAllLeads: No dbName in token");
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      console.error("❌ getAllLeads: MongoDB client unavailable");
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);
    const leadsCollection = db.collection("leads");

    // Get ALL leads for admin view (no filters whatsoever)
    const leads = await leadsCollection.find({}).toArray();

    console.log(`✅ getAllLeads: Found ${leads.length} leads in ${dbName}`);

    return NextResponse.json(leads, { status: 200 });
  } catch (error) {
    console.error("❌ Error in admin getAllLeads:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching leads" },
      { status: 500 },
    );
  }
}

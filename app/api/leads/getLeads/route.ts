// pages/api/test.ts or app/api/test/route.ts
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
    const query = req.nextUrl.searchParams;
    const email = Object.fromEntries(query.entries()).email;

    console.log("🔍 getLeads: Looking for leads assigned to:", email);

    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    if (!token) {
      console.error("❌ getLeads: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    console.log("✅ getLeads: Using database:", dbName);

    if (!dbName) {
      console.error("❌ getLeads: No dbName in token");
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      console.error("❌ getLeads: MongoDB client unavailable");
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);

    const collection = db.collection("leads");
    const leads = await collection.find({ assignedTo: email }).toArray();

    console.log(`✅ getLeads: Found ${leads.length} leads for ${email} in ${dbName}`);

    if (leads) {
      return NextResponse.json(leads, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "Failed to retrieve leads" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("Error Retrieving Employee from DB !!", err);

    return NextResponse.json(
      { error: "Error Retrieving Employee from DB !!" },
      { status: 500 },
    );
  }
}

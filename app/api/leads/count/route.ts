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
      console.error("❌ leadsCount: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      console.error("❌ leadsCount: No dbName in token");
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      console.error("❌ leadsCount: MongoDB client unavailable");
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    
    const db = client!.db(dbName);
    const leadsCollection = db.collection("leads");

    // Count ALL leads in the database
    const count = await leadsCollection.countDocuments({});

    console.log(`✅ leadsCount: Found ${count} leads in ${dbName}`);

    return NextResponse.json({ count, dbName }, { status: 200 });
  } catch (error) {
    console.error("❌ Error in leadsCount:", error);
    return NextResponse.json(
      { error: "Internal server error while counting leads" },
      { status: 500 },
    );
  }
}

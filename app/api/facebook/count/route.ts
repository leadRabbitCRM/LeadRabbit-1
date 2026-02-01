import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json(
        { error: "Customer database not found" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client!.db(dbName);

    // Count Meta/Facebook leads
    const count = await db.collection("leads").countDocuments({
      $or: [
        { source: "Meta" },
        { source: "Facebook" },
        { "metaData.platform": "Meta" },
        { "metaData.platform": "Facebook" },
      ],
    });

    return NextResponse.json({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error("Error getting Meta lead count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get lead count" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export async function GET(request) {
  try {
    // Get customer database from JWT token
    const token = request.cookies.get("appToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json(
        { error: "Customer database not found" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);

    // Count 99acres leads
    const count = await db.collection("leads").countDocuments({
      source: "99acres",
    });

    return NextResponse.json({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error("Error getting 99acres lead count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get lead count" },
      { status: 500 }
    );
  }
}

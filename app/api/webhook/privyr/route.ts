// pages/api/test.ts or app/api/test/route.ts
import { NextRequest, NextResponse } from "next/server";

import clientPromise from "@/lib/mongodb";

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
    const body = await req.json();

    const client = await clientPromise;
    if (!client) {
      console.error("MongoDB client unavailable for privyr webhook");
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(process.env.DB_NAME);
    const leadData = { ...body, assignedTo: "", status: "New" };
    const result = await db.collection("leads").insertOne(leadData);

    if (result.acknowledged) {
      return NextResponse.json(
        { message: "Lead inserted with ID: " + result.insertedId },
        { status: 200 },
      );
    } else {
      console.error("Failed to insert lead");

      return NextResponse.json(
        { error: "Failed to insert lead" },
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

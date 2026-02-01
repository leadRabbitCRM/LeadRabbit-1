import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export async function POST(request) {
  try {
    // Get customer database from JWT token
    const token = request.cookies.get("appToken")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const dbName = decoded.dbName;
    if (!dbName) {
      return NextResponse.json(
        { success: false, error: "Customer database not found" },
        { status: 400 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);

    // Test the credentials by making a test API call
    const testXml = `<?xml version='1.0'?><query><user_name>${username}</user_name><pswd>${password}</pswd><start_date>${new Date(Date.now() - 86400000).toISOString().slice(0, 19).replace('T', ' ')}</start_date><end_date>${new Date().toISOString().slice(0, 19).replace('T', ' ')}</end_date></query>`;
    
    const response = await fetch(
      "https://www.99acres.com/99api/v1/getmy99Response/OeAuXClO43hwseaXEQ/uid/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `xml=${encodeURIComponent(testXml)}`,
      }
    );

    const xmlText = await response.text();
    
    // Check if authentication failed (ActionStatus without spaces)
    if (xmlText.includes('ActionStatus="false"') || xmlText.includes("authentication does not succeed") || xmlText.includes("Incorrect Username/Password")) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Store credentials in database
    await db.collection("99acresIntegrations").updateOne(
      { username },
      {
        $set: {
          username,
          password,
          isActive: true,
          lastSync: null,
          createdAt: new Date(),
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error authenticating 99acres:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

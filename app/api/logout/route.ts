// pages/api/test.ts or app/api/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

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
    const token = req.cookies.get("appToken")?.value;
    const secret = process.env.JWT_SECRET;

    let email: string | undefined;
    let dbName: string | undefined;

    if (token && secret) {
      try {
        const decoded = jwt.verify(token, secret) as { email?: string; dbName?: string };

        email = decoded.email;
        dbName = decoded.dbName;
      } catch (error) {
        console.error("Failed to verify token during logout", error);
      }
    }

    if (!email) {
      try {
        const body = await req.json();

        email = body?.email;
      } catch (error) {
        // No body provided; that's fine.
      }
    }

    if (email) {
      const client = await clientPromise;
      if (!client) {
        return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
      }
      
      // Use the database name from the token (multi-tenant) or fall back to default
      const databaseName = dbName || process.env.DB_NAME;
      const db = client!.db(databaseName);

      console.log(`Logging out user ${email} from database ${databaseName}`);

      const result = await db
        .collection("users")
        .findOneAndUpdate(
          { email },
          { $set: { isOnline: false, status: "inactive" } },
          { returnDocument: "after" },
        );
      
      console.log(`Logout update result:`, result ? "success" : "user not found");
    }

    const res = NextResponse.json({ message: "Logout" }, { status: 200 });

    res.cookies.set("appToken", "", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("Error Retrieving Employee from DB !!", err);

    return NextResponse.json(
      { error: "Error Retrieving Employee from DB !!" },
      { status: 500 },
    );
  }
}

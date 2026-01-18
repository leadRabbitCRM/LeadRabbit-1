import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { resolveAuthenticatedUser } from "../../_utils/auth";

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
    const auth = await resolveAuthenticatedUser(req);
    if ("status" in auth && auth.status !== 200) {
      return NextResponse.json(auth, { status: auth.status });
    }

    // Only admins can access this endpoint
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      console.error("MongoDB client unavailable");
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);
    const usersCollection = db.collection("users");

    // Get users with role "user" specifically
    const users = await usersCollection
      .find(
        {
          role: "user",
        },
        {
          projection: {
            password: 0,
          },
        },
      )
      .toArray();

    return NextResponse.json({
      users: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

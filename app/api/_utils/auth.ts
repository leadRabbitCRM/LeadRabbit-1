import { NextRequest } from "next/server";
import { Db } from "mongodb";
import jwt from "jsonwebtoken";

import clientPromise from "@/lib/mongodb";
import { getCustomerDb } from "@/lib/multitenancy";

export type AuthenticatedUser = {
  status: 200;
  db: Db;
  email: string;
  role: string;
  customerId: string;
  userDoc: Record<string, unknown>;
};

export type AuthFailure = {
  status: 400 | 401 | 403 | 404 | 500 | 503;
  error: string;
};

export async function resolveAuthenticatedUser(
  req: NextRequest,
): Promise<AuthenticatedUser | AuthFailure> {
  // Handle build time when environment variables might not be available
  if (!process.env.JWT_SECRET) {
    return { status: 500, error: "Server misconfiguration" };
  }

  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return { status: 500, error: "Database not configured" };
  }

  const token = req.cookies.get("appToken")?.value;

  if (!token) {
    return { status: 401, error: "Unauthorized" };
  }

  const secret = process.env.JWT_SECRET;

  let decoded: { email?: string; role?: string; customerId?: string; dbName?: string };

  try {
    decoded = jwt.verify(token, secret) as { 
      email?: string; 
      role?: string; 
      customerId?: string;
      dbName?: string;
    };
  } catch {
    return { status: 403, error: "Invalid token" };
  }

  const email = decoded.email;
  const role = decoded.role;
  const customerId = decoded.customerId;

  if (!email || !role) {
    return { status: 400, error: "Invalid token payload" };
  }

  // Super admin doesn't need customer database
  if (role === "superadmin") {
    return { status: 403, error: "Super admin cannot access customer endpoints" };
  }

  if (!customerId) {
    return { status: 400, error: "Customer ID missing in token" };
  }

  try {
    // Get customer database using multi-tenancy
    const db = await getCustomerDb(customerId);
    
    if (!db) {
      console.error("Customer database unavailable:", customerId);
      return { status: 503, error: "Database unavailable" } as const;
    }

    const usersCollection = db.collection("users");
    const userDoc = await usersCollection.findOne({ email });

    if (!userDoc) {
      return { status: 404, error: "User not found" };
    }

    return {
      status: 200,
      db,
      email,
      role,
      customerId,
      userDoc,
    };
  } catch (error) {
    console.error("Database connection error:", error);
    return { status: 500, error: "Database connection failed" };
  }
}

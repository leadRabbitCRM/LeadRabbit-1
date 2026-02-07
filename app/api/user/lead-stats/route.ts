import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import clientPromise from "@/lib/mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type TokenPayload = {
  email?: string;
  role?: string;
};

async function resolveAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get("appToken")?.value;

  if (!token) {
    return { status: 401, error: "Unauthorized" } as const;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not defined");

    return {
      status: 500,
      error: "Server misconfiguration",
    } as const;
  }

  let decoded: TokenPayload;

  try {
    decoded = jwt.verify(token, secret) as TokenPayload;
  } catch (_error) {
    return { status: 403, error: "Invalid token" } as const;
  }

  const email = decoded?.email;
  const dbName = (decoded as any)?.dbName;

  if (!email) {
    return { status: 400, error: "Invalid token payload" } as const;
  }

  if (!dbName) {
    return { status: 400, error: "Customer database not found in token" } as const;
  }

  const client = await clientPromise;
  if (!client) {
    return { status: 503, error: "Database unavailable" } as const;
  }
  const db = client!.db(dbName);
  const usersCollection = db.collection("users");

  const userDoc = await usersCollection.findOne({ email });

  if (!userDoc) {
    return { status: 404, error: "User not found" } as const;
  }

  return {
    status: 200 as const,
    db,
    usersCollection,
    userDoc,
    email,
  };
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const resolved = await resolveAuthenticatedUser(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db, userDoc, email } = resolved;
    const leadsCollection = db.collection("leads");

    // Fetch all leads assigned to this user (by email)
    const leads = await leadsCollection
      .find({ assignedTo: email })
      .toArray();

    const total = leads.length;

    // Count by status (case-insensitive)
    const statusCounts = leads.reduce((acc, lead) => {
      const status = (lead.status || "New").toLowerCase().trim();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      total,
      new: statusCounts.new || statusCounts.New || 0,
      interested: statusCounts.interested || statusCounts.Interested || 0,
      notInterested: statusCounts["not interested"] || statusCounts["Not Interested"] || statusCounts.notinterested || 0,
      deal: statusCounts.deal || statusCounts.Deal || 0,
    });
  } catch (error) {
    console.error("Failed to fetch lead statistics", error);

    return NextResponse.json(
      { error: "Failed to fetch lead statistics" },
      { status: 500 },
    );
  }
}

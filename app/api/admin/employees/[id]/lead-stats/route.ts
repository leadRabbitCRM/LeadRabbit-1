import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function resolveAdmin(req: NextRequest) {
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

  let decoded: any;

  try {
    decoded = jwt.verify(token, secret);
  } catch (_error) {
    return { status: 403, error: "Invalid token" } as const;
  }

  if (decoded.role !== "admin") {
    return { status: 403, error: "Forbidden" } as const;
  }

  const email = decoded.email;
  const dbName = decoded.dbName;

  if (!email || !dbName) {
    return { status: 400, error: "Invalid token payload" } as const;
  }

  const client = await clientPromise;
  if (!client) {
    return { status: 503, error: "Database unavailable" } as const;
  }
  const db = client!.db(dbName);
  const usersCollection = db.collection("users");

  const adminUser = await usersCollection.findOne({ email });

  if (!adminUser) {
    return { status: 403, error: "Admin not found" } as const;
  }

  return { status: 200 as const, db, usersCollection, email };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const resolved = await resolveAdmin(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db } = resolved;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee id" },
        { status: 400 },
      );
    }

    const userId = new ObjectId(id);
    const usersCollection = db.collection("users");
    const leadsCollection = db.collection("leads");

    // Get the user's email from their ID
    const userDoc = await usersCollection.findOne({ _id: userId });
    
    if (!userDoc || !userDoc.email) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Fetch all leads assigned to this employee (by email)
    const leads = await leadsCollection
      .find({ assignedTo: userDoc.email })
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

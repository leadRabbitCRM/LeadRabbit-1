import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { resolveAuthenticatedUser } from "../../_utils/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    const customerId = decoded.customerId;

    if (!dbName || !customerId) {
      return NextResponse.json(
        { error: "Customer database or ID not found" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    // Get master database for customer limits
    const masterDb = client.db("leadrabbit_superadmin");
    const customersCollection = masterDb.collection("customers");
    const customer = await customersCollection.findOne({ customerId });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const maxUsers = customer.maxUsers || Infinity;
    const maxAdmins = customer.maxAdmins || Infinity;

    // Get customer database for current counts
    const customerDb = client.db(dbName);
    const usersCollection = customerDb.collection("users");

    const currentUsers = await usersCollection.countDocuments({ role: "user" });
    const currentAdmins = await usersCollection.countDocuments({ role: "admin" });

    return NextResponse.json({
      users: {
        current: currentUsers,
        max: maxUsers === Infinity ? null : maxUsers,
        unlimited: maxUsers === Infinity,
      },
      admins: {
        current: currentAdmins,
        max: maxAdmins === Infinity ? null : maxAdmins,
        unlimited: maxAdmins === Infinity,
      },
    });
  } catch (error) {
    console.error("Error fetching user limits:", error);
    return NextResponse.json(
      { error: "Failed to fetch user limits" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSuperAdminDb } from "@/lib/multitenancy";

export const dynamic = 'force-dynamic';

/**
 * Create initial super admin user
 * This endpoint is only for initial setup
 * It will be disabled once a super admin exists
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password, setupKey } = body;

    // Security check - require setup key from environment
    const SETUP_KEY = process.env.SUPERADMIN_SETUP_KEY || "CHANGE_THIS_KEY_IN_PRODUCTION";
    
    if (setupKey !== SETUP_KEY) {
      return NextResponse.json(
        { error: "Invalid setup key" },
        { status: 403 }
      );
    }

    // Validation
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Get super admin database
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return NextResponse.json(
        { error: "Super admin database unavailable" },
        { status: 503 }
      );
    }

    const superAdminsCollection = superAdminDb.collection("super_admins");

    // Check if any super admin already exists
    const existingCount = await superAdminsCollection.countDocuments();
    
    if (existingCount > 0) {
      return NextResponse.json(
        { error: "Super admin already exists. Use the login page to access the system." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await superAdminsCollection.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Super admin with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin
    const superAdmin = {
      email,
      name,
      password: hashedPassword,
      createdAt: new Date(),
      lastLogin: null,
    };

    await superAdminsCollection.insertOne(superAdmin);

    return NextResponse.json(
      {
        success: true,
        message: "Super admin created successfully",
        loginUrl: `/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating super admin:", error);
    return NextResponse.json(
      { error: "Failed to create super admin" },
      { status: 500 }
    );
  }
}

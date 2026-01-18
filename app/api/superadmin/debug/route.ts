import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSuperAdminDb } from "@/lib/multitenancy";

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check super admin database
 * Remove this in production
 */
export async function GET(req: NextRequest) {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return NextResponse.json(
        { error: "Super admin database unavailable" },
        { status: 503 }
      );
    }

    const superAdminsCollection = superAdminDb.collection("super_admins");
    const superAdmins = await superAdminsCollection.find({}).toArray();

    // Don't return actual password hashes in production
    const sanitized = superAdmins.map((admin) => ({
      email: admin.email,
      name: admin.name,
      hasPassword: !!admin.password,
      passwordLength: admin.password?.length || 0,
      createdAt: admin.createdAt,
    }));

    return NextResponse.json(
      {
        count: superAdmins.length,
        superAdmins: sanitized,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Debug failed" },
      { status: 500 }
    );
  }
}

// Test password hash
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    const superAdminsCollection = superAdminDb.collection("super_admins");
    const superAdmin = await superAdminsCollection.findOne({ email });

    if (!superAdmin) {
      return NextResponse.json(
        { error: "Super admin not found" },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(password, superAdmin.password);

    return NextResponse.json(
      {
        email: superAdmin.email,
        passwordMatch: isValid,
        passwordHashExists: !!superAdmin.password,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { error: "Test failed" },
      { status: 500 }
    );
  }
}

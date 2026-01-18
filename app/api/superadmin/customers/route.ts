import { NextRequest, NextResponse } from "next/server";
import { createCustomer } from "@/lib/multitenancy";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

// Verify super admin role
function verifySuperAdmin(req: NextRequest): boolean {
  const token = req.cookies.get("appToken")?.value;
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { role?: string };
    return decoded.role === "superadmin";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify super admin
    if (!verifySuperAdmin(req)) {
      return NextResponse.json(
        { error: "Unauthorized. Super admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { customerName, adminEmail, adminPassword, metadata } = body;

    // Validation
    if (!customerName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Customer name, admin email, and password are required" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Password validation
    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Create customer
    const result = await createCustomer(customerName, adminEmail, adminPassword, metadata);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create customer" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully",
        customerId: result.customerId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAllCustomers, updateCustomerStatus, updateCustomer, deleteCustomer } from "@/lib/multitenancy";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  try {
    if (!verifySuperAdmin(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const customers = await getAllCustomers();

    return NextResponse.json(
      { customers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!verifySuperAdmin(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { customerId, status } = body;

    if (!customerId || !status) {
      return NextResponse.json(
        { error: "Customer ID and status are required" },
        { status: 400 }
      );
    }

    if (!["active", "inactive", "suspended"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updated = await updateCustomerStatus(customerId, status);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update customer status" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Customer status updated" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!verifySuperAdmin(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { customerId, customerName, adminEmail, metadata } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Convert email to lowercase if provided
    const lowerEmail = adminEmail ? adminEmail.toLowerCase().trim() : undefined;

    const result = await updateCustomer(customerId, {
      customerName,
      adminEmail: lowerEmail,
      metadata
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update customer" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Customer updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!verifySuperAdmin(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteCustomer(customerId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete customer" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Customer and database deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}

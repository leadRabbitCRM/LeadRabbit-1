import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    customerId: string;
    id: string;
  }>;
};

async function resolveSuperAdmin(req: NextRequest) {
  const token = req.cookies.get("appToken")?.value;

  if (!token) {
    return { status: 401, error: "Unauthorized" } as const;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not defined");
    return { status: 500, error: "Server misconfiguration" } as const;
  }

  let decoded: any;

  try {
    decoded = jwt.verify(token, secret);
  } catch (_error) {
    return { status: 403, error: "Invalid token" } as const;
  }

  // Verify it's a superadmin token
  if (decoded.role !== "superadmin") {
    return { status: 403, error: "Forbidden - SuperAdmin access required" } as const;
  }

  return { status: 200 as const };
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    // Verify superadmin access
    const resolved = await resolveSuperAdmin(req);
    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const { customerId, id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // Get master database
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    const masterDb = client.db("leadrabbit_superadmin");
    const customersCollection = masterDb.collection("customers");

    // Verify customer exists
    const customer = await customersCollection.findOne({
      customerId,
    } as any);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get the customer's database
    const customerDb = client.db(customer.databaseName);
    const usersCollection = customerDb.collection("users");

    let userId: ObjectId;
    
    // If id is "undefined" or invalid, look up by admin email
    if (id === "undefined" || !ObjectId.isValid(id)) {
      const adminUser = await usersCollection.findOne({ 
        email: (customer as any).adminEmail,
        role: "admin"
      });
      
      if (!adminUser) {
        return NextResponse.json(
          { error: "Admin user not found" },
          { status: 404 }
        );
      }
      
      userId = adminUser._id;
    } else {
      // Verify id is valid ObjectId
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { error: "Invalid user id" },
          { status: 400 }
        );
      }
      userId = new ObjectId(id);
    }

    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "User is not an admin" },
        { status: 400 }
      );
    }

    // Reset Password Action
    if (action === "resetPassword") {
      const tempPassword = "LeadRabbit@123";
      const hashedPassword = bcrypt.hashSync(tempPassword, 10);
      const now = new Date();

      await usersCollection.updateOne(
        { _id: userId },
        {
          $set: {
            password: hashedPassword,
            passwordResetRequired: true,
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({
        message: "Password reset successfully",
        tempPassword,
        resetRequired: true,
      });
    }

    // Reset MFA Action
    if (action === "resetMfa") {
      const now = new Date();

      await usersCollection.updateOne(
        { _id: userId },
        {
          $unset: {
            totpSecret: "",
            totpEnabled: "",
            mfaSecret: "",
            mfaEnabled: "",
            isFreshAccount: "",
          },
          $set: {
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({
        message: "MFA has been reset successfully",
        mfaEnabled: false,
      });
    }

    return NextResponse.json(
      { error: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to process admin action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}

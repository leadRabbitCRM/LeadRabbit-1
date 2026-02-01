import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCustomerDbByEmail } from "@/lib/multitenancy";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Convert email to lowercase for case-insensitive handling
    const lowerEmail = email.toLowerCase().trim();

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)" },
        { status: 400 }
      );
    }

    // Get customer database by email
    const result = await getCustomerDbByEmail(lowerEmail);
    
    if (!result) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const { db } = result;
    const usersCollection = db.collection("users");
    
    // Check if user exists
    const user = await usersCollection.findOne({ email: lowerEmail });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const now = new Date();

    // Update password and clear the passwordResetRequired and isFreshAccount flags
    await usersCollection.updateOne(
      { email: lowerEmail },
      {
        $set: {
          password: hashedPassword,
          passwordChanged: true,  // Mark password as changed
          updatedAt: now,
        },
        $unset: {
          passwordResetRequired: "",
          isFreshAccount: "",
        },
      }
    );

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { message: "Failed to change password" },
      { status: 500 }
    );
  }
}

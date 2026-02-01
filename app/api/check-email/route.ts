import { NextRequest, NextResponse } from "next/server";
import { isEmailTaken } from "@/lib/multitenancy";

export const dynamic = 'force-dynamic';

/**
 * Check if an email is already taken across all customers
 * This helps admins avoid creating users with duplicate emails
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Convert email to lowercase for case-insensitive checking
    const lowerEmail = email.toLowerCase().trim();

    const taken = await isEmailTaken(lowerEmail);

    return NextResponse.json(
      { 
        taken,
        available: !taken
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    );
  }
}

// Multi-tenant authentication for admin/user login
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { getCustomerDbByEmail } from "@/lib/multitenancy";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, totpToken, setupTotp } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 },
      );
    }

    // Get customer database by email (multi-tenant lookup)
    const result = await getCustomerDbByEmail(email);
    
    if (!result) {
      return NextResponse.json(
        { message: "UserID not found !!" },
        { status: 404 },
      );
    }

    const { db, customer } = result;
    const usersCollection = db.collection("users");
    let user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: "UserID not found !!" },
        { status: 404 },
      );
    }

    const isValid = bcrypt.compareSync(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid credentials !!" },
        { status: 401 },
      );
    }

    // Check if TOTP is enabled
    if (!user.totpEnabled && user.totpSecret) {
      // First time login - need to setup TOTP
      if (setupTotp && totpToken) {
        // Verify the token they entered
        const verified = speakeasy.totp.verify({
          secret: user.totpSecret,
          encoding: 'base32',
          token: totpToken,
          window: 2
        });

        if (!verified) {
          return NextResponse.json(
            { message: "Invalid verification code" },
            { status: 401 }
          );
        }

        // Enable TOTP
        await usersCollection.updateOne(
          { email },
          { $set: { totpEnabled: true, isOnline: true, lastLogin: new Date() } }
        );

        // Create JWT token
        const token = jwt.sign(
          { 
            email, 
            role: user.role,
            customerId: customer.customerId,
            dbName: customer.databaseName
          },
          process.env.JWT_SECRET!,
          { expiresIn: "8h" }
        );

        const res = NextResponse.json(
          { success: true, message: "TOTP setup successful", role: user.role },
          { status: 200 },
        );

        res.cookies.set("appToken", token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 28800,
          path: "/",
        });

        return res;
      } else {
        // Return that TOTP setup is required
        return NextResponse.json(
          { 
            requiresTotpSetup: true,
            totpSecret: user.totpSecret,
            email: user.email,
            role: user.role
          },
          { status: 200 }
        );
      }
    } else if (user.totpEnabled) {
      // TOTP already enabled - verify token
      if (!totpToken) {
        return NextResponse.json(
          { requiresTotp: true, role: user.role },
          { status: 200 }
        );
      }

      const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { message: "Invalid verification code" },
          { status: 401 }
        );
      }
    }

    // Include customer ID in JWT token for multi-tenancy
    const token = jwt.sign(
      { 
        email, 
        role: user.role,
        customerId: customer.customerId,
        dbName: customer.databaseName
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" }
    );

    const res = NextResponse.json(
      { success: true, message: "Login successful", role: user.role },
      { status: 200 },
    );

    res.cookies.set("appToken", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 28800,
      path: "/",
    });

    await usersCollection.findOneAndUpdate(
      { email },
      { $set: { isOnline: true, lastLogin: new Date() } },
      { returnDocument: "after" }
    );

    return res;
  } catch (err) {
    console.error("Error during authentication:", err);

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}

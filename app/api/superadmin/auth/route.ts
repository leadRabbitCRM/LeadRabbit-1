import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { getSuperAdminDb } from "@/lib/multitenancy";

export const dynamic = 'force-dynamic';

// Super admin credentials stored in database
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, totpToken, setupTotp } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Convert email to lowercase for case-insensitive handling
    const lowerEmail = email.toLowerCase().trim();

    // Get super admin database
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return NextResponse.json(
        { error: "Super admin database unavailable" },
        { status: 503 }
      );
    }

    // Check super admin credentials
    const superAdminsCollection = superAdminDb.collection("super_admins");
    const superAdmin = await superAdminsCollection.findOne({ email: lowerEmail });

    if (!superAdmin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, superAdmin.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if TOTP is enabled
    if (!superAdmin.totpEnabled) {
      // First time login - need to setup TOTP
      if (setupTotp && totpToken) {
        // Verify the token they entered
        const verified = speakeasy.totp.verify({
          secret: superAdmin.totpSecret,
          encoding: 'base32',
          token: totpToken,
          window: 2
        });

        if (!verified) {
          return NextResponse.json(
            { error: "Invalid verification code" },
            { status: 401 }
          );
        }

        // Enable TOTP
        await superAdminsCollection.updateOne(
          { email: lowerEmail },
          { $set: { totpEnabled: true, lastLogin: new Date() } }
        );

        // Create JWT token
        const token = jwt.sign(
          { email: lowerEmail, role: "superadmin" },
          process.env.JWT_SECRET!,
          { expiresIn: "8h" }
        );

        const res = NextResponse.json(
          { 
            success: true, 
            message: "TOTP setup successful",
            role: "superadmin"
          },
          { status: 200 }
        );

        res.cookies.set("appToken", token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 28800, // 8 hours
          path: "/",
        });

        return res;
      } else {
        // Return that TOTP setup is required
        return NextResponse.json(
          { 
            requiresTotpSetup: true,
            totpSecret: superAdmin.totpSecret,
            email: superAdmin.email
          },
          { status: 200 }
        );
      }
    } else {
      // TOTP already enabled - verify token
      if (!totpToken) {
        return NextResponse.json(
          { requiresTotp: true },
          { status: 200 }
        );
      }

      const verified = speakeasy.totp.verify({
        secret: superAdmin.totpSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 401 }
        );
      }

      // Create JWT token for super admin
      const token = jwt.sign(
        { email: lowerEmail, role: "superadmin" },
        process.env.JWT_SECRET!,
        { expiresIn: "8h" }
      );

      const res = NextResponse.json(
        { 
          success: true, 
          message: "Super admin login successful",
          role: "superadmin"
        },
        { status: 200 }
      );

      res.cookies.set("appToken", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 28800, // 8 hours
        path: "/",
      });

      // Update last login
      await superAdminsCollection.updateOne(
        { email: lowerEmail },
        { $set: { lastLogin: new Date() } }
      );

      return res;
    }
  } catch (error) {
    console.error("Super admin authentication error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

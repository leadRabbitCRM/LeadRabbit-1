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

    // Convert email to lowercase for case-insensitive comparison
    const lowerEmail = email.toLowerCase().trim();

    // Get customer database by email (multi-tenant lookup)
    const result = await getCustomerDbByEmail(lowerEmail);
    
    if (!result) {
      return NextResponse.json(
        { message: "UserID not found !!" },
        { status: 404 },
      );
    }

    const { db, customer } = result;
    const usersCollection = db.collection("users");
    let user = await usersCollection.findOne({ email: lowerEmail });

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

    // Check if user logged in with default password (first login for new user)
    const DEFAULT_PASSWORD = "LeadRabbit@123";
    const isDefaultPassword = bcrypt.compareSync(DEFAULT_PASSWORD, user.password);
    
    if (isDefaultPassword && !user.passwordChanged) {
      // Mark that password reset is required for first login with default password
      return NextResponse.json(
        { 
          requiresPasswordReset: true,
          email: user.email,
          role: user.role,
          message: "Welcome! You are logging in with the default password. Please change it now to secure your account.",
          isFirstLoginWithDefault: true
        },
        { status: 200 }
      );
    }

    // Check if password reset is required (admin reset password)
    if (user.passwordResetRequired) {
      return NextResponse.json(
        { 
          requiresPasswordReset: true,
          email: user.email,
          role: user.role,
          message: "Your password has been reset by an administrator. Please set a new password."
        },
        { status: 200 }
      );
    }

    // After password change from default, force MFA setup for new users
    if (user.passwordChanged && !user.totpEnabled && !user.totpSecret) {
      // New user who just changed password - force MFA setup
      const secret = speakeasy.generateSecret({
        name: `LeadRabbit (${user.email})`,
        issuer: 'LeadRabbit',
      });

      // Save the secret temporarily (not enabled yet)
      await usersCollection.updateOne(
        { email: lowerEmail },
        { $set: { totpSecret: secret.base32 } }
      );

      return NextResponse.json(
        {
          requiresTotpSetup: true,
          totpSecret: secret.base32,
          email: user.email,
          role: user.role,
          message: "Please set up two-factor authentication for your account security."
        },
        { status: 200 }
      );
    }

    // Check if MFA needs to be setup (admin reset MFA) - but NOT for fresh accounts
    if (!user.totpEnabled && !user.totpSecret && !user.isFreshAccount) {
      // Admin manually reset MFA - require setup
      const secret = speakeasy.generateSecret({
        name: `LeadRabbit (${user.email})`,
        issuer: 'LeadRabbit',
      });

      // Save the secret temporarily (not enabled yet)
      await usersCollection.updateOne(
        { email: lowerEmail },
        { $set: { totpSecret: secret.base32, isFreshAccount: false } }
      );

      return NextResponse.json(
        {
          requiresTotpSetup: true,
          totpSecret: secret.base32,
          email: user.email,
          role: user.role,
          message: "Your MFA has been reset by an administrator. Please setup MFA again."
        },
        { status: 200 }
      );
    }

    // If fresh account with no TOTP setup, allow login (MFA is optional)
    if (user.isFreshAccount && !user.totpEnabled && !user.totpSecret) {
      // Mark as no longer fresh after first successful login
      await usersCollection.updateOne(
        { email: lowerEmail },
        { $set: { isFreshAccount: false, isOnline: true, lastLogin: new Date() } }
      );

      // Create JWT token and allow login
      const token = jwt.sign(
        { 
          email: lowerEmail, 
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

      return res;
    }

    // Check if TOTP setup is in progress (user has secret but not enabled)
    if (!user.totpEnabled && user.totpSecret) {
      if (setupTotp && totpToken) {
        // User is verifying their setup
        // Trim the token to remove any whitespace
        const trimmedToken = (totpToken || '').trim();
        
        if (!trimmedToken) {
          return NextResponse.json(
            { message: "Verification code is required" },
            { status: 400 }
          );
        }

        console.log("TOTP Setup Verification Debug:");
        console.log("Secret stored:", user.totpSecret?.substring(0, 10) + "...");
        console.log("Secret length:", user.totpSecret?.length);
        console.log("Token received:", trimmedToken);
        console.log("Token length:", trimmedToken.length);
        console.log("Email:", lowerEmail);

        // Try multiple verification approaches
        let verified = speakeasy.totp.verify({
          secret: user.totpSecret,
          encoding: 'base32',
          token: trimmedToken,
          window: 6
        });

        // If first verification fails, try alternative methods
        if (!verified) {
          console.log("First verification failed, trying alternative encoding...");
          // Try with different window sizes
          verified = speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: 'base32',
            token: trimmedToken,
            window: 10  // Even more tolerance
          });
        }

        console.log("Verification result:", verified);

        if (!verified) {
          return NextResponse.json(
            { message: "Invalid verification code" },
            { status: 401 }
          );
        }

        // Enable TOTP
        await usersCollection.updateOne(
          { email: lowerEmail },
          { $set: { totpEnabled: true, isOnline: true, lastLogin: new Date() } }
        );

        // Create JWT token
        const token = jwt.sign(
          { 
            email: lowerEmail, 
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
    }

    // TOTP is enabled - need to verify
    if (user.totpEnabled && user.totpSecret) {
      // Need to verify TOTP token
      if (totpToken) {
        // Trim the token to remove any whitespace
        const trimmedToken = (totpToken || '').trim();
        
        if (!trimmedToken) {
          return NextResponse.json(
            { message: "Verification code is required" },
            { status: 400 }
          );
        }

        console.log("TOTP Verification Debug:");
        console.log("Secret stored:", user.totpSecret?.substring(0, 10) + "...");
        console.log("Secret length:", user.totpSecret?.length);
        console.log("Token received:", trimmedToken);
        console.log("Token length:", trimmedToken.length);
        console.log("Email:", lowerEmail);

        // Try multiple verification approaches
        let verified = speakeasy.totp.verify({
          secret: user.totpSecret,
          encoding: 'base32',
          token: trimmedToken,
          window: 6
        });

        // If first verification fails, try alternative methods
        if (!verified) {
          console.log("First verification failed, trying alternative encoding...");
          // Try with different window sizes
          verified = speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: 'base32',
            token: trimmedToken,
            window: 10  // Even more tolerance
          });
        }

        console.log("Verification result:", verified);

        if (!verified) {
          return NextResponse.json(
            { message: "Invalid verification code" },
            { status: 401 }
          );
        }

        // Update last login
        await usersCollection.updateOne(
          { email: lowerEmail },
          { $set: { isOnline: true, lastLogin: new Date() } }
        );

        // Create JWT token
        const token = jwt.sign(
          { 
            email: lowerEmail, 
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

        return res;
      } else {
        // Return that TOTP verification is required
        return NextResponse.json(
          { 
            requiresTotp: true,
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
        email: lowerEmail, 
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
      { email: lowerEmail },
      { $set: { isOnline: true, lastLogin: new Date() }, $unset: { passwordResetRequired: "" } },
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

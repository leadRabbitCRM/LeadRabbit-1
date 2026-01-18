import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import clientPromise from "@/lib/mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const parseBooleanFlag = (value: unknown) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1";
  }

  return false;
};

export async function GET(req: NextRequest) {
  const token = req.cookies.get("appToken")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not defined");

      return NextResponse.json(
        { message: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const decoded = jwt.verify(token, secret) as {
      email?: string;
      role?: string;
      dbName?: string;
    };

    const email = decoded.email;
    const role = decoded.role ?? null;
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    let profile: {
      name?: string | null;
      avatar?: string | null;
      isOnline?: boolean;
      isVerified?: boolean;
    } | null = null;

    if (email) {
      try {
        const client = await clientPromise;
        if (!client) {
          return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
        }
        const db = client!.db(dbName);
        const userDoc = await db
          .collection("users")
          .findOne(
            { email },
            { projection: { name: 1, avatar: 1, isOnline: 1, isVerified: 1 } },
          );

        if (userDoc) {
          profile = {
            name: userDoc.name ?? null,
            avatar: userDoc.avatar ?? null,
            isOnline: parseBooleanFlag(userDoc.isOnline),
            isVerified: parseBooleanFlag(userDoc.isVerified),
          };
        }
      } catch (dbError) {
        console.error("Failed to look up user profile", dbError);
      }
    }

    const fallbackName = email ? email.split("@")[0] : "User";

    return NextResponse.json({
      email: email ?? null,
      role,
      name: profile?.name ?? fallbackName,
      avatar: profile?.avatar ?? null,
      isOnline: profile ? parseBooleanFlag(profile.isOnline) : false,
      isVerified: profile ? parseBooleanFlag(profile.isVerified) : false,
    });
  } catch (err) {
    return NextResponse.json({ message: "Invalid token" }, { status: 403 });
  }
}

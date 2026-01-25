import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

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

type TokenPayload = {
  email?: string;
  role?: string;
};

type FilePayload = {
  name: string;
  type: string;
  data: string;
};

const REQUIRED_FIELDS = [
  "fullName",
  "dateOfBirth",
  "gender",
  "mobileNumber",
  "currentAddress",
  "permanentAddress",
  "highestQualification",
  "aadhaarNumber",
  "panNumber",
] as const;

type UpdatePayload = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  currentAddress: string;
  permanentAddress: string;
  highestQualification: string;
  aadhaarNumber: string;
  aadhaarFile?: FilePayload | null;
  panNumber: string;
  panFile?: FilePayload | null;
  profilePhoto?: string | null;
};

async function resolveAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get("appToken")?.value;

  if (!token) {
    return { status: 401, error: "Unauthorized" } as const;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not defined");

    return {
      status: 500,
      error: "Server misconfiguration",
    } as const;
  }

  let decoded: TokenPayload;

  try {
    decoded = jwt.verify(token, secret) as TokenPayload;
  } catch (_error) {
    return { status: 403, error: "Invalid token" } as const;
  }

  const email = decoded?.email;
  const dbName = (decoded as any)?.dbName;

  if (!email) {
    return { status: 400, error: "Invalid token payload" } as const;
  }

  if (!dbName) {
    return { status: 400, error: "Customer database not found in token" } as const;
  }

  const client = await clientPromise;
  if (!client) {
    return { status: 503, error: "Database unavailable" } as const;
  }
  const db = client!.db(dbName);
  const usersCollection = db.collection("users");

  const userDoc = await usersCollection.findOne({ email });

  if (!userDoc) {
    return { status: 404, error: "User not found" } as const;
  }

  return {
    status: 200 as const,
    db,
    usersCollection,
    userDoc,
    email,
  };
}

function validateUpdatePayload(
  body: Record<string, unknown>,
): { valid: true; data: UpdatePayload } | { valid: false; error: string } {
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = body[field];

    return typeof value !== "string" || !value.trim();
  });

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(", ")}`,
    };
  }

  const gender = String(body.gender).toLowerCase();
  const allowedGender = new Set(["male", "female", "other"]);

  if (!allowedGender.has(gender)) {
    return { valid: false, error: "Invalid gender value" };
  }

  const qualification = String(body.highestQualification).toLowerCase();
  const qualifications = new Set(["10th", "puc", "degree", "post graduation"]);

  if (!qualifications.has(qualification)) {
    return { valid: false, error: "Invalid qualification value" };
  }

  const basePayload: UpdatePayload = {
    fullName: String(body.fullName).trim(),
    dateOfBirth: String(body.dateOfBirth).trim(),
    gender,
    mobileNumber: String(body.mobileNumber).trim(),
    currentAddress: String(body.currentAddress).trim(),
    permanentAddress: String(body.permanentAddress).trim(),
    highestQualification: qualification,
    aadhaarNumber: String(body.aadhaarNumber).trim(),
    panNumber: String(body.panNumber).trim(),
    aadhaarFile: null,
    panFile: null,
    profilePhoto: null,
  };

  const aadhaarFile = body.aadhaarFile as FilePayload | undefined;
  const panFile = body.panFile as FilePayload | undefined;
  const profilePhoto = body.profilePhoto as string | undefined;

  if (aadhaarFile) {
    if (!aadhaarFile.name || !aadhaarFile.type || !aadhaarFile.data) {
      return { valid: false, error: "Invalid Aadhaar file payload" };
    }

    basePayload.aadhaarFile = {
      name: String(aadhaarFile.name),
      type: String(aadhaarFile.type),
      data: String(aadhaarFile.data),
    };
  }

  if (panFile) {
    if (!panFile.name || !panFile.type || !panFile.data) {
      return { valid: false, error: "Invalid PAN file payload" };
    }

    basePayload.panFile = {
      name: String(panFile.name),
      type: String(panFile.type),
      data: String(panFile.data),
    };
  }

  if (profilePhoto) {
    basePayload.profilePhoto = profilePhoto;
  }

  return { valid: true, data: basePayload };
}

export async function GET(req: NextRequest) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const resolved = await resolveAuthenticatedUser(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db, userDoc, email } = resolved;
    const employeesCollection = db.collection("employees");

    const employeeDoc = await employeesCollection.findOne({
      userId: userDoc._id,
    });

    const profile = employeeDoc
      ? {
          fullName: employeeDoc.fullName ?? "",
          dateOfBirth: employeeDoc.dateOfBirth ?? "",
          gender: employeeDoc.gender ?? "",
          mobileNumber: employeeDoc.mobileNumber ?? "",
          currentAddress: employeeDoc.currentAddress ?? "",
          permanentAddress: employeeDoc.permanentAddress ?? "",
          highestQualification: employeeDoc.highestQualification ?? "",
          aadhaarNumber: employeeDoc.aadhaarNumber ?? "",
          aadhaarFile: employeeDoc.aadhaarFile ?? null,
          panNumber: employeeDoc.panNumber ?? "",
          panFile: employeeDoc.panFile ?? null,
          isVerified: parseBooleanFlag(employeeDoc.isVerified),
          createdAt: employeeDoc.createdAt ?? null,
          updatedAt: employeeDoc.updatedAt ?? null,
        }
      : null;

    return NextResponse.json({
      user: {
        id: (userDoc._id as ObjectId).toString(),
        email,
        name: userDoc.name ?? "",
        avatar: userDoc.avatar ?? null,
        isVerified: parseBooleanFlag(userDoc.isVerified),
      },
      profile,
    });
  } catch (error) {
    console.error("Failed to load user profile", error);

    return NextResponse.json(
      { error: "Failed to load user profile" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const resolved = await resolveAuthenticatedUser(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db, userDoc, usersCollection, email } = resolved;
    const body = await req.json();

    const validation = validateUpdatePayload(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.data;

    const employeesCollection = db.collection("employees");
    const existingEmployee = await employeesCollection.findOne({
      userId: userDoc._id,
    });

    const now = new Date();
    const isVerified = parseBooleanFlag(existingEmployee?.isVerified);
    const existingMobile = (existingEmployee?.mobileNumber ?? "").trim();
    const nextMobileNumber = payload.mobileNumber.trim();

    if (
      existingEmployee &&
      existingMobile &&
      existingMobile !== nextMobileNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Mobile number updates must be requested through an administrator.",
        },
        { status: 403 },
      );
    }

    const employeeUpdate = {
      userId: userDoc._id,
      email,
      fullName: payload.fullName,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      mobileNumber: existingMobile || nextMobileNumber,
      currentAddress: payload.currentAddress,
      permanentAddress: payload.permanentAddress,
      highestQualification: payload.highestQualification,
      aadhaarNumber: payload.aadhaarNumber,
      aadhaarFile: payload.aadhaarFile ?? existingEmployee?.aadhaarFile ?? null,
      panNumber: payload.panNumber,
      panFile: payload.panFile ?? existingEmployee?.panFile ?? null,
      isVerified,
      updatedAt: now,
    };

    await employeesCollection.updateOne(
      { userId: userDoc._id },
      {
        $set: employeeUpdate,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await usersCollection.updateOne(
      { _id: userDoc._id },
      {
        $set: {
          name: payload.fullName,
          avatar: payload.profilePhoto ?? userDoc.avatar ?? null,
          mobileNumber: existingMobile || nextMobileNumber,
          currentAddress: payload.currentAddress,
          permanentAddress: payload.permanentAddress,
          highestQualification: payload.highestQualification,
          aadhaarNumber: payload.aadhaarNumber,
          panNumber: payload.panNumber,
          isVerified,
          profileCompleted: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
    );

    return NextResponse.json({
      message: "Profile updated successfully",
      isVerified,
    });
  } catch (error) {
    console.error("Failed to update profile", error);

    const message =
      error instanceof Error ? error.message : "Failed to update profile";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

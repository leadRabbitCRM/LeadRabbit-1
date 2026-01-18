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

const GENDER_VALUES = new Set(["male", "female", "other"]);

const QUALIFICATION_VALUES = new Set([
  "10th",
  "puc",
  "degree",
  "post graduation",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminUpdateResult =
  | {
      valid: true;
      userUpdates: Record<string, unknown>;
      employeeUpdates: Record<string, unknown>;
    }
  | { valid: false; error: string };

function normalizeString(value: unknown) {
  if (typeof value !== "string") return "";

  return value.trim();
}

function validateAdminUpdatePayload(
  body: Record<string, unknown>,
): AdminUpdateResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid payload" };
  }

  const userUpdates: Record<string, unknown> = {};
  const employeeUpdates: Record<string, unknown> = {};

  if ("fullName" in body) {
    const fullName = normalizeString(body.fullName);

    if (!fullName) {
      return { valid: false, error: "Full name is required." };
    }

    userUpdates.name = fullName;
    employeeUpdates.fullName = fullName;
  }

  if ("email" in body) {
    const email = normalizeString(body.email).toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return { valid: false, error: "A valid email address is required." };
    }

    userUpdates.email = email;
    employeeUpdates.email = email;
  }

  if ("mobileNumber" in body) {
    const mobile = normalizeString(body.mobileNumber);

    if (!mobile) {
      return { valid: false, error: "Mobile number is required." };
    }

    userUpdates.mobileNumber = mobile;
    employeeUpdates.mobileNumber = mobile;
  }

  if ("dateOfBirth" in body) {
    const dateOfBirth = normalizeString(body.dateOfBirth);

    employeeUpdates.dateOfBirth = dateOfBirth;
  }

  if ("gender" in body) {
    const gender = normalizeString(body.gender).toLowerCase();

    if (gender && !GENDER_VALUES.has(gender)) {
      return { valid: false, error: "Invalid gender selection." };
    }

    employeeUpdates.gender = gender;
  }

  if ("currentAddress" in body) {
    const currentAddress = normalizeString(body.currentAddress);

    userUpdates.currentAddress = currentAddress;
    employeeUpdates.currentAddress = currentAddress;
  }

  if ("permanentAddress" in body) {
    const permanentAddress = normalizeString(body.permanentAddress);

    userUpdates.permanentAddress = permanentAddress;
    employeeUpdates.permanentAddress = permanentAddress;
  }

  if ("highestQualification" in body) {
    const qualification = normalizeString(
      body.highestQualification,
    ).toLowerCase();

    if (qualification && !QUALIFICATION_VALUES.has(qualification)) {
      return { valid: false, error: "Invalid qualification selection." };
    }

    userUpdates.highestQualification = qualification;
    employeeUpdates.highestQualification = qualification;
  }

  if ("aadhaarNumber" in body) {
    const aadhaarNumber = normalizeString(body.aadhaarNumber);

    userUpdates.aadhaarNumber = aadhaarNumber;
    employeeUpdates.aadhaarNumber = aadhaarNumber;
  }

  if ("panNumber" in body) {
    const panNumber = normalizeString(body.panNumber);

    userUpdates.panNumber = panNumber;
    employeeUpdates.panNumber = panNumber;
  }

  if (
    Object.keys(userUpdates).length === 0 &&
    Object.keys(employeeUpdates).length === 0
  ) {
    return { valid: false, error: "No valid fields provided for update." };
  }

  return { valid: true, userUpdates, employeeUpdates };
}

type TokenPayload = {
  email?: string;
  role?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function resolveAdmin(req: NextRequest) {
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

  let decoded: any;

  try {
    decoded = jwt.verify(token, secret);
  } catch (_error) {
    return { status: 403, error: "Invalid token" } as const;
  }

  if (decoded.role !== "admin") {
    return { status: 403, error: "Forbidden" } as const;
  }

  const email = decoded.email;
  const dbName = decoded.dbName;

  if (!email || !dbName) {
    return { status: 400, error: "Invalid token payload" } as const;
  }

  const client = await clientPromise;
  if (!client) {
    return { status: 503, error: "Database unavailable" } as const;
  }
  const db = client!.db(dbName);
  const usersCollection = db.collection("users");

  const adminUser = await usersCollection.findOne({ email });

  if (!adminUser) {
    return { status: 403, error: "Admin not found" } as const;
  }

  return { status: 200 as const, db, usersCollection };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const resolved = await resolveAdmin(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db } = resolved;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee id" },
        { status: 400 },
      );
    }

    const userId = new ObjectId(id);
    const usersCollection = db.collection("users");
    const employeesCollection = db.collection("employees");

    const [userDoc, employeeDoc] = await Promise.all([
      usersCollection.findOne({ _id: userId }),
      employeesCollection.findOne({ userId }),
    ]);

    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id,
        name: userDoc.name ?? "",
        email: userDoc.email ?? "",
        role: userDoc.role ?? "",
        avatar: userDoc.avatar ?? null,
        isOnline: parseBooleanFlag(userDoc.isOnline),
        isVerified: parseBooleanFlag(userDoc.isVerified),
      },
      profile: employeeDoc
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
            verifiedAt: employeeDoc.verifiedAt ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to load employee profile", error);

    return NextResponse.json(
      { error: "Failed to load employee profile" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const resolved = await resolveAdmin(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db, usersCollection } = resolved;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const userId = new ObjectId(id);
    const employeesCollection = db.collection("employees");

    if (action === "verify") {
      const employeeDoc = await employeesCollection.findOne({ userId });

      if (!employeeDoc) {
        return NextResponse.json(
          { error: "Employee profile not found" },
          { status: 404 },
        );
      }

      if (employeeDoc.isVerified) {
        return NextResponse.json(
          { message: "Profile already verified" },
          { status: 200 },
        );
      }

      const now = new Date();

      await Promise.all([
        employeesCollection.updateOne(
          { userId },
          {
            $set: {
              isVerified: true,
              verifiedAt: now,
              updatedAt: now,
            },
          },
        ),
        usersCollection.updateOne(
          { _id: userId },
          {
            $set: {
              isVerified: true,
              updatedAt: now,
            },
          },
        ),
      ]);

      return NextResponse.json({
        message: "Employee verified successfully",
        isVerified: true,
        verifiedAt: now.toISOString(),
      });
    }

    if (action === "unverify") {
      const employeeDoc = await employeesCollection.findOne({ userId });

      if (!employeeDoc) {
        return NextResponse.json(
          { error: "Employee profile not found" },
          { status: 404 },
        );
      }

      if (!employeeDoc.isVerified) {
        return NextResponse.json(
          { message: "Profile is not verified" },
          { status: 200 },
        );
      }

      const now = new Date();

      await Promise.all([
        employeesCollection.updateOne(
          { userId },
          {
            $set: {
              isVerified: false,
              updatedAt: now,
            },
            $unset: {
              verifiedAt: "",
            },
          },
        ),
        usersCollection.updateOne(
          { _id: userId },
          {
            $set: {
              isVerified: false,
              updatedAt: now,
            },
          },
        ),
      ]);

      return NextResponse.json({
        message: "Employee verification removed successfully",
        isVerified: false,
        verifiedAt: null,
      });
    }

    if (action === "update") {
      const validation = validateAdminUpdatePayload(body?.payload ?? {});

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const { userUpdates, employeeUpdates } = validation;

      const [userDoc, employeeDoc] = await Promise.all([
        usersCollection.findOne({ _id: userId }),
        employeesCollection.findOne({ userId }),
      ]);

      if (!userDoc) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (!employeeDoc) {
        return NextResponse.json(
          { error: "Employee profile not found" },
          { status: 404 },
        );
      }

      const incomingEmail = (userUpdates.email as string | undefined) ?? null;

      if (incomingEmail && incomingEmail !== userDoc.email) {
        const existingUser = await usersCollection.findOne({
          email: incomingEmail,
          _id: { $ne: userId },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "Another user already uses this email address." },
            { status: 409 },
          );
        }
      }

      const now = new Date();

      const userUpdatePayload: Record<string, unknown> = {
        updatedAt: now,
        ...userUpdates,
      };

      const employeeUpdatePayload: Record<string, unknown> = {
        userId,
        email:
          (employeeUpdates.email as string | undefined) ??
          employeeDoc.email ??
          userDoc.email,
        updatedAt: now,
      };

      const employeeForwardFields = [
        "fullName",
        "dateOfBirth",
        "gender",
        "mobileNumber",
        "currentAddress",
        "permanentAddress",
        "highestQualification",
        "aadhaarNumber",
        "panNumber",
      ];

      employeeForwardFields.forEach((field) => {
        if (field in employeeUpdates) {
          employeeUpdatePayload[field] = employeeUpdates[field];
        }
      });

      await Promise.all([
        usersCollection.updateOne({ _id: userId }, { $set: userUpdatePayload }),
        employeesCollection.updateOne(
          { userId },
          {
            $set: employeeUpdatePayload,
            $setOnInsert: {
              createdAt: employeeDoc.createdAt ?? now,
            },
          },
          { upsert: true },
        ),
      ]);

      const [updatedUserDoc, updatedEmployeeDoc] = await Promise.all([
        usersCollection.findOne({ _id: userId }),
        employeesCollection.findOne({ userId }),
      ]);

      return NextResponse.json({
        message: "Employee updated successfully",
        user: {
          id,
          name: updatedUserDoc?.name ?? "",
          email: updatedUserDoc?.email ?? "",
          role: updatedUserDoc?.role ?? "",
          avatar: updatedUserDoc?.avatar ?? null,
          isOnline: parseBooleanFlag(updatedUserDoc?.isOnline),
          isVerified: parseBooleanFlag(updatedUserDoc?.isVerified),
        },
        profile: updatedEmployeeDoc
          ? {
              fullName: updatedEmployeeDoc.fullName ?? "",
              dateOfBirth: updatedEmployeeDoc.dateOfBirth ?? "",
              gender: updatedEmployeeDoc.gender ?? "",
              mobileNumber: updatedEmployeeDoc.mobileNumber ?? "",
              currentAddress: updatedEmployeeDoc.currentAddress ?? "",
              permanentAddress: updatedEmployeeDoc.permanentAddress ?? "",
              highestQualification:
                updatedEmployeeDoc.highestQualification ?? "",
              aadhaarNumber: updatedEmployeeDoc.aadhaarNumber ?? "",
              aadhaarFile: updatedEmployeeDoc.aadhaarFile ?? null,
              panNumber: updatedEmployeeDoc.panNumber ?? "",
              panFile: updatedEmployeeDoc.panFile ?? null,
              isVerified: parseBooleanFlag(updatedEmployeeDoc.isVerified),
              createdAt: updatedEmployeeDoc.createdAt ?? null,
              updatedAt: updatedEmployeeDoc.updatedAt ?? null,
              verifiedAt: updatedEmployeeDoc.verifiedAt ?? null,
            }
          : null,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to verify employee", error);

    return NextResponse.json(
      { error: "Failed to verify employee" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const resolved = await resolveAdmin(req);

    if (resolved.status !== 200) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { db, usersCollection } = resolved;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee id" },
        { status: 400 },
      );
    }

    const userId = new ObjectId(id);
    const employeesCollection = db.collection("employees");

    const [userResult, employeeResult] = await Promise.all([
      usersCollection.deleteOne({ _id: userId }),
      employeesCollection.deleteOne({ userId }),
    ]);

    if (!userResult.deletedCount && !employeeResult.deletedCount) {
      return NextResponse.json(
        { error: "Employee profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Failed to delete employee", error);

    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 },
    );
  }
}

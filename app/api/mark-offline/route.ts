import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * POST — Marks the user offline in the database WITHOUT clearing the appToken cookie.
 * Used by beforeunload beacon so that page refreshes don't destroy the session.
 * The actual cookie is only cleared by the explicit /api/logout endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("appToken")?.value;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    let email: string | undefined;
    let dbName: string | undefined;

    try {
      const decoded = jwt.verify(token, secret) as {
        email?: string;
        dbName?: string;
      };
      email = decoded.email;
      dbName = decoded.dbName;
    } catch {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    if (!email) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const databaseName = dbName || process.env.DB_NAME;
    const db = client.db(databaseName);

    await db.collection("users").updateOne(
      { email },
      {
        $set: { isOnline: false, status: "inactive" },
        $unset: { lastHeartbeat: "" },
      },
    );

    // NOTE: No cookie clearing here — that's the whole point.
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

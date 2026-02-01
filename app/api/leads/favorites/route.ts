import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { resolveAuthenticatedUser } from "@/app/api/_utils/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthenticatedUser(req);

    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = auth.db;
    const usersCollection = db.collection("users");

    // Get user's favorites
    const user = await usersCollection.findOne(
      { email: auth.email },
      { projection: { favorites: 1 } }
    );

    const favorites = user?.favorites || [];
    console.log("✅ Favorites fetched from DB for", auth.email, ":", favorites);

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthenticatedUser(req);

    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { leadId, action } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    if (!["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    const db = auth.db;
    const usersCollection = db.collection("users");

    if (action === "add") {
      // Add to favorites (avoid duplicates with $addToSet)
      await usersCollection.updateOne(
        { email: auth.email },
        { $addToSet: { favorites: leadId } }
      );
      console.log("✅ Lead", leadId, "added to favorites for", auth.email);
    } else {
      // Remove from favorites
      await usersCollection.updateOne(
        { email: auth.email },
        { $pull: { favorites: leadId } }
      );
      console.log("✅ Lead", leadId, "removed from favorites for", auth.email);
    }

    // Get updated favorites
    const user = await usersCollection.findOne(
      { email: auth.email },
      { projection: { favorites: 1 } }
    );

    const favorites = user?.favorites || [];

    return NextResponse.json({
      message: `Lead ${action === "add" ? "added to" : "removed from"} favorites`,
      favorites,
    });
  } catch (error) {
    console.error("Error updating favorites:", error);
    return NextResponse.json(
      { error: "Failed to update favorites" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { resolveAuthenticatedUser } from "../../../_utils/auth";
import { ObjectId } from "mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const auth = await resolveAuthenticatedUser(req);
    if ("status" in auth && auth.status !== 200) {
      return NextResponse.json(auth, { status: auth.status });
    }

    // Only admins can assign leads
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const { leadId } = await params;
    const { assignedTo } = await req.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }

    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);
    const leadsCollection = db.collection("leads");

    let updateData: any = {};
    let successMessage = "";

    if (assignedTo === null || assignedTo === "") {
      // Remove assignment
      updateData = {
        $unset: {
          assignedTo: "",
          assignedToName: "",
          assignedAt: "",
          assignedBy: "",
        },
      };
      successMessage = "Lead assignment removed successfully";
    } else {
      // Assign to user
      const usersCollection = db.collection("users");

      // Verify the user exists
      const assignedUser = await usersCollection.findOne({ email: assignedTo });
      if (!assignedUser) {
        return NextResponse.json(
          { error: "Assigned user not found" },
          { status: 404 },
        );
      }

      updateData = {
        $set: {
          assignedTo,
          assignedToName: assignedUser.name,
          assignedAt: new Date(),
          assignedBy: auth.email,
        },
      };
      successMessage = `Lead assigned to ${assignedUser.name}`;
    }

    // Update the lead
    const result = await leadsCollection.updateOne(
      { _id: new ObjectId(leadId) },
      updateData,
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get the updated lead
    const updatedLead = await leadsCollection.findOne({
      _id: new ObjectId(leadId),
    });

    return NextResponse.json({
      success: true,
      message: successMessage,
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Error assigning lead:", error);
    return NextResponse.json(
      { error: "Failed to assign lead" },
      { status: 500 },
    );
  }
}

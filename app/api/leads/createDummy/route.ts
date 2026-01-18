import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Generate random dummy data
const firstNames = ["John", "Jane", "Mike", "Sarah", "David", "Emily", "James", "Lisa", "Robert", "Maria"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"];
const sources = ["Facebook", "Instagram", "Website", "Referral", "Walk-in"];
const statuses = ["New"];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhoneNumber(): string {
  return `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@${getRandomElement(domains)}`;
}

export async function POST(req: NextRequest) {
  try {
    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const db = client.db(dbName);
    const leadsCollection = db.collection("leads");

    // Generate dummy lead data
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const fullName = `${firstName} ${lastName}`;
    
    const dummyLead = {
      name: fullName,
      email: generateEmail(firstName, lastName),
      phone: generatePhoneNumber(),
      source: getRandomElement(sources),
      status: getRandomElement(statuses),
      city: getRandomElement(cities),
      assignedTo: null,
      assignedToName: null,
      assignedAt: null,
      message: `Hi, I'm interested in your services. Please contact me.`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDummy: true, // Flag to identify dummy leads
    };

    // Insert the dummy lead
    const result = await leadsCollection.insertOne(dummyLead);

    return NextResponse.json(
      {
        message: "Dummy lead created successfully",
        lead: {
          ...dummyLead,
          _id: result.insertedId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating dummy lead:", error);
    return NextResponse.json(
      { error: "Failed to create dummy lead" },
      { status: 500 }
    );
  }
}

// Optionally, allow GET to create multiple dummy leads at once
export async function GET(req: NextRequest) {
  try {
    // Get customer database from JWT token
    const token = req.cookies.get("appToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const dbName = decoded.dbName;

    if (!dbName) {
      return NextResponse.json({ error: "Customer database not found" }, { status: 400 });
    }

    // Get count from query params, default to 1, max 50
    const { searchParams } = new URL(req.url);
    const count = Math.min(parseInt(searchParams.get('count') || '1'), 50);

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const db = client.db(dbName);
    const leadsCollection = db.collection("leads");

    // Generate multiple dummy leads
    const dummyLeads = [];
    for (let i = 0; i < count; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const fullName = `${firstName} ${lastName}`;
      
      dummyLeads.push({
        name: fullName,
        email: generateEmail(firstName, lastName),
        phone: generatePhoneNumber(),
        source: getRandomElement(sources),
        status: getRandomElement(statuses),
        city: getRandomElement(cities),
        assignedTo: null,
        assignedToName: null,
        assignedAt: null,
        message: `Hi, I'm interested in your services. Please contact me.`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDummy: true,
      });
    }

    // Insert all dummy leads
    const result = await leadsCollection.insertMany(dummyLeads);

    return NextResponse.json(
      {
        message: `${count} dummy lead(s) created successfully`,
        count: result.insertedCount,
        leadIds: Object.values(result.insertedIds).map(id => id.toString()),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating dummy leads:", error);
    return NextResponse.json(
      { error: "Failed to create dummy leads" },
      { status: 500 }
    );
  }
}

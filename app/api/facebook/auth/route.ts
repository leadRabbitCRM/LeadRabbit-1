// app/api/facebook/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Prevent execution during build time
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MongoDB not configured" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      // Let's try a direct approach with the exact URL
      const redirectUri =
        `${process.env.REDIRECT_URL}`;
      const facebookAuthUrl =
        `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${process.env.FACEBOOK_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata,business_management` +
        `&response_type=code`;

      return NextResponse.redirect(facebookAuthUrl);
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.FACEBOOK_CLIENT_ID!,
          client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
          redirect_uri: `${process.env.REDIRECT_URL}`,
          code: code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Facebook OAuth error:", tokenData.error);
      return NextResponse.json(
        { error: tokenData.error.message },
        { status: 400 },
      );
    }

    const userAccessToken = tokenData.access_token;

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`,
    );
    const pagesData = await pagesResponse.json();

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

    // Store tokens and page information
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    const db = client!.db(dbName);

    const metaPagesCollection = db.collection("meta_pages");

    for (const page of pagesData.data) {
      await metaPagesCollection.updateOne(
        { pageId: page.id },
        {
          $set: {
            pageId: page.id,
            name: page.name,
            accessToken: page.access_token, // Store page access token
            lastUpdated: new Date(),
            isActive: false, // Will be activated when user enables integration
            leadForms: [],
          },
        },
        { upsert: true },
      );
    }

    // Get the existing appToken cookie to preserve it
    const appToken = req.cookies.get("appToken")?.value;

    const redirectResponse = NextResponse.redirect(
      `${process.env.URL}/admin/connectors?facebook_auth=success`,
    );

    // Preserve the appToken cookie if it exists
    if (appToken) {
      redirectResponse.cookies.set("appToken", appToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 3600,
        path: "/",
      });
    }

    return redirectResponse;
  } catch (error) {
    console.error("Facebook auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}

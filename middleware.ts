import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Super admin access hash from .env.local
const SUPER_ADMIN_HASH = "$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("appToken")?.value;

  // Allow super admin login page only with correct hash
  if (pathname.startsWith("/superadmin/")) {
    // Check if it's the super admin login page with hash
    const hashMatch = pathname.match(/^\/superadmin\/([^\/]+)/);
    if (hashMatch) {
      const providedHash = hashMatch[1];
      
      // If accessing login page with correct hash, allow
      if (providedHash === SUPER_ADMIN_HASH) {
        return NextResponse.next();
      }
      
      // If has valid super admin token, allow
      if (token) {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secret);
          if (payload.role === "superadmin") {
            return NextResponse.next();
          }
        } catch (err) {
          // Invalid token, redirect to login
        }
      }
      
      // Invalid hash or no valid token, redirect to main login
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow public access to regular login page
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // If no token and trying to access protected routes
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // If token exists, decode it
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role;

    // If accessing root '/', redirect based on role
    if (pathname === "/") {
      const redirectUrl = request.nextUrl.clone();
      
      if (role === "superadmin") {
        redirectUrl.pathname = `/superadmin/${SUPER_ADMIN_HASH}`;
      } else {
        redirectUrl.pathname = `/${role}`;
      }

      return NextResponse.redirect(redirectUrl);
    }

    // Protect role-specific routes
    if (pathname.startsWith("/admin") && role !== "admin") {
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/403";
      return NextResponse.redirect(forbiddenUrl);
    }

    if (pathname.startsWith("/user") && role !== "user") {
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/403";
      return NextResponse.redirect(forbiddenUrl);
    }

    return NextResponse.next();
  } catch (err) {
    // Token invalid → redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/", "/admin/:path*", "/user/:path*", "/login", "/superadmin/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/jwt";
import { SESSION } from "@/lib/constants";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie or Authorization header
  const token =
    request.cookies.get(SESSION.COOKIE_NAME)?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  // Protected routes that require authentication
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    if (!token) {
      // Redirect to login page if not authenticated
      return NextResponse.redirect(new URL("/", request.url));
    }

    const payload = await verifyTokenEdge(token);

    if (!payload) {
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Check role-based access
    if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
      // Non-admin trying to access admin routes
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (pathname.startsWith("/dashboard") && payload.role !== "CHILD") {
      // Admin trying to access child dashboard
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Apply middleware to these routes
 */
export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};

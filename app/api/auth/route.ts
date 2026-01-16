import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { authenticateUser, getUserFromToken } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";
import { AUDIT_ACTIONS, SESSION } from "@/lib/constants";

/**
 * POST /api/auth/login
 * Authenticate user with identifier (name or ID) and PIN
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { identifier, pin } = body;

    if (!identifier || !pin) {
      return NextResponse.json(
        { error: "Identifier and PIN are required" },
        { status: 400 }
      );
    }

    const result = await authenticateUser(identifier, pin);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Log successful login
    await AuditLog.create({
      userId: result.user._id,
      action: AUDIT_ACTIONS.LOGIN,
      details: {
        identifier,
        timestamp: new Date(),
      },
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    });

    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        token: result.token,
      },
      { status: 200 }
    );

    // Set cookie for session
    response.cookies.set({
      name: SESSION.COOKIE_NAME,
      value: result.token!,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION.TOKEN_EXPIRY_HOURS * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/session
 * Get current user session
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token =
      req.cookies.get(SESSION.COOKIE_NAME)?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/logout
 * Logout user
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const token =
      req.cookies.get(SESSION.COOKIE_NAME)?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (token) {
      const user = await getUserFromToken(token);

      if (user) {
        // Log logout
        await AuditLog.create({
          userId: user._id,
          action: AUDIT_ACTIONS.LOGOUT,
          details: {
            timestamp: new Date(),
          },
        });
      }
    }

    const response = NextResponse.json({ success: true }, { status: 200 });

    // Clear cookie
    response.cookies.delete(SESSION.COOKIE_NAME);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

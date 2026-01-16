import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { getUserFromToken } from "@/lib/auth";
import { SESSION, PAGINATION } from "@/lib/constants";

/**
 * Helper to get current user from request
 */
async function getCurrentUser(req: NextRequest) {
  const token =
    req.cookies.get(SESSION.COOKIE_NAME)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  return await getUserFromToken(token);
}

/**
 * GET /api/audit?userId=X&action=LOGIN&page=1&limit=20
 * Get audit logs (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || PAGINATION.DEFAULT_LIMIT.toString()),
      PAGINATION.MAX_LIMIT
    );

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (userId) {
      query.userId = userId;
    }

    if (action) {
      query.action = action;
    }

    // Execute query
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("userId", "name role")
        .populate("targetUserId", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to get audit logs" },
      { status: 500 }
    );
  }
}

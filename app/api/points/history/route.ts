import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getTransactionHistory } from "@/lib/ledger";
import { getUserFromToken } from "@/lib/auth";
import { SESSION } from "@/lib/constants";

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
 * GET /api/points/history?userId=X&type=EARN&page=1&limit=20
 * Get transaction history for a user
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!userId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    // Users can only see their own history unless they're admin
    if (currentUser.role !== "ADMIN" && currentUser._id.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const filter: any = {};
    if (type) {
      filter.type = type;
    }

    const result = await getTransactionHistory(userId, filter, { page, limit });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get transaction history error:", error);
    return NextResponse.json(
      { error: "Failed to get transaction history" },
      { status: 500 }
    );
  }
}

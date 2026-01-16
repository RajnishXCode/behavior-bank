import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import {
  awardPoints,
  deductPoints,
  getPointsBalance,
  getTransactionHistory,
} from "@/lib/ledger";
import { getUserFromToken } from "@/lib/auth";
import { SESSION } from "@/lib/constants";
import AuditLog from "@/models/AuditLog";
import { AUDIT_ACTIONS } from "@/lib/constants";

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
 * POST /api/points/award
 * Award points to a user (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, amount, description, type } = body;

    if (!userId || !amount || !description) {
      return NextResponse.json(
        { error: "userId, amount, and description are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    const result = await awardPoints(
      userId,
      amount,
      description,
      currentUser._id,
      type || "EARN"
    );

    // Log the action
    await AuditLog.create({
      userId: currentUser._id,
      action: AUDIT_ACTIONS.AWARD_POINTS,
      targetUserId: userId,
      details: {
        amount,
        description,
        type,
        newBalance: result.newBalance,
      },
    });

    return NextResponse.json(
      {
        success: true,
        newBalance: result.newBalance,
        transaction: result.transaction,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Award points error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to award points" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/points/deduct
 * Deduct points from a user (Admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, amount, description } = body;

    if (!userId || !amount || !description) {
      return NextResponse.json(
        { error: "userId, amount, and description are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    const result = await deductPoints(
      userId,
      amount,
      description,
      currentUser._id
    );

    // Log the action
    await AuditLog.create({
      userId: currentUser._id,
      action: AUDIT_ACTIONS.DEDUCT_POINTS,
      targetUserId: userId,
      details: {
        amount,
        description,
        newBalance: result.newBalance,
      },
    });

    return NextResponse.json(
      {
        success: true,
        newBalance: result.newBalance,
        transaction: result.transaction,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Deduct points error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deduct points" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/points/balance?userId=X
 * Get points balance for a user
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

    if (!userId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    // Users can only see their own balance unless they're admin
    if (currentUser.role !== "ADMIN" && currentUser._id.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const balance = await getPointsBalance(userId);

    return NextResponse.json(
      {
        userId,
        balance,
        lastUpdated: new Date(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get balance error:", error);
    return NextResponse.json(
      { error: "Failed to get balance" },
      { status: 500 }
    );
  }
}

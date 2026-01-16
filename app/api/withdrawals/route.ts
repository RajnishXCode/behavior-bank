import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Withdrawal from "@/models/Withdrawal";
import Account from "@/models/Account";
import { getUserFromToken } from "@/lib/auth";
import { SESSION, AUDIT_ACTIONS } from "@/lib/constants";
import AuditLog from "@/models/AuditLog";
import { canWithdraw } from "@/lib/interest";

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
 * POST /api/withdrawals
 * Request a withdrawal
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, amount, reason } = body;

    if (!accountId || !amount || !reason) {
      return NextResponse.json(
        { error: "accountId, amount, and reason are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await Account.findById(accountId).populate("userId");

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Only account owner can request withdrawal
    if ((account.userId as any)._id.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if withdrawal is allowed
    const withdrawalCheck = await canWithdraw(accountId, amount);

    if (!withdrawalCheck.allowed) {
      return NextResponse.json(
        { error: withdrawalCheck.reason, availableAmount: withdrawalCheck.availableAmount },
        { status: 400 }
      );
    }

    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      accountId,
      requestedBy: currentUser._id,
      amount,
      reason,
      status: "PENDING",
    });

    // Log the action
    await AuditLog.create({
      userId: currentUser._id,
      action: AUDIT_ACTIONS.REQUEST_WITHDRAWAL,
      details: {
        withdrawalId: withdrawal._id,
        amount,
        reason,
        accountId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        withdrawal,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Request withdrawal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to request withdrawal" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/withdrawals?status=PENDING&userId=X
 * Get withdrawals with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.requestedBy = userId;
    }

    // Non-admins can only see their own withdrawals
    if (currentUser.role !== "ADMIN") {
      query.requestedBy = currentUser._id;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate("requestedBy", "name role")
      .populate("processedBy", "name role")
      .populate({
        path: "accountId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ withdrawals }, { status: 200 });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    return NextResponse.json(
      { error: "Failed to get withdrawals" },
      { status: 500 }
    );
  }
}

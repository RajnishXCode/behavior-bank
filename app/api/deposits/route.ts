import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Deposit from "@/models/Deposit";
import Account from "@/models/Account";
import { getUserFromToken } from "@/lib/auth";
import { SESSION, AUDIT_ACTIONS } from "@/lib/constants";
import AuditLog from "@/models/AuditLog";

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
 * POST /api/deposits
 * Create a new deposit (Admin only)
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
    const { accountId, amount, vestingMonths } = body;

    if (!accountId || !amount) {
      return NextResponse.json(
        { error: "accountId and amount are required" },
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
    const account = await Account.findById(accountId);

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Create deposit
    const deposit = await Deposit.create({
      accountId,
      amount,
      depositedBy: currentUser._id,
      vestingMonths: vestingMonths || 12,
      status: "ACTIVE",
    });

    // Update account depositAmount
    account.depositAmount += amount;
    await account.save();

    // Log the action
    await AuditLog.create({
      userId: currentUser._id,
      action: AUDIT_ACTIONS.CREATE_DEPOSIT,
      targetUserId: account.userId,
      details: {
        depositId: deposit._id,
        amount,
        vestingMonths: deposit.vestingMonths,
        accountId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        deposit,
        newAccountBalance: account.depositAmount,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create deposit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create deposit" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deposits?accountId=X
 * Get deposits for an account
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId parameter is required" },
        { status: 400 }
      );
    }

    // Verify account exists and check access
    const account = await Account.findById(accountId).populate("userId");

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Users can only see their own account unless they're admin
    if (
      currentUser.role !== "ADMIN" &&
      (account.userId as any)._id.toString() !== currentUser._id.toString()
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const deposits = await Deposit.find({ accountId })
      .populate("depositedBy", "name role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ deposits }, { status: 200 });
  } catch (error) {
    console.error("Get deposits error:", error);
    return NextResponse.json(
      { error: "Failed to get deposits" },
      { status: 500 }
    );
  }
}

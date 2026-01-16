import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Account from "@/models/Account";
import { getUserFromToken } from "@/lib/auth";
import { SESSION } from "@/lib/constants";
import { getPointsBalance } from "@/lib/ledger";
import { getAvailableBalance } from "@/lib/interest";

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
 * POST /api/accounts
 * Create a new account
 */
export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();

  const { userId, depositAmount } = body;

  if (!userId || depositAmount == null) {
    return NextResponse.json(
      { error: "userId and depositAmount required" },
      { status: 400 }
    );
  }

  const account = await Account.create({
    userId,
    depositAmount,
  });

  return NextResponse.json(account, { status: 201 });
}

/**
 * GET /api/accounts?userId=X
 * Get account details with balances
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

    // If userId provided, get specific account
    if (userId) {
      // Users can only see their own account unless they're admin
      if (currentUser.role !== "ADMIN" && currentUser._id.toString() !== userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const account = await Account.findOne({ userId }).populate("userId", "name role");

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      // Get points balance and available withdrawal balance
      const pointsBalance = await getPointsBalance(userId);
      const availableBalance = await getAvailableBalance(account._id);

      return NextResponse.json(
        {
          account,
          pointsBalance,
          availableBalance,
        },
        { status: 200 }
      );
    }

    // If no userId, list all accounts (admin only)
    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const accounts = await Account.find().populate("userId", "name role").lean();

    // Get balances for all accounts
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account: any) => {
        const pointsBalance = await getPointsBalance(account.userId._id);
        const availableBalance = await getAvailableBalance(account._id);

        return {
          ...account,
          pointsBalance,
          availableBalance,
        };
      })
    );

    return NextResponse.json({ accounts: accountsWithBalances }, { status: 200 });
  } catch (error) {
    console.error("Get accounts error:", error);
    return NextResponse.json(
      { error: "Failed to get accounts" },
      { status: 500 }
    );
  }
}

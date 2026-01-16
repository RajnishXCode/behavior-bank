import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Account from "@/models/Account";
import PointsLedger from "@/models/PointsLedger";
import { SESSION } from "@/lib/constants";
import { headers } from "next/headers";

export async function GET(req: Request) {
  try {
    const headersList = await headers();
    const token = 
      headersList.get("authorization")?.replace("Bearer ", "") ||
      (await req.headers.get("cookie"))?.match(new RegExp(`${SESSION.COOKIE_NAME}=([^;]+)`))?.[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid Session" }, { status: 401 });
    }

    // 1. Get Account Details
    const account = await Account.findOne({ userId: user._id });

    // 2. Get Total Points
    const pointsLogs = await PointsLedger.find({ userId: user._id }).sort({ createdAt: -1 });
    const totalPoints = pointsLogs.reduce((acc, log) => {
        // Simple aggregation if not stored. 
        // Ideally PointsLedger entries have 'amount' which are +1, -1, +50
        // But wait, the Ledger also tracks 'balanceAfter'. 
        // So the latest log has the current balance.
        return acc; 
    }, 0);
    
    const currentPoints = pointsLogs.length > 0 ? pointsLogs[0].balanceAfter : 0;

    // 3. Calculate Interest / Value
    // Logic from todo.md: 
    // "Interest starts at 20% and increases by 10% for every additional 6-month period"
    // "Calculated on the sum of the deposited amount and earned points" -> Wait, earned points are 1 rupee each?
    // "If total points are negative at withdrawal time, the child receives only 50% of the original deposit"

    let estimatedValue = 0;
    let interestRate = 0;
    let isPenalty = false;

    if (account) {
        const deposit = account.depositAmount || 0;
        const now = new Date();
        const vestingStart = new Date(account.vestingStart);
        
        // Months elapsed
        const diffTime = Math.abs(now.getTime() - vestingStart.getTime());
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)); 

        // Base Interest
        // Rule: "minimum vesting period of 6 months... interest starts at 20%"
        // "increases by 10% for every additional 6-month period"
        
        if (diffMonths >= 6) {
           interestRate = 20; 
           const additionalPeriods = Math.floor((diffMonths - 6) / 6);
           interestRate += (additionalPeriods * 10);
        }

        // Logic: "calculated on the sum of the deposited amount and earned points"
        // So Base = Deposit + Points
        const baseAmount = deposit + currentPoints;

        if (currentPoints < 0) {
            // Penalty: 50% of original deposit, 0 interest
            estimatedValue = deposit * 0.5;
            isPenalty = true;
            interestRate = 0;
        } else {
             estimatedValue = baseAmount * (1 + (interestRate / 100));
        }
    }

    return NextResponse.json({
        user: {
            name: user.name,
            id: user._id
        },
        account: {
           balance: account?.depositAmount || 0,
           vestingStart: account?.vestingStart,
           status: account?.status
        },
        stats: {
            currentPoints,
            estimatedValue: Math.round(estimatedValue),
            interestRate,
            isPenalty
        },
        recentActivity: pointsLogs.slice(0, 10)
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

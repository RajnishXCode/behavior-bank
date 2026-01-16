import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Withdrawal from "@/models/Withdrawal";
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
 * PUT /api/withdrawals/[id]/reject
 * Reject a withdrawal (Admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { notes } = body;

    if (!notes) {
      return NextResponse.json(
        { error: "Notes are required when rejecting a withdrawal" },
        { status: 400 }
      );
    }

    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { error: "Withdrawal has already been processed" },
        { status: 400 }
      );
    }

    // Update withdrawal
    withdrawal.status = "REJECTED";
    withdrawal.processedBy = currentUser._id;
    withdrawal.processedAt = new Date();
    withdrawal.notes = notes;
    await withdrawal.save();

    // Log the action
    await AuditLog.create({
      userId: currentUser._id,
      action: AUDIT_ACTIONS.REJECT_WITHDRAWAL,
      targetUserId: withdrawal.requestedBy,
      details: {
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount,
        notes,
      },
    });

    return NextResponse.json(
      {
        success: true,
        withdrawal,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reject withdrawal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject withdrawal" },
      { status: 500 }
    );
  }
}

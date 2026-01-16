import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import { hashPin } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";
import { AUDIT_ACTIONS } from "@/lib/constants";

/**
 * POST /api/users
 * Create a new user
 */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, role, pin, depositAmount } = body;

    // Validation
    if (!name || !role || !pin) {
      return NextResponse.json(
        { error: "Name, role, and PIN are required" },
        { status: 400 }
      );
    }

    if (!["ADMIN", "CHILD"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN or CHILD" },
        { status: 400 }
      );
    }

    if (pin.length < 4) {
      return NextResponse.json(
        { error: "PIN must be at least 4 characters" },
        { status: 400 }
      );
    }

    // Hash the PIN
    const pinHash = await hashPin(pin);

    // Create user
    const user = await User.create({
      name,
      role,
      pinHash,
    });

    // Auto-create account for CHILD users
    let account = null;
    if (role === "CHILD") {
      account = await Account.create({
        userId: user._id,
        depositAmount: depositAmount || 0,
      });
    }

    // Log user creation
    await AuditLog.create({
      userId: user._id,
      action: AUDIT_ACTIONS.CREATE_USER,
      details: {
        name,
        role,
        accountCreated: !!account,
      },
    });

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
        accountCreated: !!account,
        accountId: account?._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("User creation error:", error);

    // Handle duplicate user name
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "User with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users
 * List all users
 */
export async function GET() {
  try {
    await connectDB();

    const users = await User.find()
      .select("-pinHash")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("User list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

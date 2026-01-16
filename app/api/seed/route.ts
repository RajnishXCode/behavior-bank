import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import { hashPin } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();

    const pinHash = await hashPin("1234");
    const results: any = {};

    // 1. Create Admin
    const existingAdmin = await User.findOne({ name: "admin" });
    if (!existingAdmin) {
      await User.create({
        name: "admin",
        role: "ADMIN",
        pinHash,
        isActive: true,
      });
      results.admin = "Created (admin / 1234)";
    } else {
      results.admin = "Already exists";
    }

    // 2. Create Child
    let childUser = await User.findOne({ name: "child" });
    if (!childUser) {
      childUser = await User.create({
        name: "child",
        role: "CHILD",
        pinHash,
        isActive: true,
      });
      results.child = "Created (child / 1234)";
    } else {
      results.child = "Already exists";
    }

    // 3. Create Account for Child
    if (childUser) {
        let account = await Account.findOne({ userId: childUser._id });
        if (!account) {
            await Account.create({
                userId: childUser._id,
                depositAmount: 10000, // ₹10,000 initial
                vestingStart: new Date(),
                status: "ACTIVE"
            });
            results.account = "Created with ₹10,000 deposit";
        } else {
            results.account = "Already exists";
        }
    }

    return NextResponse.json({ 
      success: true, 
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

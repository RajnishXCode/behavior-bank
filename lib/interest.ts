import Deposit from "@/models/Deposit";
import Account from "@/models/Account";
import { Types } from "mongoose";
import { VESTING } from "./constants";

/**
 * Calculate the vested amount for a deposit based on time elapsed
 */
export function calculateVestedAmount(
  depositAmount: number,
  vestingStart: Date,
  vestingMonths: number,
  currentDate: Date = new Date()
): {
  vestedAmount: number;
  vestedPercentage: number;
  monthsElapsed: number;
  isFullyVested: boolean;
} {
  const monthsElapsed =
    (currentDate.getTime() - vestingStart.getTime()) /
    (1000 * 60 * 60 * 24 * 30.44); // Average days in a month

  if (monthsElapsed >= vestingMonths) {
    return {
      vestedAmount: depositAmount,
      vestedPercentage: 100,
      monthsElapsed: vestingMonths,
      isFullyVested: true,
    };
  }

  if (monthsElapsed <= 0) {
    return {
      vestedAmount: 0,
      vestedPercentage: 0,
      monthsElapsed: 0,
      isFullyVested: false,
    };
  }

  const vestedPercentage = (monthsElapsed / vestingMonths) * 100;
  const vestedAmount = (depositAmount * monthsElapsed) / vestingMonths;

  return {
    vestedAmount,
    vestedPercentage,
    monthsElapsed,
    isFullyVested: false,
  };
}

/**
 * Get the interest rate based on vesting period
 * Longer vesting periods get better rates
 */
export function getInterestRate(vestingMonths: number): number {
  const baseRate = VESTING.ANNUAL_INTEREST_RATE;

  // Bonus rates for longer commitments
  if (vestingMonths >= 48) return baseRate * 1.5; // 7.5%
  if (vestingMonths >= 36) return baseRate * 1.3; // 6.5%
  if (vestingMonths >= 24) return baseRate * 1.2; // 6%
  if (vestingMonths >= 12) return baseRate; // 5%

  return baseRate * 0.8; // 4% for < 12 months
}

/**
 * Calculate interest earned on a deposit
 */
export function calculateInterest(
  amount: number,
  annualRate: number,
  months: number
): number {
  // Simple interest calculation
  const years = months / 12;
  return amount * annualRate * years;
}

/**
 * Check if a withdrawal is allowed for an account
 */
export async function canWithdraw(
  accountId: string | Types.ObjectId,
  requestedAmount: number
): Promise<{
  allowed: boolean;
  availableAmount: number;
  reason?: string;
}> {
  const account = await Account.findById(accountId);

  if (!account) {
    return {
      allowed: false,
      availableAmount: 0,
      reason: "Account not found",
    };
  }

  if (account.status === "LOCKED") {
    return {
      allowed: false,
      availableAmount: 0,
      reason: "Account is locked",
    };
  }

  if (account.status === "WITHDRAWN") {
    return {
      allowed: false,
      availableAmount: 0,
      reason: "Account has already been withdrawn",
    };
  }

  // Calculate total vested amount from all deposits
  const deposits = await Deposit.find({
    accountId,
    status: "ACTIVE",
  });

  let totalVested = 0;

  for (const deposit of deposits) {
    const { vestedAmount } = calculateVestedAmount(
      deposit.amount,
      deposit.createdAt,
      deposit.vestingMonths
    );

    const interest = calculateInterest(
      vestedAmount,
      getInterestRate(deposit.vestingMonths),
      Math.min(
        deposit.vestingMonths,
        (new Date().getTime() - deposit.createdAt.getTime()) /
          (1000 * 60 * 60 * 24 * 30.44)
      )
    );

    totalVested += vestedAmount + interest;
  }

  if (requestedAmount > totalVested) {
    return {
      allowed: false,
      availableAmount: totalVested,
      reason: `Only ${totalVested.toFixed(2)} is available (vested + interest)`,
    };
  }

  return {
    allowed: true,
    availableAmount: totalVested,
  };
}

/**
 * Get total available balance for an account (vested amount + interest)
 */
export async function getAvailableBalance(
  accountId: string | Types.ObjectId
): Promise<number> {
  const result = await canWithdraw(accountId, 0);
  return result.availableAmount;
}

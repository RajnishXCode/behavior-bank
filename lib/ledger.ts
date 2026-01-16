import { Types } from "mongoose";
import PointsLedger, { TransactionType } from "@/models/PointsLedger";
import { PAGINATION } from "./constants";

export interface TransactionFilter {
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Calculate the current points balance for a user
 */
export async function getPointsBalance(
  userId: string | Types.ObjectId
): Promise<number> {
  const transactions = await PointsLedger.find({ userId }).sort({
    createdAt: -1,
  });

  if (transactions.length === 0) {
    return 0;
  }

  // Return the most recent balanceAfter value
  return transactions[0].balanceAfter;
}

/**
 * Award points to a user
 */
export async function awardPoints(
  userId: string | Types.ObjectId,
  amount: number,
  description: string,
  createdBy: string | Types.ObjectId,
  type: TransactionType = "EARN",
  metadata?: Record<string, any>
): Promise<{ success: boolean; newBalance: number; transaction: any }> {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const currentBalance = await getPointsBalance(userId);
  const newBalance = currentBalance + amount;

  const transaction = await PointsLedger.create({
    userId,
    type,
    amount,
    description,
    balanceAfter: newBalance,
    createdBy,
    metadata: metadata || {},
  });

  return {
    success: true,
    newBalance,
    transaction,
  };
}

/**
 * Deduct points from a user
 */
export async function deductPoints(
  userId: string | Types.ObjectId,
  amount: number,
  description: string,
  createdBy: string | Types.ObjectId,
  metadata?: Record<string, any>
): Promise<{ success: boolean; newBalance: number; transaction: any }> {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const currentBalance = await getPointsBalance(userId);

  if (currentBalance < amount) {
    throw new Error("Insufficient points balance");
  }

  const newBalance = currentBalance - amount;

  const transaction = await PointsLedger.create({
    userId,
    type: "SPEND",
    amount: -amount, // Negative value for deductions
    description,
    balanceAfter: newBalance,
    createdBy,
    metadata: metadata || {},
  });

  return {
    success: true,
    newBalance,
    transaction,
  };
}

/**
 * Get transaction history for a user with pagination and filtering
 */
export async function getTransactionHistory(
  userId: string | Types.ObjectId,
  filter: TransactionFilter = {},
  pagination: PaginationOptions = {}
): Promise<{
  transactions: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = pagination.page || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    pagination.limit || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  // Build query
  const query: any = { userId };

  if (filter.type) {
    query.type = filter.type;
  }

  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) {
      query.createdAt.$gte = filter.startDate;
    }
    if (filter.endDate) {
      query.createdAt.$lte = filter.endDate;
    }
  }

  // Execute query
  const [transactions, total] = await Promise.all([
    PointsLedger.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name role")
      .lean(),
    PointsLedger.countDocuments(query),
  ]);

  return {
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Validate a transaction before execution
 */
export function validateTransaction(
  amount: number,
  type: TransactionType
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: "Amount must be positive" };
  }

  if (!["EARN", "SPEND", "ADJUST", "BONUS"].includes(type)) {
    return { valid: false, error: "Invalid transaction type" };
  }

  return { valid: true };
}

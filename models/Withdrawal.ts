import mongoose, { Schema, Model, models, Types } from "mongoose";

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IWithdrawal {
  accountId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  amount: number;
  reason: string;
  status: WithdrawalStatus;
  processedBy?: Types.ObjectId;
  processedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    processedAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
WithdrawalSchema.index({ status: 1, createdAt: -1 });

/**
 * Prevent model overwrite error in Next.js hot reload
 */
const Withdrawal: Model<IWithdrawal> =
  models.Withdrawal ||
  mongoose.model<IWithdrawal>("Withdrawal", WithdrawalSchema);

export default Withdrawal;

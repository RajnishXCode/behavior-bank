import mongoose, { Schema, Model, models, Types } from "mongoose";

export type DepositStatus = "PENDING" | "ACTIVE" | "COMPLETED";

export interface IDeposit {
  accountId: Types.ObjectId;
  amount: number;
  depositedBy: Types.ObjectId;
  vestingMonths: number;
  status: DepositStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DepositSchema = new Schema<IDeposit>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    depositedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    vestingMonths: {
      type: Number,
      required: true,
      min: 0,
      default: 12,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "COMPLETED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Prevent model overwrite error in Next.js hot reload
 */
const Deposit: Model<IDeposit> =
  models.Deposit || mongoose.model<IDeposit>("Deposit", DepositSchema);

export default Deposit;

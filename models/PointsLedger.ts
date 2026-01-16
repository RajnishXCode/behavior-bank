import mongoose, { Schema, Model, models } from "mongoose";
import type { Types } from "mongoose";

export type TransactionType = "EARN" | "SPEND" | "ADJUST" | "BONUS";

export interface IPointsLedger {
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  description: string;
  balanceAfter: number;
  createdBy: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PointsLedgerSchema = new Schema<IPointsLedger>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["EARN", "SPEND", "ADJUST", "BONUS"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
PointsLedgerSchema.index({ userId: 1, createdAt: -1 });

/**
 * Prevent model overwrite error in Next.js hot reload
 */
const PointsLedger: Model<IPointsLedger> =
  models.PointsLedger ||
  mongoose.model<IPointsLedger>("PointsLedger", PointsLedgerSchema);

export default PointsLedger;

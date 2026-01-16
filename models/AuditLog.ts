import mongoose, { Schema, Model, models, Types } from "mongoose";

export interface IAuditLog {
  userId: Types.ObjectId;
  action: string;
  targetUserId?: Types.ObjectId;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    details: {
      type: Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

/**
 * Prevent model overwrite error in Next.js hot reload
 */
const AuditLog: Model<IAuditLog> =
  models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;

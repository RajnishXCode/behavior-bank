import mongoose, { Schema, Model, models } from "mongoose";
import type { UserRole } from "@/types/roles";

export interface IUser {
  name: string;
  role: UserRole;
  pinHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["ADMIN", "CHILD"],
      required: true,
    },

    pinHash: {
      type: String,
      required: true,
      select: false, //never return by default
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Prevent model overwrite error in Next.js hot reload
 */
const User: Model<IUser> =
  models.User || mongoose.model<IUser>("User", UserSchema);

export default User;

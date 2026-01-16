import mongoose, { Schema, Types } from "mongoose";

const AccountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one account per user
    },

    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    vestingStart: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "WITHDRAWN", "LOCKED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Account ||
  mongoose.model("Account", AccountSchema);

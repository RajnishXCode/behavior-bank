import { Types } from "mongoose";

export type AccountStatus = "ACTIVE" | "WITHDRAWN" | "LOCKED";

export interface Account {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  depositAmount: number;
  vestingStart: Date;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

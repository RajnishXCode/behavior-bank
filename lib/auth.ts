import bcrypt from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import User from "@/models/User";
import { Types } from "mongoose";
import { SESSION } from "./constants";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface TokenPayload {
  userId: string;
  role: "ADMIN" | "CHILD";
  iat: number;
  exp: number;
}

/**
 * Hash a PIN for secure storage
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

/**
 * Verify a PIN against a hash
 */
export async function verifyPin(
  pin: string,
  pinHash: string
): Promise<boolean> {
  return bcrypt.compare(pin, pinHash);
}

/**
 * Generate a JWT token for a user session
 */
export function generateToken(
  userId: string | Types.ObjectId,
  role: "ADMIN" | "CHILD"
): string {
  const payload = {
    userId: userId.toString(),
    role,
  };

  return sign(payload, JWT_SECRET, {
    expiresIn: `${SESSION.TOKEN_EXPIRY_HOURS}h`,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Authenticate a user with userId and PIN
 */
export async function authenticateUser(
  identifier: string,
  pin: string
): Promise<{
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}> {
  try {
    // Find user by name or ObjectId
    let user;
    if (Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier).select("+pinHash");
    } else {
      user = await User.findOne({ name: identifier }).select("+pinHash");
    }

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: "Account is inactive",
      };
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, user.pinHash);

    if (!isValidPin) {
      return {
        success: false,
        error: "Invalid PIN",
      };
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove sensitive data
    const { pinHash, ...userObject } = user.toObject();

    return {
      success: true,
      user: userObject,
      token,
    };
  } catch (error) {
    return {
      success: false,
      error: "Authentication failed",
    };
  }
}

/**
 * Get user from token
 */
export async function getUserFromToken(token: string): Promise<any | null> {
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  const user = await User.findById(payload.userId);

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

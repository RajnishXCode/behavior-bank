/**
 * Application-wide constants
 */

// Point values for different behaviors
export const POINT_VALUES = {
  CHORE_SIMPLE: 10,
  CHORE_MEDIUM: 20,
  CHORE_COMPLEX: 50,
  HOMEWORK_COMPLETED: 25,
  GOOD_BEHAVIOR: 15,
  EXCEPTIONAL_BEHAVIOR: 100,
  DAILY_GOAL_MET: 50,
} as const;

// Vesting configuration
export const VESTING = {
  DEFAULT_MONTHS: 12,
  MIN_MONTHS: 1,
  MAX_MONTHS: 60,
  ANNUAL_INTEREST_RATE: 0.05, // 5% per year
} as const;

// Account status constants
export const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  WITHDRAWN: "WITHDRAWN",
  LOCKED: "LOCKED",
} as const;

// Transaction type constants
export const TRANSACTION_TYPES = {
  EARN: "EARN",
  SPEND: "SPEND",
  ADJUST: "ADJUST",
  BONUS: "BONUS",
} as const;

// Withdrawal status constants
export const WITHDRAWAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

// Deposit status constants
export const DEPOSIT_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;

// Audit log action types
export const AUDIT_ACTIONS = {
  // Auth actions
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  
  // User actions
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  DELETE_USER: "DELETE_USER",
  
  // Points actions
  AWARD_POINTS: "AWARD_POINTS",
  DEDUCT_POINTS: "DEDUCT_POINTS",
  
  // Account actions
  CREATE_ACCOUNT: "CREATE_ACCOUNT",
  UPDATE_ACCOUNT: "UPDATE_ACCOUNT",
  
  // Deposit actions
  CREATE_DEPOSIT: "CREATE_DEPOSIT",
  
  // Withdrawal actions
  REQUEST_WITHDRAWAL: "REQUEST_WITHDRAWAL",
  APPROVE_WITHDRAWAL: "APPROVE_WITHDRAWAL",
  REJECT_WITHDRAWAL: "REJECT_WITHDRAWAL",
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Session configuration
export const SESSION = {
  TOKEN_EXPIRY_HOURS: 24,
  COOKIE_NAME: "behavior_bank_token",
} as const;

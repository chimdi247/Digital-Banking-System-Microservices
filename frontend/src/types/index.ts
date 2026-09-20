export type UserRole = "ADMIN" | "CUSTOMER";

export interface AuthResponse {
  token: string | null;
  email: string;
  fullName: string;
  role: UserRole;
}

export type AccountType = "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "CLOSED";

export interface AccountResponse {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  email: string;
  phone: string;
  accountType: AccountType;
  status: AccountStatus;
  balance: number;
  dailyTransactionLimit: number;
  createdAt: string;
}

export interface CreateAccountRequest {
  accountHolderName: string;
  email: string;
  phone: string;
  accountType: AccountType;
  initialDeposit: number;
}

export type TransactionType = "TRANSFER" | "DEPOSIT" | "WITHDRAWAL";
export type TransactionStatus =
  | "PROCESSING"
  | "PENDING_VERIFICATION"
  | "COMPLETED"
  | "FAILED"
  | "FLAGGED";

export interface TransactionResponse {
  id: string;
  senderAccountNumber: string;
  receiverAccountNumber: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  failureReason?: string;
  referenceNumber?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TransferRequest {
  senderAccountNumber: string;
  receiverAccountNumber: string;
  amount: number;
  description?: string;
}

export type PaymentStatus = "CREATED" | "SUCCESS" | "FAILED";

export interface PaymentOrderResponse {
  paymentId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
  status: string;
}

export interface PaymentResponse {
  id: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  accountNumber: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  accountNumber: string;
  amount: number;
  currency?: string;
  description?: string;
}

export interface ApiError {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
}

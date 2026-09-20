import axios from "axios";
import type {
  AccountResponse,
  AuthResponse,
  CreateAccountRequest,
  CreatePaymentRequest,
  PaymentOrderResponse,
  PaymentResponse,
  TransactionResponse,
  TransferRequest,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "nova_bank_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || "Something went wrong";
  }
  return "Something went wrong";
}

// ---------------- Auth ----------------

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/api/v1/accounts/auth/login", { email, password }).then((r) => r.data),

  register: (fullName: string, email: string, password: string) =>
    api
      .post<AuthResponse>("/api/v1/accounts/auth/register", { fullName, email, password })
      .then((r) => r.data),

  me: () => api.get<AuthResponse>("/api/v1/accounts/auth/me").then((r) => r.data),
};

// ---------------- Accounts ----------------

export const accountsApi = {
  listMine: (email: string) =>
    api.get<AccountResponse[]>(`/api/v1/accounts/by-email/${encodeURIComponent(email)}`).then((r) => r.data),

  listAll: () => api.get<AccountResponse[]>("/api/v1/accounts").then((r) => r.data),

  get: (accountNumber: string) =>
    api.get<AccountResponse>(`/api/v1/accounts/${accountNumber}`).then((r) => r.data),

  create: (payload: CreateAccountRequest) =>
    api.post<AccountResponse>("/api/v1/accounts", payload).then((r) => r.data),

  block: (accountNumber: string) =>
    api.put<string>(`/api/v1/accounts/${accountNumber}/block`).then((r) => r.data),
};

// ---------------- Transactions ----------------

export const transactionsApi = {
  transfer: (payload: TransferRequest) =>
    api.post<TransactionResponse>("/api/v1/transactions/transfer", payload).then((r) => r.data),

  get: (transactionId: string) =>
    api.get<TransactionResponse>(`/api/v1/transactions/${transactionId}`).then((r) => r.data),

  history: (accountNumber: string) =>
    api.get<TransactionResponse[]>(`/api/v1/transactions/account/${accountNumber}`).then((r) => r.data),

  verifyOtp: (transactionId: string, otp: string) =>
    api
      .post<TransactionResponse>(`/api/v1/transactions/${transactionId}/verify`, null, {
        params: { otp },
      })
      .then((r) => r.data),
};

// ---------------- Payments ----------------

export const paymentsApi = {
  createOrder: (payload: CreatePaymentRequest) =>
    api.post<PaymentOrderResponse>("/api/v1/payments/create-order", payload).then((r) => r.data),

  get: (paymentId: string) =>
    api.get<PaymentResponse>(`/api/v1/payments/${paymentId}`).then((r) => r.data),

  history: (accountNumber: string) =>
    api.get<PaymentResponse[]>(`/api/v1/payments/account/${accountNumber}`).then((r) => r.data),
};

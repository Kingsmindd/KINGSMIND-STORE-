import { apiRequest, ApiError } from "./api.client";
import type {
  User,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
} from "../types/auth.types";

export async function loginAccount(input: LoginInput): Promise<User> {
  const result = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return result.user;
}

export async function getCurrentAccount(
  signal?: AbortSignal,
): Promise<User | null> {
  try {
    const result = await apiRequest<{ user: User }>("/auth/me", {
      signal,
    });

    return result.user;
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function logoutAccount(): Promise<void> {
  await apiRequest("/auth/logout", {
    method: "POST",
  });
}

export async function registerAccount(
  input: RegisterInput,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function verifyAccountEmail(
  token: string,
): Promise<{ message: string }> {
  return apiRequest("/auth/verify-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
}

export async function resendAccountVerification(
  email: string,
): Promise<{ message: string }> {
  return apiRequest("/auth/resend-verification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
}

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export function changePasswordAccount(input: ChangePasswordInput) {
  return apiRequest<{ message: string }>("/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
}

export function updateAccountName(name: string) {
  return apiRequest<{ user: User }>("/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

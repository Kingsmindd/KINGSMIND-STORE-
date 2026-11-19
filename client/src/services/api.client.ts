import { API_URL } from "../config/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const SESSION_EXPIRED_EVENT = "kingsmind:session-expired";
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const result = await apiRequest<{ csrfToken: string }>("/auth/csrf-token");

    if (typeof result.csrfToken !== "string") {
      throw new Error("The security token could not be loaded.");
    }

    headers.set("X-CSRF-Token", result.csrfToken);
  }

  const response = await fetch(new URL(path, API_URL), {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "The request could not be completed.";

    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const apiOrigin = import.meta.env.PROD
  ? window.location.origin
  : import.meta.env.VITE_API_URL || "http://localhost:3000";

export const API_URL = new URL("/api/", apiOrigin).toString();

export function resolveApiUrl(path: string): URL {
  return new URL(path.replace(/^\/+/, ""), API_URL);
}

export function resolveImageUrl(path: string): string {
  return new URL(path, apiOrigin).toString();
}

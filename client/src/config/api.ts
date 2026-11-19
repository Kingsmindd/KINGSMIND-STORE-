export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function resolveImageUrl(path: string): string {
  return new URL(path, API_URL).toString();
}

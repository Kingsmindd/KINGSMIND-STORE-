import "dotenv/config";

function readFrontendOrigin(): string {
  const value = process.env.FRONTEND_URL?.trim();

  if (!value) {
    throw new Error("FRONTEND_URL is required.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("FRONTEND_URL must be a valid URL.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("FRONTEND_URL must contain only an HTTP or HTTPS origin.");
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  }

  return url.origin;
}

export const frontendOrigin = readFrontendOrigin();

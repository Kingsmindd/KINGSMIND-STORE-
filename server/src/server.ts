import "dotenv/config";
import express from "express";
import type { ErrorRequestHandler } from "express";
import helmet from "helmet";
import { Pool } from "pg";
import { createCheckoutRouter } from "./routes/checkout.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createSessionMiddleware } from "./config/session.js";
import { createOrderRouter } from "./routes/order.routes.js";
import { createProductRouter } from "./routes/products.routes.js";
import { createAdminCustomerRouter } from "./routes/admin-customer.routes.js";
import { productImageDirectory } from "./services/product-image-storage.service.js";
import { frontendOrigin } from "./config/env.js";
import cors from "cors";
import { createOrderDraftRouter } from "./routes/order-draft.routes.js";
import { createSupportChatRouter } from "./routes/support-chat.routes.js";
import { startSupportEmailWorker } from "./services/support-email-worker.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");

app.use(
  helmet({
    strictTransportSecurity: isProduction ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        "upgrade-insecure-requests": isProduction ? [] : null,
      },
    },
  }),
);

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  }),
);

app.use(
  express.json({
    limit: "10kb",
    strict: true,
  }),
);

const pool = new Pool({
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Database connection error:", error.message);
});

app.use(createSessionMiddleware(pool));

app.use(
  "/uploads/products",
  express.static(productImageDirectory, {
    dotfiles: "deny",
    index: false,
    maxAge: "1d",
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

app.use("/auth", createAuthRouter(pool));

app.use("/checkout", createCheckoutRouter(pool));

app.use("/orders/draft", createOrderDraftRouter(pool));
app.use("/orders", createOrderRouter(pool));

app.use("/orders", createOrderRouter(pool));

app.use("/admin/customers", createAdminCustomerRouter(pool));

app.use("/products", createProductRouter(pool));

app.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");

    res.json({
      message: "Your TypeScript backend is connected to PostgreSQL!",
      databaseTime: result.rows[0].time,
    });
  } catch (error) {
    console.error("Database query failed:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.get("/health/database", async (_req, res) => {
  try {
    await pool.query(
      "SELECT id, name, email, password_hash, role, created_at FROM users LIMIT 0",
    );

    res.json({
      database: "connected",
      usersTable: "ready",
    });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({ error: "Database health check failed" });
  }
});

app.use("/support", createSupportChatRouter(pool));

app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found.",
  });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const errorType: unknown =
    typeof error === "object" && error !== null && "type" in error
      ? error.type
      : undefined;

  if (errorType === "entity.parse.failed") {
    res.status(400).json({
      error: "Request body contains invalid JSON.",
    });
    return;
  }

  if (errorType === "entity.too.large") {
    res.status(413).json({
      error: "Request body must not exceed 10 KB.",
    });
    return;
  }

  if (
    errorType === "charset.unsupported" ||
    errorType === "encoding.unsupported"
  ) {
    res.status(415).json({
      error: "Unsupported request encoding.",
    });
    return;
  }

  console.error(
    "Unhandled request error:",
    error instanceof Error ? error.name : "UnknownError",
  );

  res.status(500).json({
    error: "Something went wrong. Please try again.",
  });
};

app.use(errorHandler);

async function start(): Promise<void> {
  await pool.query("SELECT 1");

  if (!process.env.SUPPORT_NOTIFICATION_EMAIL?.trim()) {
    console.warn(
      "SUPPORT_NOTIFICATION_EMAIL is missing. Incoming support messages will not email the store inbox.",
    );
  }

  const port = Number(process.env.PORT ?? 3000);

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    startSupportEmailWorker(pool, frontendOrigin);
  });
}

start().catch(async (error: unknown) => {
  console.error("Could not start server:", error);
  await pool.end();
  process.exitCode = 1;
});

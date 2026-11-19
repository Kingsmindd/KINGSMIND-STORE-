import { Router } from "express";
import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import type { Pool } from "pg";
import { createSupportChatController } from "../controllers/support-chat.controller.js";
import {
  createRequireAuth,
  createRequireAdmin,
} from "../middleware/auth.middleware.js";
import { requireCsrf } from "../middleware/csrf.middleware.js";

const sendMessageLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a minute and try again." },
});

const guestEmailLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many email requests. Please try again later." },
});

export function createSupportChatRouter(pool: Pool): Router {
  const router = Router();
  const requireAuth = createRequireAuth(pool);
  const requireAdmin = createRequireAdmin(pool);
  const {
    getMessages,
    sendMessage,
    getAdminConversations,
    getAdminMessages,
    sendAdminReply,
    markAdminMessagesRead,
    markVisitorMessagesRead,
    confirmGuestEmail,
    requestGuestEmail,
  } = createSupportChatController(pool);

  const checkSignedInSession: RequestHandler = (req, res, next) => {
    if (req.session?.userId) {
      void requireAuth(req, res, next);
      return;
    }
    next();
  };

  router.get("/messages", checkSignedInSession, getMessages);

  router.post(
    "/messages",
    requireCsrf,
    checkSignedInSession,
    sendMessageLimiter,
    sendMessage,
  );

  router.get(
    "/admin/conversations",
    requireAuth,
    requireAdmin,
    getAdminConversations,
  );

  router.get(
    "/admin/conversations/:conversationId/messages",
    requireAuth,
    requireAdmin,
    getAdminMessages,
  );

  router.post(
    "/admin/conversations/:conversationId/messages",
    requireAuth,
    requireAdmin,
    requireCsrf,
    sendAdminReply,
  );

  router.patch(
    "/messages/read",
    checkSignedInSession,
    requireCsrf,
    markVisitorMessagesRead,
  );

  router.patch(
    "/admin/conversations/:conversationId/messages/read",
    requireAuth,
    requireAdmin,
    requireCsrf,
    markAdminMessagesRead,
  );

  router.post(
    "/guest-email",
    requireCsrf,
    guestEmailLimiter,
    requestGuestEmail,
  );

  router.post("/guest-email/confirm", requireCsrf, confirmGuestEmail);
  return router;
}

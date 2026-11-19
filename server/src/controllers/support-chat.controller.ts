import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import {
  confirmGuestSupportEmail,
  createGuestConversation,
  findCustomerConversation,
  findGuestConversation,
  findSupportConversation,
  listSupportConversations,
  openCustomerConversation,
  requestGuestSupportEmail,
} from "../services/support-conversation.service.js";
import {
  listSupportMessages,
  markSupportMessagesRead,
  saveSupportMessage,
} from "../services/support-message.service.js";

const guestCookie = "kingsmind.support";

function readGuestToken(req: Request): string | undefined {
  const cookies = req.get("Cookie") ?? "";
  return /(?:^|;\s*)kingsmind\.support=([a-f0-9]{64})(?:;|$)/.exec(
    cookies,
  )?.[1];
}

function isConversationId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function createSupportChatController(pool: Pool) {
  async function getMessages(req: Request, res: Response, next: NextFunction) {
    res.setHeader("Cache-Control", "no-store");

    try {
      const userId = req.session?.userId;
      const conversation = userId
        ? await findCustomerConversation(pool, userId)
        : await findGuestConversation(pool, readGuestToken(req));

      const messages = conversation
        ? await listSupportMessages(pool, conversation.id)
        : [];

      res.json({ messages });
    } catch (error) {
      next(error);
    }
  }

  async function sendMessage(req: Request, res: Response, next: NextFunction) {
    res.setHeader("Cache-Control", "no-store");

    const value: unknown = req.body?.body;
    const body = typeof value === "string" ? value.trim() : "";

    if (!body || body.length > 2000) {
      res
        .status(400)
        .json({ error: "Enter a message between 1 and 2,000 characters." });
      return;
    }

    try {
      const userId = req.session?.userId;
      let conversation = userId
        ? await openCustomerConversation(pool, userId)
        : await findGuestConversation(pool, readGuestToken(req));

      if (!conversation) {
        const guest = await createGuestConversation(pool);

        res.cookie(guestCookie, guest.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: process.env.NODE_ENV === "production" ? "/api/support" : "/",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        conversation = guest;
      }

      const message = await saveSupportMessage(pool, {
        conversationId: conversation.id,
        senderRole: "customer",
        body,
      });

      if (!message) {
        res
          .status(404)
          .json({ error: "This conversation is no longer available." });
        return;
      }

      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  }

  async function getAdminConversations(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    res.setHeader("Cache-Control", "no-store");

    try {
      res.json({ conversations: await listSupportConversations(pool) });
    } catch (error) {
      next(error);
    }
  }

  async function getAdminMessages(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const { conversationId } = req.params;

    if (!isConversationId(conversationId)) {
      res.status(400).json({ error: "Invalid conversation ID." });
      return;
    }

    try {
      const conversation = await findSupportConversation(pool, conversationId);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }

      res.json({ messages: await listSupportMessages(pool, conversation.id) });
    } catch (error) {
      next(error);
    }
  }

  async function sendAdminReply(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const { conversationId } = req.params;
    const value: unknown = req.body?.body;
    const body = typeof value === "string" ? value.trim() : "";

    if (!isConversationId(conversationId)) {
      res.status(400).json({ error: "Invalid conversation ID." });
      return;
    }

    if (!body || body.length > 2000) {
      res
        .status(400)
        .json({ error: "Enter a message between 1 and 2,000 characters." });
      return;
    }

    try {
      const message = await saveSupportMessage(pool, {
        conversationId,
        senderRole: "admin",
        body,
      });

      if (!message) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }

      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  }

  function createMarkReadHandler(readerRole: "customer" | "admin") {
    return async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "no-store");

      const throughMessageId: unknown = req.body?.throughMessageId;
      if (
        typeof throughMessageId !== "string" ||
        !/^[1-9]\d{0,18}$/.test(throughMessageId) ||
        BigInt(throughMessageId) > 9223372036854775807n
      ) {
        res.status(400).json({ error: "Invalid message ID." });
        return;
      }

      try {
        let conversation;

        if (readerRole === "admin") {
          const { conversationId } = req.params;
          if (!isConversationId(conversationId)) {
            res.status(400).json({ error: "Invalid conversation ID." });
            return;
          }
          conversation = await findSupportConversation(pool, conversationId);
        } else {
          const userId = req.session?.userId;
          conversation = userId
            ? await findCustomerConversation(pool, userId)
            : await findGuestConversation(pool, readGuestToken(req));
        }

        if (!conversation) {
          res.status(404).json({ error: "Conversation not found." });
          return;
        }

        await markSupportMessagesRead(
          pool,
          conversation.id,
          readerRole,
          throughMessageId,
        );
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    };
  }

  function createGuestEmailHandler(action: "request" | "confirm") {
    return async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "no-store");

      if (req.session?.userId) {
        res.status(403).json({
          error:
            "Signed-in accounts use their account email for support replies.",
        });
        return;
      }

      const value: unknown =
        action === "request" ? req.body?.email : req.body?.token;
      const input = typeof value === "string" ? value.trim() : "";

      if (
        action === "request" &&
        (input.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input))
      ) {
        res.status(400).json({ error: "Enter a valid email address." });
        return;
      }

      if (action === "confirm" && !/^[a-f0-9]{64}$/.test(input)) {
        res.status(400).json({ error: "Invalid confirmation link." });
        return;
      }

      try {
        const conversation = await findGuestConversation(
          pool,
          readGuestToken(req),
        );

        if (!conversation) {
          res.status(404).json({
            error:
              "Open the chat in the browser where you first sent a message.",
          });
          return;
        }

        if (action === "request") {
          const sent = await requestGuestSupportEmail(
            pool,
            conversation.id,
            input,
          );

          if (!sent) {
            res.status(409).json({
              error: "This conversation already has a confirmed email.",
            });
            return;
          }

          res.json({ message: "Check your inbox for the confirmation email." });
          return;
        }

        const confirmed = await confirmGuestSupportEmail(
          pool,
          conversation.id,
          input,
        );

        if (!confirmed) {
          res.status(400).json({
            error: "This link is invalid or expired. Request a new one.",
          });
          return;
        }

        res.json({
          message: "Email confirmed. We’ll email you when support replies.",
        });
      } catch (error) {
        next(error);
      }
    };
  }

  return {
    getMessages,
    sendMessage,
    getAdminConversations,
    getAdminMessages,
    sendAdminReply,
    markVisitorMessagesRead: createMarkReadHandler("customer"),
    markAdminMessagesRead: createMarkReadHandler("admin"),
    requestGuestEmail: createGuestEmailHandler("request"),
    confirmGuestEmail: createGuestEmailHandler("confirm"),
  };
}

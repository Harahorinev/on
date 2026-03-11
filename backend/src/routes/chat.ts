import { Router } from "express";
import type { Request } from "express";
import { AppError } from "../errors.js";
import { msg } from "../messages.js";
import { aiClient } from "../aiClient.js";
import {
  addChatMessage,
  assertConversationBelongsToUser,
  createAssistantConversation,
  listConversationMessages,
} from "../chat.js";

export const chatRouter = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * B55/B103: POST /chat/ai
 * Body:
 *  - message: string (обязателен)
 *  - conversationId?: string (если не указано — создаётся новый диалог)
 *  - bookingId?: string
 *  - userEventId?: string
 */
chatRouter.post("/ai", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      next(new AppError(401, msg.auth_unauthorized));
      return;
    }
    const { message, conversationId, bookingId, userEventId } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      next(new AppError(400, msg.chat_messageRequired));
      return;
    }

    let conv =
      typeof conversationId === "string" && conversationId.trim()
        ? assertConversationBelongsToUser(conversationId.trim(), userId)
        : createAssistantConversation(userId);

    const userMsg = addChatMessage(conv.id, "user", userId, message.trim(), {
      bookingId: typeof bookingId === "string" ? bookingId : undefined,
      userEventId: typeof userEventId === "string" ? userEventId : undefined,
    });

    const history = listConversationMessages(conv.id).map((m) => ({
      role: m.sender_role,
      content: m.content,
    })) as { role: "user" | "assistant"; content: string }[];

    const aiReply = await aiClient.generateReply(history, {
      bookingId: typeof bookingId === "string" ? bookingId : undefined,
      userEventId: typeof userEventId === "string" ? userEventId : undefined,
    });

    const assistantMsg = addChatMessage(conv.id, "assistant", null, aiReply, {
      bookingId: typeof bookingId === "string" ? bookingId : undefined,
      userEventId: typeof userEventId === "string" ? userEventId : undefined,
    });

    res.status(200).json({
      conversationId: conv.id,
      messages: [
        {
          id: userMsg.id,
          role: userMsg.sender_role,
          content: userMsg.content,
          createdAt: userMsg.created_at,
        },
        {
          id: assistantMsg.id,
          role: assistantMsg.sender_role,
          content: assistantMsg.content,
          createdAt: assistantMsg.created_at,
        },
      ],
    });
  } catch (e) {
    if ((e as Error).message === "Conversation not found or access denied") {
      next(new AppError(404, msg.chat_conversationNotFound));
      return;
    }
    next(e);
  }
});


import { db, uuid } from "./db.js";

export type ChatType = "assistant" | "direct";

export interface ChatConversationRow {
  id: string;
  owner_user_id: string;
  type: ChatType;
  title: string | null;
  created_at: string;
  last_message_at: string;
}

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_role: "user" | "assistant";
  sender_user_id: string | null;
  content: string;
  booking_id: string | null;
  user_event_id: string | null;
  created_at: string;
}

export function createAssistantConversation(ownerUserId: string, title?: string): ChatConversationRow {
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO chat_conversations (id, owner_user_id, type, title, created_at, last_message_at) VALUES (?, ?, 'assistant', ?, ?, ?)"
  ).run(id, ownerUserId, title ?? null, now, now);
  return getConversationById(id)!;
}

export function getConversationById(id: string): ChatConversationRow | undefined {
  return db
    .prepare("SELECT * FROM chat_conversations WHERE id = ?")
    .get(id) as ChatConversationRow | undefined;
}

export function assertConversationBelongsToUser(conversationId: string, userId: string): ChatConversationRow {
  const row = getConversationById(conversationId);
  if (!row || row.owner_user_id !== userId) {
    throw new Error("Conversation not found or access denied");
  }
  return row;
}

export function addChatMessage(
  conversationId: string,
  senderRole: "user" | "assistant",
  senderUserId: string | null,
  content: string,
  opts?: { bookingId?: string; userEventId?: string }
): ChatMessageRow {
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_messages
      (id, conversation_id, sender_role, sender_user_id, content, booking_id, user_event_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    conversationId,
    senderRole,
    senderUserId,
    content,
    opts?.bookingId ?? null,
    opts?.userEventId ?? null,
    now
  );
  db.prepare("UPDATE chat_conversations SET last_message_at = ? WHERE id = ?").run(now, conversationId);
  return getMessageById(id)!;
}

export function getMessageById(id: string): ChatMessageRow | undefined {
  return db
    .prepare("SELECT * FROM chat_messages WHERE id = ?")
    .get(id) as ChatMessageRow | undefined;
}

export function listConversationMessages(conversationId: string): ChatMessageRow[] {
  return db
    .prepare("SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC")
    .all(conversationId) as ChatMessageRow[];
}


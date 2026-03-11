import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { createUser, signToken } from "../auth.js";
import { db } from "../db.js";

describe("POST /chat/ai (B55)", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).post("/chat/ai").send({ message: "Hello" });
    expect(res.status).toBe(401);
  });

  it("creates new assistant conversation and returns user + assistant messages", async () => {
    const user = createUser("chat-user@test.co", "pass123", "Chat User", "USER");
    const token = signToken(user);

    const res = await request(app)
      .post("/chat/ai")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Привет, расскажи про проект." });

    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBeTruthy();
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages).toHaveLength(2);
    const [userMsg, assistantMsg] = res.body.messages as Array<{
      role: string;
      content: string;
    }>;
    expect(userMsg.role).toBe("user");
    expect(userMsg.content).toMatch(/Привет/);
    expect(assistantMsg.role).toBe("assistant");
    expect(assistantMsg.content).toMatch(/Вы написали/i);
  });

  it("reuses existing conversation when conversationId provided", async () => {
    const user = createUser("chat-reuse@test.co", "pass123", "Chat Reuse", "USER");
    const token = signToken(user);

    const first = await request(app)
      .post("/chat/ai")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Первое сообщение" });

    expect(first.status).toBe(200);
    const conversationId = first.body.conversationId as string;

    const second = await request(app)
      .post("/chat/ai")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Второе сообщение", conversationId });

    expect(second.status).toBe(200);
    expect(second.body.conversationId).toBe(conversationId);

    const rows = db
      .prepare("SELECT COUNT(*) as c FROM chat_messages WHERE conversation_id = ?")
      .get(conversationId) as { c: number };
    // два запроса → по 2 сообщения (user+assistant) каждый
    expect(rows.c).toBe(4);
  });

  it("returns 404 when conversation does not belong to user", async () => {
    const owner = createUser("chat-owner@test.co", "pass123", "Owner", "USER");
    const other = createUser("chat-other@test.co", "pass123", "Other", "USER");
    const ownerToken = signToken(owner);
    const otherToken = signToken(other);

    const first = await request(app)
      .post("/chat/ai")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ message: "Привет" });

    const foreignConversationId = first.body.conversationId as string;

    const res = await request(app)
      .post("/chat/ai")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ message: "Попробую воспользоваться чужим диалогом", conversationId: foreignConversationId });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/диалог/i);
  });
});


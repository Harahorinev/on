import { describe, it, expect } from "vitest";
import { aiClient } from "./aiClient.js";

describe("aiClient (B103)", () => {
  it("falls back to stub client when OPENAI_API_KEY is not set", async () => {
    const reply = await aiClient.generateReply([
      { role: "user", content: "Привет, что это за сервис?" },
    ]);
    expect(reply).toMatch(/Привет|Вы написали|ассистент/i);
  });
});


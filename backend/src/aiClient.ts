/**
 * B55/B103: AI client abstraction.
 *
 * По умолчанию используется заглушка (StubAiClient), которая не делает сетевых вызовов.
 * Если задан OPENAI_API_KEY, включается OpenAIClient и реальные ответы от модели.
 */

import { logger } from "./logger.js";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiContext {
  bookingId?: string;
  userEventId?: string;
}

export interface AiClient {
  generateReply(messages: AiMessage[], context?: AiContext): Promise<string>;
}

class StubAiClient implements AiClient {
  async generateReply(messages: AiMessage[]): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const content = lastUser?.content ?? "";
    if (!content) {
      return "Привет! Я пока тестовый ассистент. Задайте вопрос, и я постараюсь помочь.";
    }
    return `Вы написали: «${content}». В проде здесь будет ответ реального AI.`;
  }
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? "15000");

class OpenAiClient implements AiClient {
  async generateReply(messages: AiMessage[], context?: AiContext): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const systemParts: string[] = [
      "Ты ассистент сервиса онлайн-записи On.",
      "Отвечай кратко и по делу.",
    ];
    if (context?.bookingId) {
      systemParts.push(`Контекст: вопрос относится к бронированию id=${context.bookingId}.`);
    }
    if (context?.userEventId) {
      systemParts.push(`Контекст: вопрос относится к событию календаря id=${context.userEventId}.`);
    }

    const body = {
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemParts.join(" ") },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.3,
      max_tokens: 512,
    };

    try {
      const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        logger.error(
          { status: res.status, body: text },
          "OpenAI API returned non-OK status"
        );
        throw new Error(`OpenAI error ${res.status}`);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("OpenAI: empty content");
      }
      return content;
    } catch (err) {
      logger.error({ err }, "AI client error");
      return "Не удалось получить ответ ассистента. Попробуйте позже.";
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Если ключа нет, продолжаем использовать безопасную заглушку.
// В тестах (NODE_ENV=test) мы тоже остаёмся на заглушке.
export const aiClient: AiClient =
  OPENAI_API_KEY && process.env.NODE_ENV !== "test"
    ? new OpenAiClient()
    : new StubAiClient();


/**
 * B55/B103: AI client abstraction.
 *
 * Сейчас реализована безопасная заглушка без реальных сетевых вызовов.
 * В проде можно заменить реализацией, которая ходит к внешнему провайдеру
 * (OpenAI, локальная модель и т.п.), оставив тот же интерфейс.
 */

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

// В будущем можно выбирать реализацию по ENV (AI_PROVIDER и т.п.).
export const aiClient: AiClient = new StubAiClient();


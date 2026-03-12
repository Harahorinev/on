import { useEffect, useRef, useState } from 'react';
import { chatApi, ChatMessage, getApiErrorMessage } from '../lib/api';

type ChatPageProps = {
  variant?: 'page' | 'widget';
};

export function ChatPage({ variant = 'page' }: ChatPageProps = {}) {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxPx = 6 * 16; // соответствует max-height: 6rem
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
  }, [input]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await chatApi.sendToAssistant({
        message: text,
        conversationId,
      });
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, ...data.messages]);
      setInput('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось отправить сообщение'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={variant === 'page' ? 'card chat-card' : 'chat-card'}>
      {variant === 'page' && (
        <>
          <h1 className="mt-0">Чат с ассистентом</h1>
          <div className="muted mb-1">
            Задавайте вопросы про расписание, записи и работу сервиса. Пока это тестовый ассистент на бэкенде.
          </div>
        </>
      )}
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && <p className="muted">Напишите первое сообщение, чтобы начать диалог.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-message chat-message--${m.role}`}>
            <div className="chat-message-bubble">
              <div className="chat-message-role">{m.role === 'user' ? 'Вы' : 'Ассистент'}</div>
              <div className="chat-message-content">{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите сообщение..."
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <button
          type="submit"
          className="btn btn-primary chat-send-btn"
          disabled={loading || !input.trim()}
          aria-label={loading ? 'Отправка…' : 'Отправить'}
        >
          <span className="visually-hidden">{loading ? 'Отправка…' : 'Отправить'}</span>
          {loading ? '…' : '➤'}
        </button>
      </form>
      {error && <p className="error mt-1">{error}</p>}
    </div>
  );
}


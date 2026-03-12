import { useState } from 'react';
import { ChatPage } from '../pages/ChatPage';

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen(true)}
        aria-label="Открыть чат с ассистентом"
      >
        💬
      </button>
      {open && (
        <div className="chat-drawer" aria-label="Чат с ассистентом">
          <div className="chat-drawer-header">
            <span className="chat-drawer-title">Чат с ассистентом</span>
            <button
              type="button"
              className="chat-drawer-close"
              onClick={() => setOpen(false)}
              aria-label="Закрыть чат"
            >
              ×
            </button>
          </div>
          <div className="chat-drawer-body">
            <ChatPage variant="widget" />
          </div>
        </div>
      )}
    </>
  );
}


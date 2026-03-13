import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChatPage } from '@/pages/ChatPage';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  chatApi: {
    sendToAssistant: vi.fn(),
  },
  getApiErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

function wrap(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
}

describe('ChatPage', () => {
  beforeEach(() => {
    vi.mocked(api.chatApi.sendToAssistant).mockReset();
  });

  it('renders input and hint text', () => {
    wrap(<ChatPage />);
    expect(screen.getByText(/чат с ассистентом/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/напишите сообщение/i)).toBeInTheDocument();
  });

  it('sends message and renders assistant reply', async () => {
    vi.mocked(api.chatApi.sendToAssistant).mockResolvedValue({
      data: {
        conversationId: 'conv-1',
        messages: [
          { id: '1', role: 'user', content: 'Привет', createdAt: '2024-01-01T00:00:00Z' },
          { id: '2', role: 'assistant', content: 'Ответ ассистента', createdAt: '2024-01-01T00:00:01Z' },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });
    const user = userEvent.setup();
    wrap(<ChatPage />);
    await user.type(screen.getByPlaceholderText(/напишите сообщение/i), 'Привет');
    await user.click(screen.getByRole('button', { name: /отправить/i }));
    expect(api.chatApi.sendToAssistant).toHaveBeenCalledWith({ message: 'Привет', conversationId: undefined });
    expect(await screen.findByText('Ответ ассистента')).toBeInTheDocument();
  });

  it('sends message on Enter and keeps Shift+Enter for new line', async () => {
    vi.mocked(api.chatApi.sendToAssistant).mockResolvedValue({
      data: {
        conversationId: 'conv-2',
        messages: [
          { id: '1', role: 'user', content: 'Строка 1\nСтрока 2', createdAt: '2024-01-01T00:00:00Z' },
          { id: '2', role: 'assistant', content: 'Ок', createdAt: '2024-01-01T00:00:01Z' },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });
    const user = userEvent.setup();
    wrap(<ChatPage />);
    const textarea = screen.getByPlaceholderText(/напишите сообщение/i);

    // Shift+Enter добавляет перенос строки, но не отправляет
    await user.type(textarea, 'Строка 1');
    await user.keyboard('{Shift>}{Enter/}{/Shift}');
    await user.type(textarea, 'Строка 2');
    expect(api.chatApi.sendToAssistant).not.toHaveBeenCalled();

    // Enter без Shift отправляет
    await user.keyboard('{Enter}');

    expect(api.chatApi.sendToAssistant).toHaveBeenCalledWith({
      message: 'Строка 1\nСтрока 2',
      conversationId: undefined,
    });
    expect(await screen.findByText('Ок')).toBeInTheDocument();
  });
});


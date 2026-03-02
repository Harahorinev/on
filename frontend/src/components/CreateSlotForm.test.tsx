import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreateSlotForm } from './CreateSlotForm';

vi.mock('../lib/api', () => ({
  slotsApi: { create: vi.fn() },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));
vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ notifySuccess: vi.fn() }),
}));

describe('CreateSlotForm', () => {
  it('рендерит форму с полями и кнопками', () => {
    render(
      <CreateSlotForm companyId="c1" onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByRole('heading', { name: 'Новый слот' })).toBeInTheDocument();
    expect(screen.getByLabelText('Начало (дата и время)')).toBeInTheDocument();
    expect(screen.getByLabelText('Окончание (дата и время)')).toBeInTheDocument();
    expect(screen.getByLabelText('Количество мест')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать слот' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument();
  });
});

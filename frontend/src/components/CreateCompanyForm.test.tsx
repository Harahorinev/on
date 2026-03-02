import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreateCompanyForm } from './CreateCompanyForm';
import { companiesApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  companiesApi: { create: vi.fn() },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));
vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ notifySuccess: vi.fn() }),
}));

describe('CreateCompanyForm', () => {
  it('рендерит форму с полями и кнопками', () => {
    render(
      <CreateCompanyForm onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByRole('heading', { name: 'Новая компания' })).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toBeInTheDocument();
    expect(screen.getByLabelText('Описание')).toBeInTheDocument();
    expect(screen.getByLabelText('Часовой пояс')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument();
  });
});

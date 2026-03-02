import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from './api';

describe('getApiErrorMessage', () => {
  it('uses API message when present', () => {
    const err = { response: { data: { message: 'Email already registered' }, status: 409 } };
    expect(getApiErrorMessage(err, 'fallback')).toBe('Email already registered');
  });

  it('returns generic server error with status when no message body', () => {
    const err = { response: { data: {}, status: 500 } };
    expect(getApiErrorMessage(err, 'fallback')).toBe('Ошибка сервера (500)');
  });

  it('returns friendly message for network errors (no response)', () => {
    const networkErr = { code: 'ERR_NETWORK', message: 'Network Error' };
    expect(getApiErrorMessage(networkErr, 'fallback')).toContain('Не удалось подключиться к серверу');
  });
});


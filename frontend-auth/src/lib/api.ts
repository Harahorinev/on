import axios from 'axios';

function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (env && typeof env === 'string' && env.trim()) return env.trim();
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin + '/api';
  }
  return 'http://localhost:3001';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type ApiErrorShape = {
  response?: { data?: { message?: string }; status?: number };
  message?: string;
  code?: string;
};

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as ApiErrorShape;
    const apiMsg = e.response?.data?.message;
    if (typeof apiMsg === 'string' && apiMsg.trim()) return apiMsg.trim();
    if (e.response?.status) return `Ошибка сервера (${e.response.status})`;
    const msg = typeof e.message === 'string' ? e.message : '';
    const lower = msg.toLowerCase();
    if (e.code === 'ERR_NETWORK' || lower.includes('network error')) {
      return 'Не удалось подключиться к серверу. Проверьте интернет или попробуйте позже.';
    }
    if (msg) return msg;
  }
  return fallback;
}

export type UserRole = 'USER' | 'COMPANY';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const authApi = {
  register: (data: { email: string; password: string; name: string; role: UserRole }) =>
    api.post<{ accessToken: string; user: User }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', data),
};

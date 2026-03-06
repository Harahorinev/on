import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (env && typeof env === 'string' && env.trim()) return env.trim();
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin + '/api';
  }
  return 'http://localhost:3001';
}

const baseURL = getApiBaseUrl();

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r: AxiosResponse) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

type ApiErrorShape = {
  response?: { data?: { message?: string }; status?: number };
  message?: string;
  code?: string;
};

const API_ERROR_RU: Record<string, string> = {
  'name required': 'Укажите название',
  'You already have a company': 'У вас уже есть компания',
  'Only COMPANY can create a company': 'Только компания может создать компанию',
  'Slot not found': 'Слот не найден',
  'startAt, endAt, capacity required': 'Укажите начало, окончание и вместимость',
  'Invalid startAt or endAt': 'Неверный формат даты или времени',
  'endAt must be after startAt': 'Время окончания должно быть позже начала',
  'startAt cannot be in the past': 'Начало не может быть в прошлом',
  'Company not found': 'Компания не найдена',
  Unauthorized: 'Войдите в аккаунт',
  'Not found': 'Не найдено',
};

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as ApiErrorShape;
    const apiMsg = e.response?.data?.message;
    if (typeof apiMsg === 'string') {
      const ru = API_ERROR_RU[apiMsg.trim()];
      return ru ?? apiMsg;
    }
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

export interface Company {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  owner?: { id: string; email: string; name: string };
}

export type SlotStatus = 'OPEN' | 'CANCELLED' | 'CLOSED';

export interface ScheduleSlot {
  id: string;
  companyId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status: SlotStatus;
  title?: string;
  description?: string;
  location?: string;
  company?: { id: string; name: string };
  bookings?: { id: string; userId: string }[];
}

export const companiesApi = {
  getMy: () => api.get<Company>('/companies/me'),
  create: (data: { name: string; description?: string; timezone?: string }) =>
    api.post<Company>('/companies', data),
  update: (id: string, data: { name?: string; description?: string; timezone?: string }) =>
    api.patch<Company>(`/companies/${id}`, data),
};

export const slotsApi = {
  list: (companyId: string) => api.get<ScheduleSlot[]>(`/companies/${companyId}/slots`),
  create: (companyId: string, data: { startAt: string; endAt: string; capacity: number; title?: string; description?: string; location?: string }) =>
    api.post<ScheduleSlot>(`/companies/${companyId}/slots`, data),
  update: (companyId: string, slotId: string, data: Partial<{ startAt: string; endAt: string; capacity: number; status: string; title: string; description: string; location: string }>) =>
    api.patch<ScheduleSlot>(`/companies/${companyId}/slots/${slotId}`, data),
  delete: (companyId: string, slotId: string) =>
    api.delete(`/companies/${companyId}/slots/${slotId}`),
};

import axios from 'axios';

function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (env && typeof env === 'string' && env.trim()) return env.trim();
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin + '/api';
  }
  return 'http://localhost:3000';
}

const baseURL = getApiBaseUrl();

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
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

/** Из ошибки API достаёт понятное сообщение, в т.ч. для сетевых сбоев. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as ApiErrorShape;
    const apiMsg = e.response?.data?.message;
    if (typeof apiMsg === 'string') return apiMsg;

    if (e.response) {
      if (e.response.status) return `Ошибка сервера (${e.response.status})`;
      return fallback;
    }

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

export interface Booking {
  id: string;
  slotId: string;
  userId: string;
  status: string;
  createdAt: string;
  slot?: ScheduleSlot & { company?: { id: string; name: string } };
}

export interface UserEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  createdAt: string;
}

export const authApi = {
  register: (data: { email: string; password: string; name: string; role: UserRole }) =>
    api.post<{ accessToken: string; user: User }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', data),
};

export const companiesApi = {
  list: () => api.get<Company[]>('/companies'),
  get: (id: string) => api.get<Company>(`/companies/${id}`),
  getMy: () => api.get<Company>('/companies/me'),
  create: (data: { name: string; description?: string; timezone?: string }) =>
    api.post<Company>('/companies', data),
  update: (id: string, data: { name?: string; description?: string; timezone?: string }) =>
    api.patch<Company>(`/companies/${id}`, data),
};

export const slotsApi = {
  list: (companyId: string, params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<ScheduleSlot[]>(`/companies/${companyId}/slots`, { params }),
  get: (id: string) => api.get<ScheduleSlot>(`/slots/${id}`),
  create: (companyId: string, data: { startAt: string; endAt: string; capacity: number; title?: string; description?: string; location?: string }) =>
    api.post<ScheduleSlot>(`/companies/${companyId}/slots`, data),
  update: (companyId: string, slotId: string, data: Partial<{ startAt: string; endAt: string; capacity: number; status: string; title: string; description: string; location: string }>) =>
    api.patch<ScheduleSlot>(`/companies/${companyId}/slots/${slotId}`, data),
  delete: (companyId: string, slotId: string) =>
    api.delete(`/companies/${companyId}/slots/${slotId}`),
};

export const bookingsApi = {
  my: () => api.get<Booking[]>('/bookings/me'),
  get: (id: string) => api.get<Booking>(`/bookings/${id}`),
  create: (slotId: string) => api.post<Booking>(`/slots/${slotId}/bookings`),
  cancel: (id: string) => api.delete<Booking>(`/bookings/${id}`),
};

export const userEventsApi = {
  list: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<UserEvent[]>('/user/events', { params }),
  create: (data: { title: string; description?: string; startAt: string; endAt: string }) =>
    api.post<UserEvent>('/user/events', data),
  get: (id: string) => api.get<UserEvent>(`/user/events/${id}`),
  update: (id: string, data: { title?: string; description?: string; startAt?: string; endAt?: string }) =>
    api.patch<UserEvent>(`/user/events/${id}`, data),
  delete: (id: string) => api.delete(`/user/events/${id}`),
};

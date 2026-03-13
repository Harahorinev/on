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

export interface Company {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  owner?: { id: string; email: string; name: string };
}

export type SlotStatus = 'OPEN' | 'CANCELLED' | 'CLOSED';
export type SlotSortBy = 'startAt' | 'employeeName';

export interface ScheduleSlot {
  id: string;
  companyId: string;
  employeeId?: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status: SlotStatus;
  title?: string;
  description?: string;
  location?: string;
  company?: { id: string; name: string };
  employee?: { id: string; name: string };
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

export const companiesApi = {
  list: () => api.get<Company[]>('/companies'),
  get: (id: string) => api.get<Company>(`/companies/${id}`),
};

export const slotsApi = {
  list: (
    companyId: string,
    params?: { dateFrom?: string; dateTo?: string; employeeId?: string; sortBy?: SlotSortBy; sortOrder?: 'asc' | 'desc' }
  ) =>
    api.get<ScheduleSlot[]>(`/companies/${companyId}/slots`, { params }),
};

export const bookingsApi = {
  my: () => api.get<Booking[]>('/bookings/me'),
  create: (slotId: string) => api.post<Booking>(`/slots/${slotId}/bookings`),
  cancel: (id: string) => api.delete<Booking>(`/bookings/${id}`),
};

export const userEventsApi = {
  list: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<UserEvent[]>('/user/events', { params }),
  create: (data: { title: string; description?: string; startAt: string; endAt: string }) =>
    api.post<UserEvent>('/user/events', data),
};

export interface UserPreferences {
  notifyEmail?: boolean;
  notifyInApp?: boolean;
  calendarView?: 'week' | 'month';
  calendarRange?: number;
}

export const userApi = {
  getPreferences: () => api.get<UserPreferences>('/user/preferences'),
  patchPreferences: (data: UserPreferences) => api.patch<UserPreferences>('/user/preferences', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/user/password', data),
};

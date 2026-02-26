import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

/** Из ошибки API достаёт message или возвращает fallback (всегда string). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
    const apiMsg = e.response?.data?.message;
    if (typeof apiMsg === 'string') return apiMsg;
    // Сетевая ошибка или ответ без body (например 500 с HTML)
    if (e.response) return e.response.status ? `Ошибка сервера (${e.response.status})` : fallback;
    if (typeof e.message === 'string' && e.message) return e.message;
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

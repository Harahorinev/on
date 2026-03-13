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

export interface CompanyEmployee {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  photoUrl?: string;
  directionIds?: string[];
  createdAt?: string;
}

export interface Direction {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
}

export const companiesApi = {
  getMy: () => api.get<Company>('/companies/me'),
  create: (data: { name: string; description?: string; timezone?: string }) =>
    api.post<Company>('/companies', data),
  update: (id: string, data: { name?: string; description?: string; timezone?: string }) =>
    api.patch<Company>(`/companies/${id}`, data),
  exportScheduleCsv: (
    id: string,
    params?: { dateFrom?: string; dateTo?: string; employeeId?: string; sortBy?: SlotSortBy; sortOrder?: 'asc' | 'desc' }
  ) =>
    api.get<Blob>(`/companies/${id}/export`, { params: { format: 'csv', ...params }, responseType: 'blob' }),
};

export const slotsApi = {
  list: (
    companyId: string,
    params?: { dateFrom?: string; dateTo?: string; employeeId?: string; sortBy?: SlotSortBy; sortOrder?: 'asc' | 'desc' }
  ) => api.get<ScheduleSlot[]>(`/companies/${companyId}/slots`, { params }),
  create: (
    companyId: string,
    data: {
      startAt: string;
      endAt: string;
      capacity: number;
      title?: string;
      description?: string;
      location?: string;
      employeeId?: string | null;
    }
  ) => api.post<ScheduleSlot>(`/companies/${companyId}/slots`, data),
  update: (
    companyId: string,
    slotId: string,
    data: Partial<{
      startAt: string;
      endAt: string;
      capacity: number;
      status: string;
      title: string;
      description: string;
      location: string;
      employeeId: string | null;
    }>
  ) => api.patch<ScheduleSlot>(`/companies/${companyId}/slots/${slotId}`, data),
  delete: (companyId: string, slotId: string) => api.delete(`/companies/${companyId}/slots/${slotId}`),
};

export const employeesApi = {
  list: (companyId: string) => api.get<CompanyEmployee[]>(`/companies/${companyId}/employees`),
  create: (companyId: string, data: { name: string; description?: string; photoUrl?: string; directionIds?: string[] }) =>
    api.post<CompanyEmployee>(`/companies/${companyId}/employees`, data),
  update: (
    companyId: string,
    employeeId: string,
    data: { name?: string; description?: string; photoUrl?: string; directionIds?: string[] }
  ) => api.patch<CompanyEmployee>(`/companies/${companyId}/employees/${employeeId}`, data),
  delete: (companyId: string, employeeId: string, params?: { deleteFutureSlots?: boolean }) =>
    api.delete(`/companies/${companyId}/employees/${employeeId}`, { params }),
};

export const directionsApi = {
  list: (companyId: string) => api.get<Direction[]>(`/companies/${companyId}/directions`),
};

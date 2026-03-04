import axios from 'axios';

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

/** Перевод сообщений об ошибках с бэкенда (англ → рус). */
const API_ERROR_RU: Record<string, string> = {
  'email, password, name, role required': 'Укажите email, пароль, имя и роль',
  'role must be USER or COMPANY': 'Роль должна быть USER или COMPANY',
  'password at least 6 characters': 'Пароль не менее 6 символов',
  'Email already registered': 'Этот email уже зарегистрирован',
  'Database path invalid or not writable. Check DB_PATH and permissions.': 'Ошибка доступа к базе данных. Проверьте DB_PATH и права.',
  'Registration failed': 'Ошибка регистрации',
  'email and password required': 'Укажите email и пароль',
  'Invalid email or password': 'Неверный email или пароль',
  Unauthorized: 'Войдите в аккаунт',
  'Invalid or expired token': 'Сессия истекла. Войдите снова.',
  'User not found': 'Пользователь не найден',
  'Not found': 'Не найдено',
  'Company not found': 'Компания не найдена',
  'Only COMPANY can create a company': 'Только компания может создать компанию',
  'name required': 'Укажите название',
  'You already have a company': 'У вас уже есть компания',
  Forbidden: 'Доступ запрещён',
  'Slot not found': 'Слот не найден',
  'companyId required': 'Укажите компанию',
  'startAt, endAt, capacity required': 'Укажите начало, окончание и вместимость',
  'Invalid startAt or endAt': 'Неверный формат даты или времени',
  'endAt must be after startAt': 'Время окончания должно быть позже начала',
  'startAt cannot be in the past': 'Начало не может быть в прошлом',
  'Invalid status': 'Недопустимый статус',
  'Booking not found': 'Запись не найдена',
  'Only USER can create bookings': 'Только пользователь может записываться на слоты',
  'Slot is not available': 'Слот недоступен',
  'Already booked': 'Вы уже записаны на этот слот',
  'Slot is full': 'Слот заполнен',
  'Only USER can have personal events': 'Только пользователь может просматривать личные события',
  'Only USER can create personal events': 'Только пользователь может создавать личные события',
  'title required': 'Укажите название',
  'startAt and endAt required': 'Укажите начало и окончание',
  'title must be non-empty': 'Название не должно быть пустым',
  'Invalid startAt': 'Неверная дата начала',
  'Invalid endAt': 'Неверная дата окончания',
  'Event not found': 'Событие не найдено',
  'Direction not found': 'Направление не найдено',
  'Only COMPANY can manage directions': 'Только компания может управлять направлениями',
  'name must be non-empty': 'Название не должно быть пустым',
  'currentPassword and newPassword required': 'Укажите текущий и новый пароль',
  'newPassword at least 6 characters': 'Новый пароль не менее 6 символов',
  'Current password is incorrect': 'Текущий пароль неверный',
  'notifyEmail must be boolean': 'Уведомления по email: да/нет',
  'notifyInApp must be boolean': 'Уведомления в приложении: да/нет',
  'calendarView must be week or month': 'Вид календаря: неделя или месяц',
  'calendarRange must be 7, 14, or 30': 'Период календаря: 7, 14 или 30 дней',
};

/** Из ошибки API достаёт понятное сообщение на русском (в т.ч. перевод с бэка и сетевые сбои). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as ApiErrorShape;
    const apiMsg = e.response?.data?.message;
    if (typeof apiMsg === 'string') {
      const ru = API_ERROR_RU[apiMsg.trim()];
      return ru ?? apiMsg;
    }

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

const BASE = '/api/v1';

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('ds_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('ds_token');
    window.location.href = '/admin/login';
    throw new Error('Sesión expirada');
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Error desconocido');
  return json.data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; admin: Admin }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<Admin>('/auth/me'),
  },

  barbers: {
    listPublic: (tenantSlug: string, serviceType?: string) =>
      request<Barber[]>(`/barbers/public/${tenantSlug}${serviceType ? `?serviceType=${serviceType}` : ''}`),
    list: () => request<Barber[]>('/barbers'),
    create: (data: Omit<Barber, 'id' | 'tenantId' | 'createdAt'>) =>
      request<Barber>('/barbers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Barber, 'id' | 'tenantId' | 'createdAt'>>) =>
      request<Barber>(`/barbers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/barbers/${id}`, { method: 'DELETE' }),
  },

  schedules: {
    getAvailable: (barberId: string, date: string) =>
      request<{ slots: string[]; date: string; barberId: string; confirmed: boolean }>(
        `/schedules/available/${barberId}?date=${date}`
      ),
    getWeekly: (barberId: string) =>
      request<WeeklySchedule[]>(`/schedules/${barberId}/weekly`),
    setWeekly: (barberId: string, data: WeeklySchedule[]) =>
      request(`/schedules/${barberId}/weekly`, { method: 'PUT', body: JSON.stringify(data) }),
    listOverrides: (barberId: string) =>
      request<ScheduleOverride[]>(`/schedules/${barberId}/overrides`),
    upsertOverride: (barberId: string, data: { date: string; slots: string[]; reason?: string }) =>
      request<ScheduleOverride>(`/schedules/${barberId}/overrides`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteOverride: (barberId: string, overrideId: string) =>
      request(`/schedules/${barberId}/overrides/${overrideId}`, { method: 'DELETE' }),
  },

  dailySchedules: {
    unconfirmed: () => request<UnconfirmedInfo>('/daily-schedules/unconfirmed'),
    getDate: (date: string) => request<DailyBarberInfo[]>(`/daily-schedules/date/${date}`),
    upsert: (
      barberId: string,
      date: string,
      data: { status: DailyScheduleStatus; slots: string[]; notes?: string; cancelBookingIds?: string[] }
    ) =>
      request<{ dailySchedule: DailySchedule; cancelledCount: number }>(
        `/daily-schedules/${barberId}/${date}`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),
  },

  bookings: {
    create: (data: CreateBookingInput) =>
      request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    createAdmin: (data: Omit<CreateBookingInput, 'tenantSlug'>) =>
      request<Booking>('/bookings/admin', { method: 'POST', body: JSON.stringify(data) }),
    list: (params?: { date?: string; barberId?: string; status?: string }) =>
      request<Booking[]>(
        '/bookings' +
          (params
            ? '?' + new URLSearchParams(params as Record<string, string>).toString()
            : '')
      ),
    listPublic: (tenantSlug: string, params?: { date?: string; phone?: string }) =>
      request<Booking[]>(
        `/bookings/public/${tenantSlug}` +
          (params
            ? '?' + new URLSearchParams(params as Record<string, string>).toString()
            : '')
      ),
    updateStatus: (id: string, status: string, notes?: string) =>
      request<Booking>(`/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
      }),
  },
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
}

export interface Barber {
  id: string;
  tenantId: string;
  name: string;
  specialty?: string;
  avatar?: string;
  color: string;
  active: boolean;
  serviceType: string;
  createdAt: string;
}

export interface WeeklySchedule {
  dayOfWeek: number;
  slots: string[];
}

export interface ScheduleOverride {
  id: string;
  barberId: string;
  date: string;
  slots: string[];
  reason?: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  barberId: string;
  barber?: { name: string; avatar?: string; color?: string };
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  status: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreateBookingInput {
  tenantSlug: string;
  barberId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
}

export type DailyScheduleStatus = 'pending' | 'confirmed' | 'absent';

export interface DailySchedule {
  id: string;
  barberId: string;
  date: string;
  status: DailyScheduleStatus;
  slots: string[];
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyBookingConflict {
  id: string;
  barberId: string;
  time: string;
  clientName: string;
  clientPhone: string;
}

export interface DailyBarberInfo {
  barber: { id: string; name: string; specialty?: string | null; color: string };
  defaultSlots: string[];
  dailySchedule: DailySchedule | null;
  bookings: DailyBookingConflict[];
}

export interface UnconfirmedInfo {
  today: { date: string; count: number; barbers: { id: string; name: string }[] };
  tomorrow: { date: string; count: number; barbers: { id: string; name: string }[] };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatDateES(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  'no-show': 'No asistió',
};

export const STATUS_CLASSES: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  completed: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
  'no-show': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

export function generateTimeSlots(startHour = 8, endHour = 20, intervalMin = 45): string[] {
  const slots: string[] = [];
  let minutes = startHour * 60;
  while (minutes < endHour * 60) {
    slots.push(
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    );
    minutes += intervalMin;
  }
  return slots;
}

export const BARBER_COLOR_PRESETS = [
  '#D4AF37', '#8B6914', '#B8860B',
  '#7C6A3C', '#A0845C', '#C9A96E',
  '#6B8E6B', '#8B6B6B', '#6B7B8B',
];

export const ALL_TIME_SLOTS = generateTimeSlots(9, 19, 60);

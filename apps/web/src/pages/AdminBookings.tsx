import { useEffect, useState, FormEvent } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  api,
  Barber,
  Booking,
  STATUS_LABELS,
  STATUS_CLASSES,
  todayISO,
  formatDateES,
} from '../lib/api';

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [date, setDate] = useState(todayISO());
  const [filterBarber, setFilterBarber] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  function load() {
    setLoading(true);
    const params: Record<string, string> = { date };
    if (filterBarber) params.barberId = filterBarber;
    if (filterStatus) params.status = filterStatus;
    api.bookings
      .list(params)
      .then(setBookings)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.barbers.list().then(setBarbers);
  }, []);

  useEffect(() => { load(); }, [date, filterBarber, filterStatus]); // eslint-disable-line

  async function updateStatus(id: string, status: string) {
    try {
      const updated = await api.bookings.updateStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  const visible = bookings.slice().sort((a, b) => a.time.localeCompare(b.time));

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-headline text-3xl text-cream">Citas</h1>
            <p className="text-cream/40 text-sm mt-1 capitalize">{formatDateES(date)}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gold text-dark text-sm font-semibold px-4 py-2.5 hover:bg-gold/90 transition-colors"
          >
            + Nueva cita
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-base w-auto"
          />
          <select
            value={filterBarber}
            onChange={(e) => setFilterBarber(e.target.value)}
            className="input-base w-auto"
          >
            <option value="">Todos los barberos</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-base w-auto"
          >
            <option value="">Todos los estados</option>
            <option value="confirmed">Confirmadas</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="no-show">No asistió</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-cream/30 text-sm py-12 text-center">Cargando…</p>
        ) : visible.length === 0 ? (
          <div className="border border-white/8 py-16 text-center">
            <p className="text-cream/25 text-sm">No hay citas con esos filtros</p>
          </div>
        ) : (
          <div className="border border-white/10 divide-y divide-white/6">
            {visible.map((b) => (
              <BookingRow key={b.id} booking={b} onUpdate={updateStatus} barbers={barbers} />
            ))}
          </div>
        )}

        <p className="text-cream/25 text-xs mt-4 text-right">{visible.length} cita{visible.length !== 1 ? 's' : ''}</p>
      </div>

      {showModal && (
        <NewBookingModal
          barbers={barbers}
          onCreated={(booking) => {
            if (booking.date.startsWith(date)) {
              setBookings((prev) => [...prev, booking]);
            }
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </AdminLayout>
  );
}

// ── Booking row ───────────────────────────────────────────────────────────────

function BookingRow({
  booking: b,
  onUpdate,
  barbers,
}: {
  booking: Booking;
  onUpdate: (id: string, status: string) => void;
  barbers: Barber[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const barber = barbers.find((br) => br.id === b.barberId);

  const actions: { value: string; label: string }[] = [
    b.status === 'confirmed' && { value: 'completed', label: '✓ Completada' },
    b.status === 'confirmed' && { value: 'no-show', label: '✗ No asistió' },
    b.status === 'confirmed' && { value: 'cancelled', label: '— Cancelar' },
    b.status !== 'confirmed' && { value: 'confirmed', label: '↺ Reactivar' },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.015] transition-colors group">
      {/* Time */}
      <span className="text-gold font-semibold text-sm font-mono w-14 shrink-0">{b.time}</span>

      {/* Barber */}
      <div className="flex items-center gap-2 w-36 shrink-0 min-w-0">
        {barber && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: barber.color }}
          />
        )}
        <span className="text-cream/60 text-xs truncate">{b.barber?.name ?? '—'}</span>
      </div>

      {/* Client */}
      <div className="flex-1 min-w-0">
        <p className="text-cream text-sm truncate">{b.clientName}</p>
        <p className="text-cream/35 text-xs">{b.clientPhone}</p>
      </div>

      {/* Notes */}
      {b.notes && (
        <p className="hidden md:block text-cream/30 text-xs max-w-[140px] truncate">{b.notes}</p>
      )}

      {/* Status */}
      <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_CLASSES[b.status]}`}>
        {STATUS_LABELS[b.status]}
      </span>

      {/* Actions menu */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="text-cream/20 hover:text-cream/60 transition-colors px-1 text-base leading-none opacity-0 group-hover:opacity-100"
        >
          ···
        </button>
        {menuOpen && (
          <DropMenu
            items={actions}
            onSelect={(v) => { onUpdate(b.id, v); setMenuOpen(false); }}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── New booking modal ─────────────────────────────────────────────────────────

function NewBookingModal({
  barbers,
  onCreated,
  onClose,
}: {
  barbers: Barber[];
  onCreated: (b: Booking) => void;
  onClose: () => void;
}) {
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!barberId || !date) return;
    setLoadingSlots(true);
    setTime('');
    api.schedules
      .getAvailable(barberId, date)
      .then((res) => setSlots(res.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [barberId, date]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!time) { setError('Selecciona un horario'); return; }
    setError('');
    setSaving(true);
    try {
      const booking = await api.bookings.createAdmin({
        barberId,
        date,
        time,
        clientName,
        clientPhone,
        notes: notes || undefined,
      });
      onCreated(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cita');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-[#110d09] border border-white/15 w-full max-w-lg p-7 max-h-[90vh] overflow-y-auto">
        <h2 className="font-headline text-xl text-cream mb-6">Nueva cita</h2>

        <form onSubmit={submit} className="space-y-5">
          {/* Barber */}
          <Field label="Barbero">
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="input-base"
              required
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.avatar} {b.name}</option>
              ))}
            </select>
          </Field>

          {/* Date */}
          <Field label="Fecha">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-base"
              required
            />
          </Field>

          {/* Time slots */}
          <Field label={loadingSlots ? 'Cargando horarios…' : `Hora — ${slots.length} disponibles`}>
            {loadingSlots ? (
              <p className="text-cream/30 text-sm py-2">Buscando horarios disponibles…</p>
            ) : slots.length === 0 ? (
              <p className="text-cream/30 text-sm py-2 border border-white/8 px-3">
                Sin horarios disponibles para esta fecha
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setTime(s)}
                    className={`py-2 text-xs font-mono font-medium border transition-all ${
                      time === s
                        ? 'bg-gold text-dark border-gold'
                        : 'bg-white/3 text-cream/50 border-white/10 hover:border-gold/40 hover:text-cream/80'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {/* Client */}
          <Field label="Nombre del cliente">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="input-base"
              placeholder="Juan Pérez"
              required
            />
          </Field>

          <Field label="Teléfono">
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="input-base"
              placeholder="+506 8888 8888"
              required
            />
          </Field>

          <Field label="Notas (opcional)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-base"
              placeholder="Corte fade, barba…"
            />
          </Field>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !time}
              className="flex-1 bg-gold text-dark font-semibold py-2.5 text-sm hover:bg-gold/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando…' : 'Crear cita'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 border border-white/15 text-cream/60 text-sm hover:text-cream transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-cream/60 text-xs tracking-wide uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

function DropMenu({
  items,
  onSelect,
  onClose,
}: {
  items: { value: string; label: string }[];
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = () => onClose();
    setTimeout(() => document.addEventListener('click', h), 0);
    return () => document.removeEventListener('click', h);
  }, [onClose]);

  return (
    <div className="absolute right-0 bottom-full mb-1 z-20 bg-[#1a1410] border border-white/15 shadow-xl min-w-[160px]">
      {items.map((a) => (
        <button
          key={a.value}
          onClick={() => onSelect(a.value)}
          className="block w-full text-left px-4 py-2.5 text-sm text-cream/70 hover:text-cream hover:bg-white/5 transition-colors"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

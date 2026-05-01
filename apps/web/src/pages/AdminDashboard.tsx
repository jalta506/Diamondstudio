import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { api, Booking, UnconfirmedInfo, STATUS_LABELS, STATUS_CLASSES, todayISO, formatDateES } from '../lib/api';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [unconfirmed, setUnconfirmed] = useState<UnconfirmedInfo | null>(null);
  const today = todayISO();

  useEffect(() => {
    api.bookings.list({ date: today }).then(setBookings).finally(() => setLoading(false));
    api.dailySchedules.unconfirmed().then(setUnconfirmed).catch(() => null);
  }, [today]);

  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled' || b.status === 'no-show').length;

  async function markStatus(id: string, status: string) {
    try {
      const updated = await api.bookings.updateStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-headline text-3xl text-cream">Panel</h1>
          <p className="text-cream/40 text-sm mt-1 capitalize">{formatDateES(today)}</p>
        </div>

        {/* Unconfirmed banner */}
        {unconfirmed && (unconfirmed.today.count > 0 || unconfirmed.tomorrow.count > 0) && (
          <div className="mb-8 bg-amber-500/8 border border-amber-500/25 px-5 py-4 flex items-start gap-4">
            <WarningIcon className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-400 text-sm font-medium">Confirmación de horarios pendiente</p>
              <p className="text-amber-400/60 text-xs mt-1 leading-relaxed">
                {unconfirmed.today.count > 0 && (
                  <span>
                    Hoy: <strong className="text-amber-400/80">{unconfirmed.today.count}</strong>{' '}
                    barbero{unconfirmed.today.count > 1 ? 's' : ''} sin confirmar
                    {' '}({unconfirmed.today.barbers.map((b) => b.name).join(', ')})
                  </span>
                )}
                {unconfirmed.today.count > 0 && unconfirmed.tomorrow.count > 0 && (
                  <span className="block mt-0.5" />
                )}
                {unconfirmed.tomorrow.count > 0 && (
                  <span>
                    Mañana: <strong className="text-amber-400/80">{unconfirmed.tomorrow.count}</strong>{' '}
                    barbero{unconfirmed.tomorrow.count > 1 ? 's' : ''} sin confirmar
                    {' '}({unconfirmed.tomorrow.barbers.map((b) => b.name).join(', ')})
                  </span>
                )}
              </p>
            </div>
            <Link
              to="/admin/daily"
              className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-3 py-1.5 shrink-0 transition-colors hover:border-amber-500/50"
            >
              Gestionar
            </Link>
          </div>
        )}

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatTile label="Citas hoy" value={bookings.length} color="text-cream" />
          <StatTile label="Confirmadas" value={confirmed} color="text-emerald-400" />
          <StatTile label="Completadas" value={completed} color="text-sky-400" />
          <StatTile label="Canceladas" value={cancelled} color="text-red-400" />
        </div>

        {/* Today's bookings */}
        <div>
          <h2 className="font-headline text-lg text-cream/80 mb-4">Citas de hoy</h2>

          {loading && (
            <p className="text-cream/30 text-sm py-8 text-center">Cargando…</p>
          )}

          {!loading && bookings.length === 0 && (
            <div className="border border-white/8 py-12 text-center">
              <p className="text-cream/30 text-sm">No hay citas para hoy</p>
            </div>
          )}

          {!loading && bookings.length > 0 && (
            <div className="border border-white/10 divide-y divide-white/6">
              {bookings
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((b) => (
                  <BookingRow key={b.id} booking={b} onMark={markStatus} />
                ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-white/10 px-5 py-4 bg-white/[0.02]">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-cream/40 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function BookingRow({
  booking: b,
  onMark,
}: {
  booking: Booking;
  onMark: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      {/* Time */}
      <span className="text-gold font-semibold text-sm w-14 shrink-0">{b.time}</span>

      {/* Barber dot */}
      {b.barber && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: b.barber.color ?? '#D4AF37' }}
        />
      )}

      {/* Client info */}
      <div className="flex-1 min-w-0">
        <p className="text-cream text-sm truncate">{b.clientName}</p>
        <p className="text-cream/40 text-xs truncate">
          {b.barber?.name} · {b.clientPhone}
        </p>
      </div>

      {/* Status badge */}
      <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_CLASSES[b.status]}`}>
        {STATUS_LABELS[b.status]}
      </span>

      {/* Actions */}
      <div className="relative shrink-0">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-cream/30 hover:text-cream/70 px-1 transition-colors text-lg leading-none"
        >
          ···
        </button>
        {open && (
          <ActionMenu
            status={b.status}
            onSelect={(s) => { onMark(b.id, s); setOpen(false); }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function ActionMenu({
  status,
  onSelect,
  onClose,
}: {
  status: string;
  onSelect: (s: string) => void;
  onClose: () => void;
}) {
  const actions = [
    { value: 'completed', label: 'Marcar completada', show: status === 'confirmed' },
    { value: 'no-show', label: 'No asistió', show: status === 'confirmed' },
    { value: 'cancelled', label: 'Cancelar', show: status === 'confirmed' },
    { value: 'confirmed', label: 'Reactivar', show: status !== 'confirmed' },
  ].filter((a) => a.show);

  useEffect(() => {
    const handler = () => onClose();
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div className="absolute right-0 top-7 z-20 bg-[#1a1410] border border-white/15 shadow-xl min-w-[160px]">
      {actions.map((a) => (
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

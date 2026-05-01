import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  api,
  DailyBarberInfo,
  DailyBookingConflict,
  DailySchedule,
  DailyScheduleStatus,
  todayISO,
  formatDateES,
} from '../lib/api';

interface LocalState {
  slots: string[];
  status: DailyScheduleStatus;
  notes: string;
  dirty: boolean;
}

interface ConflictModal {
  barberId: string;
  status: DailyScheduleStatus;
  slots: string[];
  bookings: DailyBookingConflict[];
}

function tomorrowISO(): string {
  const d = new Date(Date.now() - 6 * 3600 * 1000 + 86400 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function shiftISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AdminDailySchedule() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DailyBarberInfo[]>([]);
  const [localState, setLocalState] = useState<Record<string, LocalState>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [conflictModal, setConflictModal] = useState<ConflictModal | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    setLocalState({});
    api.dailySchedules
      .getDate(date)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        const init: Record<string, LocalState> = {};
        for (const item of data) {
          init[item.barber.id] = {
            slots: item.dailySchedule?.slots ?? item.defaultSlots,
            status: item.dailySchedule?.status ?? 'pending',
            notes: item.dailySchedule?.notes ?? '',
            dirty: false,
          };
        }
        setLocalState(init);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar la información del día');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function toggleSlot(barberId: string, slot: string) {
    setLocalState((prev) => {
      const cur = prev[barberId];
      const has = cur.slots.includes(slot);
      const newSlots = has ? cur.slots.filter((s) => s !== slot) : [...cur.slots, slot].sort();
      return { ...prev, [barberId]: { ...cur, slots: newSlots, dirty: true } };
    });
  }

  function setNotes(barberId: string, notes: string) {
    setLocalState((prev) => ({
      ...prev,
      [barberId]: { ...prev[barberId], notes, dirty: true },
    }));
  }

  async function handleSave(
    barberId: string,
    status: DailyScheduleStatus,
    slotsOverride?: string[]
  ) {
    const item = items.find((i) => i.barber.id === barberId);
    if (!item) return;

    const local = localState[barberId];
    const targetSlots = status === 'absent' ? [] : (slotsOverride ?? local.slots);

    // Detect booking conflicts: slots that were available before but are now removed
    const previousSlots = item.dailySchedule?.slots ?? item.defaultSlots;
    const removedSlots = previousSlots.filter((s) => !targetSlots.includes(s));
    const conflicts = item.bookings.filter((b) => removedSlots.includes(b.time));

    if (conflicts.length > 0) {
      setConflictModal({ barberId, status, slots: targetSlots, bookings: conflicts });
      return;
    }

    await doSave(barberId, status, targetSlots, []);
  }

  async function doSave(
    barberId: string,
    status: DailyScheduleStatus,
    slots: string[],
    cancelBookingIds: string[]
  ) {
    setSaving((prev) => new Set(prev).add(barberId));
    try {
      const notes = localState[barberId]?.notes;
      const result = await api.dailySchedules.upsert(barberId, date, {
        status,
        slots,
        notes: notes.trim() || undefined,
        cancelBookingIds,
      });

      const updatedDs: DailySchedule = result.dailySchedule;
      setItems((prev) =>
        prev.map((item) =>
          item.barber.id === barberId
            ? {
                ...item,
                dailySchedule: updatedDs,
                bookings: item.bookings.filter((b) => !cancelBookingIds.includes(b.id)),
              }
            : item
        )
      );
      setLocalState((prev) => ({
        ...prev,
        [barberId]: { ...prev[barberId], status, dirty: false },
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving((prev) => {
        const s = new Set(prev);
        s.delete(barberId);
        return s;
      });
    }
  }

  const dateLabel = (() => {
    if (date === today) return 'Hoy';
    if (date === tomorrowISO()) return 'Mañana';
    return '';
  })();

  const confirmedCount = items.filter(
    (i) => localState[i.barber.id]?.status === 'confirmed' || localState[i.barber.id]?.status === 'absent'
  ).length;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-headline text-3xl text-cream">Gestión del día</h1>

          {/* Date navigator */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => setDate(shiftISO(date, -1))}
              className="w-8 h-8 flex items-center justify-center text-cream/40 hover:text-cream border border-white/10 hover:border-white/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center">
              <p className="text-cream text-sm font-medium capitalize">
                {formatDateES(date)}
              </p>
              {dateLabel && (
                <p className="text-gold/70 text-xs uppercase tracking-widest mt-0.5">{dateLabel}</p>
              )}
            </div>

            <button
              onClick={() => setDate(shiftISO(date, 1))}
              className="w-8 h-8 flex items-center justify-center text-cream/40 hover:text-cream border border-white/10 hover:border-white/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {date !== today && (
              <button
                onClick={() => setDate(today)}
                className="text-xs text-gold/70 hover:text-gold border border-gold/20 px-3 py-1.5 transition-colors"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Progress pill */}
          {!loading && items.length > 0 && (
            <p className="text-center text-cream/30 text-xs mt-3">
              {confirmedCount} / {items.length} confirmados
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mb-6 text-sm text-red-400 border border-red-500/20 bg-red-500/5 px-4 py-3">
            {error}
          </p>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white/[0.02] border border-white/8 p-5 animate-pulse h-48" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && !error && (
          <div className="border border-white/8 py-16 text-center">
            <p className="text-cream/30 text-sm">No hay barberos activos registrados</p>
          </div>
        )}

        {/* Barber cards */}
        {!loading && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => {
              const local = localState[item.barber.id];
              if (!local) return null;
              return (
                <BarberDayCard
                  key={item.barber.id}
                  item={item}
                  local={local}
                  saving={saving.has(item.barber.id)}
                  onToggleSlot={(slot) => toggleSlot(item.barber.id, slot)}
                  onSetNotes={(notes) => setNotes(item.barber.id, notes)}
                  onConfirm={() => handleSave(item.barber.id, 'confirmed', item.defaultSlots)}
                  onSave={() => handleSave(item.barber.id, 'confirmed')}
                  onAbsent={() => handleSave(item.barber.id, 'absent')}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Conflict warning modal */}
      {conflictModal && (
        <ConflictWarningModal
          modal={conflictModal}
          itemName={items.find((i) => i.barber.id === conflictModal.barberId)?.barber.name ?? ''}
          onConfirm={() => {
            const m = conflictModal;
            setConflictModal(null);
            doSave(
              m.barberId,
              m.status,
              m.slots,
              m.bookings.map((b) => b.id)
            );
          }}
          onCancel={() => setConflictModal(null)}
        />
      )}
    </AdminLayout>
  );
}

// ── Barber day card ───────────────────────────────────────────────────────────

function BarberDayCard({
  item,
  local,
  saving,
  onToggleSlot,
  onSetNotes,
  onConfirm,
  onSave,
  onAbsent,
}: {
  item: DailyBarberInfo;
  local: LocalState;
  saving: boolean;
  onToggleSlot: (slot: string) => void;
  onSetNotes: (notes: string) => void;
  onConfirm: () => void;
  onSave: () => void;
  onAbsent: () => void;
}) {
  const isAbsent = local.status === 'absent';
  const isConfirmed = local.status === 'confirmed';
  const bookedTimes = new Set(item.bookings.map((b) => b.time));
  const bookingByTime: Record<string, DailyBookingConflict> = {};
  for (const b of item.bookings) bookingByTime[b.time] = b;

  return (
    <div
      className="bg-[#141210] border border-white/8 overflow-hidden"
      style={{ borderLeft: `3px solid ${item.barber.color}` }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-headline text-lg text-cream leading-none">{item.barber.name}</h3>
            <StatusBadge status={local.status} />
          </div>
          {item.barber.specialty && (
            <p className="text-cream/35 text-xs mt-1">{item.barber.specialty}</p>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!isAbsent && (
            <button
              onClick={onAbsent}
              disabled={saving}
              className="text-xs px-3 py-1.5 border border-red-500/25 text-red-400/70 hover:text-red-400 hover:border-red-500/50 transition-colors disabled:opacity-40"
            >
              Ausente
            </button>
          )}
          {isAbsent && (
            <button
              onClick={onConfirm}
              disabled={saving}
              className="text-xs px-3 py-1.5 border border-emerald-500/25 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors disabled:opacity-40"
            >
              Reactivar
            </button>
          )}
          {!isAbsent && (
            <button
              onClick={onConfirm}
              disabled={saving || isConfirmed}
              className="text-xs px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              {saving ? 'Guardando…' : isConfirmed ? 'Confirmado' : 'Confirmar'}
            </button>
          )}
        </div>
      </div>

      {/* Slot grid */}
      {!isAbsent && item.defaultSlots.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] text-cream/25 uppercase tracking-[0.2em] mb-2.5">
            Horarios — selecciona los disponibles
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.defaultSlots.map((slot) => {
              const active = local.slots.includes(slot);
              const hasBooking = bookedTimes.has(slot);
              const booking = bookingByTime[slot];
              return (
                <button
                  key={slot}
                  onClick={() => onToggleSlot(slot)}
                  title={hasBooking ? `Cita: ${booking.clientName} (${booking.clientPhone})` : undefined}
                  className={[
                    'relative text-xs px-3 py-1.5 border transition-colors',
                    active
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'border-white/10 text-cream/35 hover:text-cream/60 hover:border-white/20',
                  ].join(' ')}
                >
                  {slot}
                  {hasBooking && (
                    <span
                      className={[
                        'absolute -top-1 -right-1 w-2 h-2 rounded-full',
                        active ? 'bg-amber-400' : 'bg-amber-600/60',
                      ].join(' ')}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {item.defaultSlots.length > 0 && item.bookings.length > 0 && (
            <p className="text-[10px] text-amber-400/50 mt-2">
              · Los horarios con punto naranja tienen citas confirmadas
            </p>
          )}
        </div>
      )}

      {/* No default slots message */}
      {!isAbsent && item.defaultSlots.length === 0 && (
        <div className="px-5 pb-4">
          <p className="text-cream/25 text-xs italic">
            No hay horario predeterminado para este día. Configura el horario semanal del barbero.
          </p>
        </div>
      )}

      {/* Absent message */}
      {isAbsent && (
        <div className="px-5 pb-4">
          <p className="text-red-400/50 text-xs italic">
            Marcado como ausente — no se mostrarán horarios a los clientes.
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="px-5 pb-4">
        <textarea
          value={local.notes}
          onChange={(e) => onSetNotes(e.target.value)}
          placeholder="Notas internas (opcional)…"
          rows={1}
          className="w-full bg-transparent border border-white/8 text-cream/60 text-xs px-3 py-2 resize-none focus:outline-none focus:border-gold/25 placeholder:text-cream/15 transition-colors"
        />
      </div>

      {/* Save adjusted changes */}
      {local.dirty && !isAbsent && (
        <div className="border-t border-white/6 px-5 py-3 flex items-center justify-between">
          <p className="text-cream/30 text-xs">Cambios sin guardar</p>
          <button
            onClick={onSave}
            disabled={saving}
            className="text-xs px-4 py-1.5 bg-gold text-dark font-semibold hover:bg-gold/90 transition-colors disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DailyScheduleStatus }) {
  if (status === 'confirmed') {
    return (
      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
        Confirmado
      </span>
    );
  }
  if (status === 'absent') {
    return (
      <span className="text-[10px] px-2 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 uppercase tracking-wider">
        Ausente
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400/80 border border-amber-500/20 uppercase tracking-wider">
      Sin confirmar
    </span>
  );
}

// ── Conflict warning modal ────────────────────────────────────────────────────

function ConflictWarningModal({
  modal,
  itemName,
  onConfirm,
  onCancel,
}: {
  modal: ConflictModal;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#1a1410] border border-amber-500/30 max-w-sm w-full p-6">
        <div className="flex items-start gap-3 mb-5">
          <WarningIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-cream text-sm font-semibold">Citas afectadas</h3>
            <p className="text-cream/50 text-xs mt-1">
              {itemName} tiene {modal.bookings.length} cita
              {modal.bookings.length > 1 ? 's' : ''} en los horarios que vas a eliminar.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {modal.bookings.map((b) => (
            <div key={b.id} className="flex items-center gap-3 bg-white/[0.03] px-3 py-2.5">
              <span className="text-gold font-semibold text-sm w-14 shrink-0">{b.time}</span>
              <div className="min-w-0">
                <p className="text-cream text-sm truncate">{b.clientName}</p>
                <p className="text-cream/40 text-xs">{b.clientPhone}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-amber-400/70 text-xs mb-5">
          Si continúas, estas citas se marcarán como canceladas automáticamente.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-white/15 text-cream/60 text-sm hover:text-cream hover:border-white/25 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 transition-colors"
          >
            Cancelar citas y guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

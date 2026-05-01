import { useEffect, useState, FormEvent } from 'react';
import AdminLayout from '../components/AdminLayout';
import { api, Barber, WeeklySchedule, ScheduleOverride, ALL_TIME_SLOTS } from '../lib/api';

const DAYS = [
  { value: 1, short: 'Lun', full: 'Lunes' },
  { value: 2, short: 'Mar', full: 'Martes' },
  { value: 3, short: 'Mié', full: 'Miércoles' },
  { value: 4, short: 'Jue', full: 'Jueves' },
  { value: 5, short: 'Vie', full: 'Viernes' },
  { value: 6, short: 'Sáb', full: 'Sábado' },
  { value: 0, short: 'Dom', full: 'Domingo' },
];

type WeekMap = Record<number, string[]>;

export default function AdminSchedule() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [weekMap, setWeekMap] = useState<WeekMap>({});
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [savingWeek, setSavingWeek] = useState(false);
  const [weekSaved, setWeekSaved] = useState(false);

  // Override form state
  const [ovDate, setOvDate] = useState('');
  const [ovSlots, setOvSlots] = useState<string[]>([]);
  const [ovReason, setOvReason] = useState('');
  const [ovDayOff, setOvDayOff] = useState(false);
  const [savingOv, setSavingOv] = useState(false);

  useEffect(() => {
    api.barbers.list().then((list) => {
      setBarbers(list.filter((b) => b.active));
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingWeek(true);
    Promise.all([
      api.schedules.getWeekly(selectedId),
      api.schedules.listOverrides(selectedId),
    ])
      .then(([weekly, ovs]) => {
        const map: WeekMap = {};
        DAYS.forEach((d) => { map[d.value] = []; });
        weekly.forEach((s: WeeklySchedule) => { map[s.dayOfWeek] = s.slots; });
        setWeekMap(map);
        setOverrides(ovs);
      })
      .finally(() => setLoadingWeek(false));
  }, [selectedId]);

  function toggleSlot(day: number, slot: string) {
    setWeekMap((prev) => {
      const current = prev[day] ?? [];
      return {
        ...prev,
        [day]: current.includes(slot)
          ? current.filter((s) => s !== slot)
          : [...current, slot].sort(),
      };
    });
    setWeekSaved(false);
  }

  function clearDay(day: number) {
    setWeekMap((prev) => ({ ...prev, [day]: [] }));
    setWeekSaved(false);
  }

  async function saveWeekly() {
    if (!selectedId) return;
    setSavingWeek(true);
    try {
      const data: WeeklySchedule[] = Object.entries(weekMap)
        .filter(([, slots]) => slots.length > 0)
        .map(([day, slots]) => ({ dayOfWeek: Number(day), slots }));
      await api.schedules.setWeekly(selectedId, data);
      setWeekSaved(true);
      setTimeout(() => setWeekSaved(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingWeek(false);
    }
  }

  function toggleOvSlot(slot: string) {
    setOvSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot].sort()
    );
  }

  async function submitOverride(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !ovDate) return;
    setSavingOv(true);
    try {
      const created = await api.schedules.upsertOverride(selectedId, {
        date: ovDate,
        slots: ovDayOff ? [] : ovSlots,
        reason: ovReason || undefined,
      });
      setOverrides((prev) => {
        const exists = prev.findIndex((o) => o.id === created.id);
        return exists >= 0
          ? prev.map((o, i) => (i === exists ? created : o))
          : [...prev, created].sort((a, b) => a.date.localeCompare(b.date));
      });
      setOvDate(''); setOvSlots([]); setOvReason(''); setOvDayOff(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar excepción');
    } finally {
      setSavingOv(false);
    }
  }

  async function deleteOverride(ov: ScheduleOverride) {
    if (!selectedId) return;
    try {
      await api.schedules.deleteOverride(selectedId, ov.id);
      setOverrides((prev) => prev.filter((o) => o.id !== ov.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  const currentSlots = weekMap[activeDay] ?? [];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline text-3xl text-cream">Horarios</h1>
          <p className="text-cream/40 text-sm mt-1">Configura el horario semanal y excepciones por fecha</p>
        </div>

        {/* Barber selector */}
        <div className="mb-8">
          <label className="block text-cream/60 text-xs tracking-wide uppercase mb-2">Barbero</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-base max-w-xs"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.avatar} {b.name}</option>
            ))}
          </select>
        </div>

        {loadingWeek ? (
          <p className="text-cream/30 text-sm py-8">Cargando horario…</p>
        ) : (
          <>
            {/* ── Weekly schedule ─────────────────────────────────────────── */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline text-lg text-cream/80">Horario semanal</h2>
                <button
                  onClick={saveWeekly}
                  disabled={savingWeek}
                  className={`text-sm px-4 py-2 font-semibold transition-colors ${
                    weekSaved
                      ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-600/30'
                      : 'bg-gold text-dark hover:bg-gold/90 disabled:opacity-50'
                  }`}
                >
                  {savingWeek ? 'Guardando…' : weekSaved ? '✓ Guardado' : 'Guardar horario'}
                </button>
              </div>

              {/* Day tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {DAYS.map((d) => {
                  const count = weekMap[d.value]?.length ?? 0;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setActiveDay(d.value)}
                      className={`flex-1 min-w-[52px] px-2 py-2.5 text-xs font-medium transition-colors relative ${
                        activeDay === d.value
                          ? 'bg-gold/15 text-gold border-b-2 border-gold'
                          : 'text-cream/50 hover:text-cream/80 border-b-2 border-transparent'
                      }`}
                    >
                      {d.short}
                      {count > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold/60" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day label + clear */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-cream/50 text-sm">
                  {DAYS.find((d) => d.value === activeDay)?.full} —{' '}
                  <span className="text-gold">{currentSlots.length} horarios</span>
                </p>
                {currentSlots.length > 0 && (
                  <button
                    onClick={() => clearDay(activeDay)}
                    className="text-cream/30 hover:text-red-400 text-xs transition-colors"
                  >
                    Limpiar día
                  </button>
                )}
              </div>

              {/* Slot grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                {ALL_TIME_SLOTS.map((slot) => {
                  const active = currentSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => toggleSlot(activeDay, slot)}
                      className={`py-2 text-xs font-mono font-medium border transition-all ${
                        active
                          ? 'bg-gold text-dark border-gold'
                          : 'bg-white/3 text-cream/40 border-white/8 hover:border-gold/40 hover:text-cream/70'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Date overrides ───────────────────────────────────────────── */}
            <section>
              <h2 className="font-headline text-lg text-cream/80 mb-4">Excepciones de fecha</h2>

              {/* Add override form */}
              <form onSubmit={submitOverride} className="border border-white/10 p-5 bg-white/[0.02] mb-5">
                <p className="text-cream/60 text-xs tracking-wide uppercase mb-4">Nueva excepción</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-cream/50 text-xs mb-1.5">Fecha</label>
                    <input
                      type="date"
                      value={ovDate}
                      onChange={(e) => setOvDate(e.target.value)}
                      className="input-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-cream/50 text-xs mb-1.5">Razón (opcional)</label>
                    <input
                      type="text"
                      value={ovReason}
                      onChange={(e) => setOvReason(e.target.value)}
                      placeholder="Vacaciones, feriado…"
                      className="input-base"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ovDayOff}
                    onChange={(e) => setOvDayOff(e.target.checked)}
                    className="w-4 h-4 accent-gold"
                  />
                  <span className="text-cream/60 text-sm">Día libre (sin citas)</span>
                </label>

                {!ovDayOff && (
                  <div className="mb-4">
                    <p className="text-cream/50 text-xs mb-2">
                      Horarios disponibles ese día —{' '}
                      <span className="text-gold">{ovSlots.length} seleccionados</span>
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                      {ALL_TIME_SLOTS.map((slot) => {
                        const sel = ovSlots.includes(slot);
                        return (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => toggleOvSlot(slot)}
                            className={`py-2 text-xs font-mono font-medium border transition-all ${
                              sel
                                ? 'bg-gold text-dark border-gold'
                                : 'bg-white/3 text-cream/40 border-white/8 hover:border-gold/40 hover:text-cream/70'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingOv || !ovDate || (!ovDayOff && ovSlots.length === 0)}
                  className="bg-gold text-dark font-semibold text-sm px-5 py-2.5 hover:bg-gold/90 disabled:opacity-40 transition-colors"
                >
                  {savingOv ? 'Guardando…' : 'Guardar excepción'}
                </button>
              </form>

              {/* Existing overrides */}
              {overrides.length === 0 ? (
                <p className="text-cream/25 text-sm py-4 text-center">Sin excepciones registradas</p>
              ) : (
                <div className="space-y-2">
                  {overrides.map((ov) => (
                    <div
                      key={ov.id}
                      className="flex items-center gap-4 px-4 py-3 border border-white/8"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-cream text-sm font-mono">
                          {ov.date.split('T')[0]}
                          {ov.reason && (
                            <span className="ml-2 text-cream/40 font-sans text-xs">— {ov.reason}</span>
                          )}
                        </p>
                        <p className="text-cream/40 text-xs mt-0.5">
                          {ov.slots.length === 0
                            ? 'Día libre'
                            : `${ov.slots.length} horarios: ${ov.slots.slice(0, 4).join(', ')}${ov.slots.length > 4 ? '…' : ''}`}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteOverride(ov)}
                        className="text-cream/25 hover:text-red-400 text-xs transition-colors shrink-0"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

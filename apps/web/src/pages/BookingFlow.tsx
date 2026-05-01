import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, Barber, Booking, formatDateES } from '../lib/api';
import BarberCard from '../components/BarberCard';
import DatePicker from '../components/DatePicker';
import TimeSlots from '../components/TimeSlots';
import BookingConfirmation from '../components/BookingConfirmation';

type Step = 'service' | 'barber' | 'datetime' | 'contact' | 'confirmed';
type ServiceType = 'barberia' | 'salon';

// Image paths — served from public/images/
const IMG = {
  hero:     '/images/mainpicture.png',
  interior: '/images/ChatGPT Image Apr 24, 2026, 12_38_05 PM.png',
  tools:    '/images/ChatGPT Image Apr 24, 2026, 12_40_25 PM.png',
  collage:  '/images/ChatGPT Image Apr 24, 2026, 12_33_51 PM.png',
  barber1:  '/images/ChatGPT Image Apr 24, 2026, 12_39_10 PM.png',
};

const BARBER_IMGS = [
  { src: IMG.barber1, position: 'center 18%' },
  { src: IMG.collage, position: '40.5% 15%' },
  { src: IMG.collage, position: '38.5% 84%' },
];

export default function BookingFlow() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  const [step, setStep]                     = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [barbers, setBarbers]               = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate]     = useState<string | null>(null);
  const [slots, setSlots]                   = useState<string[]>([]);
  const [slotsConfirmed, setSlotsConfirmed] = useState<boolean>(true);
  const [selectedTime, setSelectedTime]     = useState<string | null>(null);
  const [clientName, setClientName]         = useState('');
  const [clientPhone, setClientPhone]       = useState('');
  const [notes, setNotes]                   = useState('');
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Fetch barbers when entering the barber step (after service is chosen)
  useEffect(() => {
    if (!tenantSlug || !selectedService) return;
    let cancelled = false;
    setLoadingBarbers(true);
    api.barbers
      .listPublic(tenantSlug, selectedService)
      .then((data) => { if (!cancelled) setBarbers(data); })
      .catch(() => { if (!cancelled) setError('No se pudo cargar la información del negocio'); })
      .finally(() => { if (!cancelled) setLoadingBarbers(false); });
    return () => { cancelled = true; };
  }, [tenantSlug, selectedService]);

  useEffect(() => {
    if (!selectedBarber || !selectedDate) { setSlots([]); setSlotsConfirmed(true); return; }
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime(null);
    api.schedules
      .getAvailable(selectedBarber.id, selectedDate)
      .then((data) => {
        if (!cancelled) {
          setSlots(data.slots);
          setSlotsConfirmed(data.confirmed);
        }
      })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [selectedBarber, selectedDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantSlug || !selectedBarber || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api.bookings.create({
        tenantSlug,
        barberId: selectedBarber.id,
        date: selectedDate,
        time: selectedTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        notes: notes.trim() || undefined,
      });
      setConfirmedBooking(booking);
      setStep('confirmed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la reserva');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep('service');
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setClientName('');
    setClientPhone('');
    setNotes('');
    setError(null);
    setConfirmedBooking(null);
    setSlots([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goTo(s: Step) {
    setError(null);
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const stepIndex = step === 'service' ? 0 : step === 'barber' ? 1 : step === 'datetime' ? 2 : 3;

  // ── CONFIRMED ───────────────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmedBooking && selectedBarber) {
    return <BookingConfirmation booking={confirmedBooking} barber={selectedBarber} onNew={reset} />;
  }

  // ── STEP 0: SERVICE SELECTION — hero layout ──────────────────────────────────
  if (step === 'service') {
    return (
      <div className="min-h-screen bg-dark">
        <div
          className="relative flex flex-col justify-end bg-cover bg-center"
          style={{
            backgroundImage: `url("${IMG.hero}")`,
            minHeight: 'max(65vh, 420px)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-dark/75 via-transparent to-dark" />
          <div className="relative z-10 px-6 pb-10 pt-16">
            <p className="text-gold/60 text-[10px] uppercase tracking-[0.35em] mb-4">
              — Heredia · Costa Rica —
            </p>
            <h1 className="font-headline text-[4.25rem] leading-[0.95] text-cream italic mb-5">
              Diamond<br />Studio
            </h1>
            <div className="w-10 h-px bg-gold mb-4" />
            <p className="text-cream/40 text-xs uppercase tracking-[0.2em]">
              El arte del corte perfecto
            </p>
          </div>
        </div>

        {/* Step dashes */}
        <div className="flex items-center justify-center gap-2 py-7">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-px transition-all duration-300 ${
                i === 0 ? 'w-8 bg-gold' : 'w-3 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Service selection */}
        <div className="px-5 pb-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-headline text-2xl text-cream">¿Qué servicio deseas?</h2>
            <span className="text-cream/25 text-[10px] uppercase tracking-widest">01 / 04</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Barbería card */}
            <button
              onClick={() => setSelectedService('barberia')}
              className={`flex flex-col items-start p-5 border transition-all text-left ${
                selectedService === 'barberia'
                  ? 'border-gold bg-gold/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <img src="/images/barber_icon_luxury (1).svg" alt="" className="w-14 h-14 mb-3" />
              <span className="font-headline text-lg text-cream leading-tight">Barbería</span>
              <span className="text-cream/40 text-xs mt-1.5 leading-relaxed">
                Cortes, degradados y barba
              </span>
            </button>

            {/* Salón de Uñas card */}
            <button
              onClick={() => setSelectedService('salon')}
              className={`flex flex-col items-start p-5 border transition-all text-left ${
                selectedService === 'salon'
                  ? 'border-[#B76E79] bg-[#B76E79]/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <img src="/images/nail_salon_icon_luxury.svg" alt="" className="w-14 h-14 mb-3" />
              <span className="font-headline text-lg text-cream leading-tight">Salón de Uñas</span>
              <span className="text-cream/40 text-xs mt-1.5 leading-relaxed">
                Manicure, pedicure y nail art
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedBarber(null);
              goTo('barber');
            }}
            disabled={!selectedService}
            className="mt-8 w-full py-4 bg-gold text-dark text-[11px] font-semibold uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 1: BARBER — hero layout ────────────────────────────────────────────
  if (step === 'barber') {
    const barberLabel = selectedService === 'salon' ? 'Nuestras estilistas' : 'Nuestros barberos';
    return (
      <div className="min-h-screen bg-dark">
        {/* Hero banner */}
        <div
          className="relative flex flex-col justify-end bg-cover bg-center"
          style={{
            backgroundImage: `url("${IMG.hero}")`,
            minHeight: 'max(65vh, 420px)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-dark/75 via-transparent to-dark" />
          <div className="relative z-10 px-6 pb-10 pt-16">
            <p className="text-gold/60 text-[10px] uppercase tracking-[0.35em] mb-4">
              — Heredia · Costa Rica —
            </p>
            <h1 className="font-headline text-[4.25rem] leading-[0.95] text-cream italic mb-5">
              Diamond<br />Studio
            </h1>
            <div className="w-10 h-px bg-gold mb-4" />
            <p className="text-cream/40 text-xs uppercase tracking-[0.2em]">
              El arte del corte perfecto
            </p>
          </div>
        </div>

        {/* Back + step dashes */}
        <div className="flex items-center justify-between px-5 py-6">
          <button
            onClick={() => goTo('service')}
            className="flex items-center gap-1.5 text-cream/35 hover:text-cream transition-colors text-xs uppercase tracking-wider"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Atrás
          </button>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-px transition-all duration-300 ${
                  i < 1 ? 'w-4 bg-gold/50' :
                  i === 1 ? 'w-6 bg-gold' :
                  'w-2.5 bg-white/12'
                }`}
              />
            ))}
          </div>
          <div className="w-12" />
        </div>

        {/* Barber selection */}
        <div className="px-5 pb-16">
          {error && (
            <p className="mb-6 text-sm text-red-400 border border-red-500/20 bg-red-500/5 px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-headline text-2xl text-cream">{barberLabel}</h2>
            <span className="text-cream/25 text-[10px] uppercase tracking-widest">02 / 04</span>
          </div>

          {loadingBarbers ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white/[0.04] animate-pulse" style={{ height: 280 }} />
              ))}
            </div>
          ) : barbers.length === 0 ? (
            <p className="text-cream/30 text-sm py-12 text-center">
              No hay profesionales disponibles en este momento.
            </p>
          ) : (
            <div className="space-y-4">
              {barbers.map((b, i) => {
                const img = BARBER_IMGS[i % BARBER_IMGS.length];
                return (
                  <BarberCard
                    key={b.id}
                    barber={b}
                    imageSrc={img.src}
                    imagePosition={img.position}
                    selected={selectedBarber?.id === b.id}
                    onClick={() => setSelectedBarber(b)}
                  />
                );
              })}
            </div>
          )}

          <button
            onClick={() => goTo('datetime')}
            disabled={!selectedBarber}
            className="mt-8 w-full py-4 bg-gold text-dark text-[11px] font-semibold uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  // ── STEPS 2 & 3 — compact layout ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark flex flex-col">

      {/* Compact sticky header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 bg-dark">
        <button
          onClick={() => goTo(step === 'datetime' ? 'barber' : 'datetime')}
          className="flex items-center gap-1.5 text-cream/35 hover:text-cream transition-colors text-xs uppercase tracking-wider"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Atrás
        </button>

        <span className="font-headline italic text-gold text-lg absolute left-1/2 -translate-x-1/2">
          Diamond Studio
        </span>

        {/* Step dashes */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-px transition-all duration-300 ${
                i < stepIndex ? 'w-4 bg-gold/50' :
                i === stepIndex ? 'w-6 bg-gold' :
                'w-2.5 bg-white/12'
              }`}
            />
          ))}
        </div>
      </header>

      {/* ── STEP 2: Date & time ── */}
      {step === 'datetime' && (
        <main className="flex-1">
          <div
            className="relative flex items-end px-6 py-8 bg-cover bg-center"
            style={{ backgroundImage: `url("${IMG.interior}")`, minHeight: 132 }}
          >
            <div className="absolute inset-0 bg-dark/82" />
            <div className="relative z-10">
              <p className="text-gold/55 text-[10px] uppercase tracking-[0.3em] mb-1.5">03 / 04</p>
              <h2 className="font-headline text-[2rem] italic text-cream leading-tight">
                Elige tu fecha
              </h2>
            </div>
          </div>

          <div className="px-5 pt-7 pb-16">
            {error && (
              <p className="mb-6 text-sm text-red-400 border border-red-500/20 bg-red-500/5 px-4 py-3">
                {error}
              </p>
            )}

            <DatePicker
              selected={selectedDate}
              onChange={(d) => { setSelectedDate(d); setSelectedTime(null); }}
            />

            {selectedDate && (
              <div className="mt-9 bg-gradient-to-b from-[#141210] to-transparent border-t border-gold/[0.08] pt-7 -mx-5 px-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-4 h-px bg-gold/60" />
                  <p className="text-[10px] text-cream/30 uppercase tracking-[0.25em]">
                    Horarios — {(() => {
                      const s = formatDateES(selectedDate);
                      return s.charAt(0).toUpperCase() + s.slice(1);
                    })()}
                  </p>
                </div>
                <TimeSlots
                  slots={slots}
                  selected={selectedTime}
                  onSelect={setSelectedTime}
                  loading={loadingSlots}
                />
                {!slotsConfirmed && slots.length > 0 && !loadingSlots && (
                  <p className="mt-3 text-amber-400/60 text-[11px] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Horario sujeto a confirmación
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => goTo('contact')}
              disabled={!selectedDate || !selectedTime}
              className="mt-8 w-full py-4 bg-gold text-dark text-[11px] font-semibold uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
            >
              Continuar
            </button>
          </div>
        </main>
      )}

      {/* ── STEP 3: Contact details ── */}
      {step === 'contact' && (
        <main className="flex-1">
          <div
            className="relative flex items-end px-6 py-8 bg-cover bg-center"
            style={{ backgroundImage: `url("${IMG.tools}")`, minHeight: 132 }}
          >
            <div className="absolute inset-0 bg-dark/88" />
            <div className="relative z-10">
              <p className="text-gold/55 text-[10px] uppercase tracking-[0.3em] mb-1.5">04 / 04</p>
              <h2 className="font-headline text-[2rem] italic text-cream leading-tight">
                Tus datos
              </h2>
            </div>
          </div>

          <div className="px-5 pt-7 pb-16">
            {error && (
              <p className="mb-6 text-sm text-red-400 border border-red-500/20 bg-red-500/5 px-4 py-3">
                {error}
              </p>
            )}

            {selectedBarber && selectedDate && selectedTime && (
              <div className="mb-8 border-l border-gold pl-4">
                <p className="text-[10px] text-cream/30 uppercase tracking-[0.2em] mb-2">
                  Tu reserva
                </p>
                <p className="font-headline text-xl text-cream">{selectedBarber.name}</p>
                <p className="text-cream/40 text-sm mt-0.5">
                  {(() => {
                    const s = formatDateES(selectedDate);
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  })()} · {selectedTime}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div>
                <label className="block text-[10px] text-cream/30 uppercase tracking-[0.2em] mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                  autoComplete="name"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-[10px] text-cream/30 uppercase tracking-[0.2em] mb-2">
                  WhatsApp / Teléfono *
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej: 8888-8888"
                  required
                  minLength={8}
                  autoComplete="tel"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-[10px] text-cream/30 uppercase tracking-[0.2em] mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Corte especial, indicaciones, etc."
                  rows={3}
                  className="input-base resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !clientName.trim() || clientPhone.trim().length < 8}
                className="w-full py-4 bg-gold text-dark text-[11px] font-semibold uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
              >
                {submitting ? 'Reservando…' : 'Confirmar reserva'}
              </button>
            </form>
          </div>
        </main>
      )}
    </div>
  );
}

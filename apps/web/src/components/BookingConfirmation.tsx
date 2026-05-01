import { Barber, Booking, formatDateES } from '../lib/api';

const HERO_IMG = '/images/ChatGPT Image Apr 24, 2026, 12_32_25 PM.png';

interface Props {
  booking: Booking;
  barber: Barber;
  onNew: () => void;
}

export default function BookingConfirmation({ booking, barber, onNew }: Props) {
  const dateStr = booking.date.split('T')[0];

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Hero success section */}
      <div
        className="relative flex flex-col justify-end bg-cover bg-center"
        style={{
          backgroundImage: `url("${HERO_IMG}")`,
          minHeight: '52vh',
        }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark/50 via-dark/30 to-dark" />

        <div className="relative z-10 px-6 pb-10">
          {/* Check mark */}
          <div className="w-11 h-11 border border-gold flex items-center justify-center mb-6">
            <svg
              className="w-5 h-5 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <p className="text-gold/70 text-[10px] uppercase tracking-[0.3em] mb-3">
            Reserva confirmada
          </p>
          <h2 className="font-headline text-[3.25rem] leading-[1.05] italic text-cream">
            ¡Nos vemos<br />pronto!
          </h2>
        </div>
      </div>

      {/* Appointment details */}
      <div className="flex-1 px-6 pt-8 pb-12">
        {/* Gold rule */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-8 h-px bg-gold" />
          <p className="text-[10px] text-cream/30 uppercase tracking-[0.25em]">Tu cita</p>
        </div>

        <div className="space-y-5">
          <DetailRow label="Barbero" value={barber.name} />
          <div className="h-px bg-white/5" />
          <DetailRow label="Fecha" value={formatDateES(dateStr)} firstCap />
          <div className="h-px bg-white/5" />
          <DetailRow label="Hora" value={booking.time} />
          <div className="h-px bg-white/5" />
          <DetailRow label="Cliente" value={booking.clientName} />
          <div className="h-px bg-white/5" />
          <DetailRow label="Teléfono" value={booking.clientPhone} />
          {booking.notes && (
            <>
              <div className="h-px bg-white/5" />
              <DetailRow label="Notas" value={booking.notes} />
            </>
          )}
        </div>

        <p className="mt-8 text-cream/25 text-xs leading-relaxed">
          Guarda este horario. Si necesitas cancelar,<br />
          contáctanos por WhatsApp.
        </p>

        <button
          onClick={onNew}
          className="mt-8 w-full py-4 border border-white/10 text-cream/50 text-sm uppercase tracking-[0.15em] hover:border-gold/40 hover:text-cream transition-colors"
        >
          Nueva reserva
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, firstCap }: { label: string; value: string; firstCap?: boolean }) {
  const display = firstCap && value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] text-cream/30 uppercase tracking-[0.2em] shrink-0">{label}</span>
      <span className="text-cream text-sm text-right">{display}</span>
    </div>
  );
}

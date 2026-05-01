import { useState } from 'react';

interface Props {
  selected: string | null;
  onChange: (date: string) => void;
}

const DAYS_ES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DatePicker({ selected, onChange }: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const today = todayStr();

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset         = (firstDayOfWeek + 6) % 7; // Monday-first

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canGoPrev =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDay(day: number) {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (d < today) return;
    onChange(d);
  }

  return (
    <div className="bg-[#141210] border border-gold/[0.12] p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-9 h-9 flex items-center justify-center text-cream/30 hover:text-cream disabled:opacity-10 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="text-center">
          <span className="font-headline text-lg italic text-cream capitalize">
            {MONTHS_ES[viewMonth]}
          </span>
          <span className="text-cream/30 text-sm ml-2">{viewYear}</span>
        </div>

        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center text-cream/30 hover:text-cream transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-white/5 pb-2 mb-1">
        {DAYS_ES.map((d, i) => (
          <div
            key={i}
            className="h-7 flex items-center justify-center text-[10px] text-cream/20 uppercase tracking-widest"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid — explicit h-12 (48px) per cell, no aspect-ratio */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="h-12" />;

          const dateStr  = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPast   = dateStr < today;
          const isToday  = dateStr === today;
          const isSelected = dateStr === selected;

          return (
            <button
              key={i}
              onClick={() => handleDay(day)}
              disabled={isPast}
              className={[
                'h-12 w-full flex items-center justify-center text-sm transition-colors',
                isPast
                  ? 'opacity-25 cursor-not-allowed pointer-events-none'
                  : 'cursor-pointer',
                isSelected
                  ? 'bg-gold text-dark font-semibold'
                  : isToday
                  ? 'text-gold hover:bg-[#1a1714]'
                  : !isPast
                  ? 'text-cream/75 hover:text-gold hover:bg-[#1a1714]'
                  : 'text-cream/75',
              ].filter(Boolean).join(' ')}
            >
              <span
                className={
                  isToday && !isSelected
                    ? 'underline underline-offset-2 decoration-gold/40'
                    : ''
                }
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

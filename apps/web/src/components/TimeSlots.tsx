interface Props {
  slots: string[];
  selected: string | null;
  onSelect: (time: string) => void;
  loading?: boolean;
}

export default function TimeSlots({ slots, selected, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-cream/30 text-sm">No hay horarios disponibles</p>
        <p className="text-cream/20 text-xs mt-1">Selecciona otra fecha</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((slot) => (
        <button
          key={slot}
          onClick={() => onSelect(slot)}
          className={`py-3 text-sm tracking-wide transition-all duration-150 ${
            selected === slot
              ? 'bg-gold text-dark font-semibold'
              : 'border border-white/10 text-cream/60 hover:border-gold/40 hover:text-cream'
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}

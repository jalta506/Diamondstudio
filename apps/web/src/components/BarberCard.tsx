import { Barber } from '../lib/api';

interface Props {
  barber: Barber;
  imageSrc: string;
  imagePosition: string;
  selected: boolean;
  onClick: () => void;
}

export default function BarberCard({ barber, imageSrc, imagePosition, selected, onClick }: Props) {
  return (
    <div className="relative">
      {/* Gold left-edge selection indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 z-20 transition-colors duration-300"
        style={{ backgroundColor: selected ? '#D4AF37' : 'transparent' }}
      />

      <button
        onClick={onClick}
        className="relative w-full text-left overflow-hidden block focus:outline-none"
        style={{ height: 280 }}
      >
        {/* Barber photo */}
        <img
          src={imageSrc}
          alt={barber.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          style={{ objectPosition: imagePosition }}
        />

        {/* Base gradient — always present */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/50 to-dark/10" />

        {/* Selection tint */}
        {selected && (
          <div className="absolute inset-0 bg-gold/10 transition-opacity duration-300" />
        )}

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              {barber.specialty && (
                <p className="text-gold/80 text-[10px] uppercase tracking-[0.25em] mb-1.5">
                  {barber.specialty}
                </p>
              )}
              <h3 className="font-headline text-[1.6rem] leading-tight text-cream">
                {barber.name}
              </h3>
            </div>

            <div
              className="shrink-0 w-9 h-9 flex items-center justify-center border transition-colors duration-300"
              style={{ borderColor: selected ? '#D4AF37' : 'rgba(255,255,255,0.2)' }}
            >
              {selected ? (
                <svg
                  className="w-4 h-4 text-gold"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-cream/25"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

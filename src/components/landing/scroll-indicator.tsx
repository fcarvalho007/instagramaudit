export function ScrollIndicator() {
  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10"
      aria-hidden="true"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-content-tertiary">
        Explorar
      </span>
      <span className="scroll-indicator-line block h-8 w-px bg-content-tertiary origin-top" />
      <style>{`
        .scroll-indicator-line {
          animation: scroll-pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes scroll-pulse {
          0%, 100% { opacity: 0.25; transform: scaleY(0.6); }
          50%      { opacity: 1;    transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-indicator-line { animation: none; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

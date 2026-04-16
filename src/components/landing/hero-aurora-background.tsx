export function HeroAuroraBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="aurora-blob aurora-blob-5" />

      <div className="absolute inset-0 aurora-noise opacity-[0.04]" />
      <div className="absolute inset-0 aurora-vignette" />

      <style>{`
        @keyframes aurora-float-1 {
          0%, 100% { transform: translate3d(-10%, -10%, 0) scale(1); }
          33%      { transform: translate3d(30%, 20%, 0) scale(1.2); }
          66%      { transform: translate3d(-20%, 40%, 0) scale(0.9); }
        }
        @keyframes aurora-float-2 {
          0%, 100% { transform: translate3d(40%, -20%, 0) scale(1.1); }
          50%      { transform: translate3d(-30%, 30%, 0) scale(1.3); }
        }
        @keyframes aurora-float-3 {
          0%, 100% { transform: translate3d(0%, 0%, 0) scale(1); }
          50%      { transform: translate3d(-40%, -30%, 0) scale(1.15); }
        }
        @keyframes aurora-float-4 {
          0%, 100% { transform: translate3d(20%, 30%, 0) scale(0.9); }
          50%      { transform: translate3d(-10%, -20%, 0) scale(1.2); }
        }
        @keyframes aurora-float-5 {
          0%, 100% { transform: translate3d(-30%, 20%, 0) scale(1); }
          50%      { transform: translate3d(30%, -30%, 0) scale(1.4); }
        }

        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.55;
          mix-blend-mode: screen;
          will-change: transform;
        }

        .aurora-blob-1 {
          width: 600px; height: 600px; top: 10%; left: 10%;
          background: radial-gradient(circle, rgb(6 182 212 / 0.9), transparent 70%);
          animation: aurora-float-1 30s ease-in-out infinite;
        }
        .aurora-blob-2 {
          width: 500px; height: 500px; top: 20%; right: 10%;
          background: radial-gradient(circle, rgb(103 232 249 / 0.7), transparent 70%);
          animation: aurora-float-2 35s ease-in-out infinite;
        }
        .aurora-blob-3 {
          width: 700px; height: 700px; bottom: 10%; left: 30%;
          background: radial-gradient(circle, rgb(6 182 212 / 0.5), transparent 70%);
          animation: aurora-float-3 40s ease-in-out infinite;
        }
        .aurora-blob-4 {
          width: 400px; height: 400px; top: 40%; left: 50%;
          background: radial-gradient(circle, rgb(103 232 249 / 0.5), transparent 70%);
          animation: aurora-float-4 28s ease-in-out infinite;
        }
        .aurora-blob-5 {
          width: 550px; height: 550px; bottom: 20%; right: 20%;
          background: radial-gradient(circle, rgb(6 182 212 / 0.4), transparent 70%);
          animation: aurora-float-5 45s ease-in-out infinite;
        }

        .aurora-noise {
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
          mix-blend-mode: overlay;
        }

        .aurora-vignette {
          background: radial-gradient(ellipse at center,
                      transparent 40%,
                      rgb(10 14 26 / 0.8) 100%);
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-blob { animation: none; }
        }
      `}</style>
    </div>
  );
}

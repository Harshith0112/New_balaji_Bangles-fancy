import { useState, useEffect } from 'react';

const SPLASH_KEY = 'nbf-splash-seen';
const DURATION_MS = 3200;

export default function LaunchScreen({ onFinish }) {
  const [visible, setVisible] = useState(true);
  const [skip, setSkip] = useState(false);
  const [phase, setPhase] = useState('throw'); // throw -> hold -> exit

  useEffect(() => {
    const seen = sessionStorage.getItem(SPLASH_KEY);
    if (seen === '1') {
      setSkip(true);
      onFinish?.();
      return;
    }

    const t1 = setTimeout(() => setPhase('hold'), 1600);
    const t2 = setTimeout(() => {
      setPhase('exit');
    }, DURATION_MS - 600);
    const t3 = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, '1');
      setVisible(false);
      onFinish?.();
    }, DURATION_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  if (skip || !visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-rose-950 via-rose-900 to-rose-950 transition-opacity duration-700 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      {/* Decorative items thrown in from corners */}
      <Earring className="launch-item earring-1" />
      <Earring className="launch-item earring-2" />
      <MakeupBrush className="launch-item brush-1" />
      <MakeupBrush className="launch-item brush-2" />
      <Lipstick className="launch-item lipstick-1" />
      <Lipstick className="launch-item lipstick-2" />
      <Compact className="launch-item compact-1" />
      <Bottle className="launch-item bottle-1" />
      <Bangle className="launch-item bangle-1" />
      <Ring className="launch-item ring-1" />
      <Necklace className="launch-item necklace-1" />
      <HairClip className="launch-item clip-1" />
      <Sparkle className="launch-item sparkle-1" />
      <Sparkle className="launch-item sparkle-2" />

      {/* Central logo */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center transition-transform duration-700 ${
          phase === 'throw' ? 'scale-90' : phase === 'hold' ? 'scale-100' : 'scale-110'
        }`}
      >
        <img
          src="/logo.png"
          alt="New Balaji Bangles and Fancy"
          className="w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 rounded-full object-cover shadow-2xl ring-4 ring-rose-400/30"
        />
        <p className="mt-4 font-display text-lg sm:text-xl text-rose-200 font-medium tracking-wide">
          Cosmetics • Jewels • Accessories
        </p>
      </div>

      <style>{`
        .launch-item {
          position: absolute;
          width: 48px;
          height: 48px;
          opacity: 0.9;
          animation: throw-in 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          pointer-events: none;
        }
        .earring-1 { left: 12%; top: 18%; animation-delay: 0.1s; }
        .earring-2 { right: 14%; top: 22%; animation-delay: 0.2s; transform: scaleX(-1); }
        .brush-1 { left: 10%; bottom: 20%; animation-delay: 0.25s; }
        .brush-2 { right: 12%; bottom: 18%; animation-delay: 0.35s; transform: scaleX(-1); }
        .lipstick-1 { left: 18%; top: 50%; animation-delay: 0.15s; }
        .lipstick-2 { right: 20%; top: 48%; animation-delay: 0.3s; transform: scaleX(-1); }
        .compact-1 { left: 50%; top: 8%; animation-delay: 0.2s; transform: translateX(-50%); }
        .bottle-1 { right: 50%; bottom: 10%; animation-delay: 0.28s; transform: translateX(50%); }
        .bangle-1 { left: 8%; top: 42%; animation-delay: 0.18s; }
        .ring-1 { right: 10%; top: 40%; animation-delay: 0.22s; }
        .necklace-1 { left: 22%; top: 8%; animation-delay: 0.12s; }
        .clip-1 { right: 24%; top: 10%; animation-delay: 0.26s; }
        .sparkle-1 { left: 14%; bottom: 28%; animation-delay: 0.32s; }
        .sparkle-2 { right: 16%; bottom: 26%; animation-delay: 0.38s; }

        @keyframes throw-in {
          0% {
            opacity: 0;
            transform: translate(var(--tx, 0), var(--ty, 0)) scale(0.3) rotate(var(--r, 0deg));
          }
          60% {
            opacity: 0.95;
          }
          100% {
            opacity: 0.85;
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
        }
        .earring-1 { --tx: -80px; --ty: -60px; --r: -25deg; }
        .earring-2 { --tx: 80px; --ty: -50px; --r: 25deg; }
        .brush-1 { --tx: -70px; --ty: 70px; --r: 15deg; }
        .brush-2 { --tx: 70px; --ty: 65px; --r: -15deg; }
        .lipstick-1 { --tx: -90px; --ty: 0; --r: -20deg; }
        .lipstick-2 { --tx: 90px; --ty: 0; --r: 20deg; }
        .compact-1 { --tx: 0; --ty: -70px; --r: 10deg; }
        .bottle-1 { --tx: 0; --ty: 70px; --r: -10deg; }
        .bangle-1 { --tx: -75px; --ty: -20px; --r: -18deg; }
        .ring-1 { --tx: 75px; --ty: -25px; --r: 18deg; }
        .necklace-1 { --tx: -55px; --ty: -65px; --r: 8deg; }
        .clip-1 { --tx: 60px; --ty: -60px; --r: -12deg; }
        .sparkle-1 { --tx: -65px; --ty: 55px; --r: 15deg; }
        .sparkle-2 { --tx: 68px; --ty: 50px; --r: -15deg; }
      `}</style>
    </div>
  );
}

function Earring({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id="earring-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="14" r="6" fill="url(#earring-gold)" stroke="#fef3c7" strokeWidth="1" />
        <path d="M24 20 v18 Q24 42 20 42 Q16 42 16 38 V20" fill="url(#earring-gold)" stroke="#fef3c7" strokeWidth="1" />
        <circle cx="24" cy="14" r="2" fill="rgba(255,255,255,0.5)" />
      </svg>
    </div>
  );
}

function MakeupBrush({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id="brush-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path d="M14 8 L14 38 Q14 44 24 44 Q34 44 34 38 L34 8" fill="url(#brush-gold)" stroke="#fef3c7" strokeWidth="1" />
        <ellipse cx="24" cy="10" rx="10" ry="4" fill="#c4b5fd" />
        <ellipse cx="24" cy="10" rx="6" ry="2.5" fill="#a78bfa" />
      </svg>
    </div>
  );
}

function Lipstick({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <rect x="18" y="4" width="12" height="32" rx="2" fill="#e11d48" stroke="#f43f5e" strokeWidth="1" />
        <rect x="18" y="2" width="12" height="6" rx="1" fill="#9f1239" />
        <path d="M20 36 L24 44 L28 36 Z" fill="#fda4af" />
        <rect x="22" y="34" width="4" height="4" fill="#e11d48" />
      </svg>
    </div>
  );
}

function Compact({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <rect x="8" y="12" width="32" height="24" rx="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="1" />
        <circle cx="24" cy="24" r="8" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
        <rect x="8" y="10" width="32" height="4" rx="1" fill="#b45309" />
      </svg>
    </div>
  );
}

function Bottle({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <path d="M20 6 L20 10 Q20 14 24 14 Q28 14 28 10 L28 6" fill="#a78bfa" stroke="#8b5cf6" strokeWidth="1" />
        <rect x="18" y="14" width="12" height="28" rx="2" fill="rgba(167,139,250,0.6)" stroke="#8b5cf6" strokeWidth="1" />
        <rect x="20" y="18" width="8" height="20" rx="1" fill="rgba(255,255,255,0.2)" />
      </svg>
    </div>
  );
}

function Bangle({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id="bangle-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path d="M8 24 A 16 16 0 0 1 40 24" stroke="url(#bangle-gold)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M10 24 A 14 14 0 0 1 38 24" stroke="#fef3c7" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    </div>
  );
}

function Ring({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id="ring-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="10" stroke="url(#ring-gold)" strokeWidth="4" fill="none" />
        <circle cx="24" cy="24" r="6" fill="#e11d48" stroke="#f43f5e" strokeWidth="0.8" />
        <circle cx="24" cy="24" r="3" fill="rgba(255,255,255,0.4)" />
      </svg>
    </div>
  );
}

function Necklace({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id="necklace-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path d="M24 8 Q14 18 14 28 Q14 34 24 38 Q34 34 34 28 Q34 18 24 8" stroke="url(#necklace-gold)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="28" r="5" fill="#e11d48" stroke="#f43f5e" strokeWidth="0.8" />
        <circle cx="24" cy="28" r="2" fill="rgba(255,255,255,0.5)" />
      </svg>
    </div>
  );
}

function HairClip({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id="clip-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path d="M12 14 L36 14 L32 34 Q24 42 16 34 L12 14" fill="url(#clip-gold)" stroke="#fef3c7" strokeWidth="1" />
        <circle cx="24" cy="16" r="4" fill="#c4b5fd" stroke="#a78bfa" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

function Sparkle({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id="sparkle-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path d="M24 4 L26 18 L24 22 L22 18 Z" fill="url(#sparkle-gold)" />
        <path d="M24 26 L26 44 L24 40 L22 44 Z" fill="url(#sparkle-gold)" />
        <path d="M4 24 L18 26 L22 24 L18 22 Z" fill="url(#sparkle-gold)" />
        <path d="M26 24 L44 26 L40 24 L44 22 Z" fill="url(#sparkle-gold)" />
        <circle cx="24" cy="24" r="3" fill="url(#sparkle-gold)" />
      </svg>
    </div>
  );
}

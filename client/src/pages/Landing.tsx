const TESTFLIGHT_URL = 'https://testflight.apple.com/join/DpQ4UtKE';

function BackgroundRanges() {
  return (
    <svg
      viewBox="0 0 1000 400"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 w-full h-64 sm:h-80"
    >
      <polygon
        points="0,400 0,220 120,140 260,190 380,90 500,160 640,70 760,150 880,110 1000,180 1000,400"
        fill="rgba(15,45,90,0.45)"
      />
      <polygon
        points="0,400 0,270 100,210 220,250 340,170 460,230 600,150 720,220 840,190 1000,240 1000,400"
        fill="rgba(8,28,60,0.7)"
      />
      <polygon
        points="0,400 0,320 90,290 210,320 330,260 450,300 590,250 710,290 830,270 1000,300 1000,400"
        fill="#030C1E"
      />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden flex flex-col">
      <BackgroundRanges />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo */}
        <img src="/switchback-logo.png" alt="Switchback" className="h-8 sm:h-10 w-auto mb-8" />

        <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight max-w-2xl">
          Track every Colorado summit.
        </h1>

        <p className="text-gray-400 text-base sm:text-lg leading-relaxed mt-5 max-w-lg">
          Log your climbs, earn a badge for every peak, and follow your progress across
          Colorado's 14ers, 13ers, and beyond.
        </p>

        <a
          href={TESTFLIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-semibold text-base px-8 py-3.5 rounded-xl mt-9 transition-colors"
          style={{ background: '#38BDF8', color: '#030712' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#7DD3FC')}
          onMouseLeave={e => (e.currentTarget.style.background = '#38BDF8')}
        >
          Join the TestFlight beta →
        </a>

        <p className="text-gray-600 text-xs uppercase tracking-widest mt-10">
          58 peaks &middot; 7 ranges &middot; 1 app
        </p>
      </div>

      <p className="relative text-center text-gray-600 text-xs pb-6">
        <a href="/privacy" className="hover:text-gray-400 transition-colors">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}

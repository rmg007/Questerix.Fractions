/**
 * LevelScreen mockup — in-game question screen with the sky-blue adventure theme.
 * Mirrors the visual language of MenuScene: pale-sky background, white adventure
 * cards with navy borders, Fredoka One titles, amber Check button, blue hint button,
 * and the 5-star progress bar.
 */

// Load Fredoka One + Nunito matching the in-game font stack
const fontsStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;900&display=swap');
`;

const NAVY = '#1E3A8A';
const SKY = '#E0F2FE';
const PATH_BLUE = '#93C5FD';
const AMBER = '#FCD34D';
const AMBER_DARK = '#B45309';

function StarBar({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-2 items-center justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="text-2xl transition-all duration-300"
          style={{
            color: i < filled ? '#F59E0B' : '#CBD5E1',
            filter: i < filled ? 'drop-shadow(0 0 4px #FCD34D)' : 'none',
          }}
        >
          {i < filled ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

function PieChartHalf() {
  return (
    <svg
      viewBox="0 0 160 160"
      width="140"
      height="140"
      style={{ display: 'block', margin: '0 auto' }}
      aria-label="A circle divided in half"
    >
      <circle cx="80" cy="80" r="72" fill={SKY} stroke={NAVY} strokeWidth="3" />
      <path d="M80 8 A72 72 0 0 1 80 152 Z" fill={PATH_BLUE} stroke={NAVY} strokeWidth="2.5" />
      <line x1="80" y1="8" x2="80" y2="152" stroke={NAVY} strokeWidth="3" />
      <text
        x="48"
        y="88"
        fontSize="18"
        fontFamily="Nunito, sans-serif"
        fontWeight="bold"
        fill={NAVY}
        textAnchor="middle"
      >
        1
      </text>
      <line x1="36" y1="94" x2="60" y2="94" stroke={NAVY} strokeWidth="2" />
      <text
        x="48"
        y="110"
        fontSize="18"
        fontFamily="Nunito, sans-serif"
        fontWeight="bold"
        fill={NAVY}
        textAnchor="middle"
      >
        2
      </text>
      <text
        x="114"
        y="100"
        fontSize="18"
        fontFamily="Nunito, sans-serif"
        fontWeight="bold"
        fill={NAVY}
        textAnchor="middle"
      >
        1/2
      </text>
    </svg>
  );
}

export default function LevelScreen() {
  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden"
      style={{
        background: SKY,
        fontFamily: '"Nunito", system-ui, sans-serif',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: fontsStyle }} />
      {/* Soft glow circles matching adventure background */}
      <div
        className="absolute bottom-24 left-4 rounded-full pointer-events-none"
        style={{
          width: 180,
          height: 180,
          background: 'radial-gradient(circle, rgba(110,231,183,0.40) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-32 right-2 rounded-full pointer-events-none"
        style={{
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, rgba(147,197,253,0.40) 0%, transparent 70%)',
        }}
      />

      {/* ── Header card ───────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center mx-2.5 mt-2.5 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.95)',
          border: `3px solid ${NAVY}`,
          minHeight: 70,
          padding: '8px 12px',
          zIndex: 10,
        }}
      >
        {/* Back pill */}
        <div
          className="absolute left-3 flex items-center justify-center rounded-xl px-3 py-2 cursor-pointer"
          style={{
            background: SKY,
            border: `2px solid ${NAVY}`,
            fontSize: 14,
            fontWeight: 700,
            color: NAVY,
            lineHeight: 1,
          }}
        >
          ← Menu
        </div>

        {/* Level title */}
        <span
          style={{
            fontFamily: '"Fredoka One", "Nunito", sans-serif',
            fontSize: 30,
            fontWeight: 700,
            color: NAVY,
            letterSpacing: '0.01em',
          }}
        >
          Level 3
        </span>

        {/* Hint button — top right */}
        <button
          className="absolute right-3 rounded-full flex items-center justify-center shadow-md cursor-pointer"
          style={{
            width: 44,
            height: 44,
            background: '#60A5FA',
            border: `3px solid ${NAVY}`,
            boxShadow: `0 4px 0 ${NAVY}`,
            fontFamily: '"Fredoka One", "Nunito", sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: NAVY,
          }}
        >
          ?
        </button>
      </div>

      {/* ── Prompt card ───────────────────────────────────────────────── */}
      <div
        className="mx-8 mt-3 rounded-2xl flex items-center justify-center text-center"
        style={{
          background: '#FFFFFF',
          border: `3px solid ${PATH_BLUE}`,
          padding: '14px 16px',
          minHeight: 72,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: '"Nunito", sans-serif',
            fontSize: 17,
            fontWeight: 700,
            color: NAVY,
            lineHeight: 1.35,
          }}
        >
          What fraction of the circle is shaded blue?
        </span>
      </div>

      {/* ── Fraction visual ──────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 px-4"
        style={{ zIndex: 10 }}
      >
        {/* Pie chart */}
        <div
          className="rounded-3xl flex items-center justify-center p-4"
          style={{
            background: 'rgba(255,255,255,0.80)',
            border: `2.5px solid ${PATH_BLUE}`,
            width: 180,
            height: 180,
          }}
        >
          <PieChartHalf />
        </div>

        {/* Answer buttons row */}
        <div className="flex gap-3 mt-2">
          {['1/4', '1/2', '3/4'].map((frac, i) => {
            const isCorrect = frac === '1/2';
            return (
              <button
                key={frac}
                className="rounded-2xl flex items-center justify-center font-bold cursor-pointer transition-transform hover:scale-105"
                style={{
                  width: 88,
                  height: 68,
                  background: isCorrect ? PATH_BLUE : 'rgba(255,255,255,0.9)',
                  border: `3px solid ${isCorrect ? NAVY : PATH_BLUE}`,
                  boxShadow: `0 4px 0 ${isCorrect ? NAVY : '#60A5FA'}`,
                  fontFamily: '"Fredoka One", "Nunito", sans-serif',
                  fontSize: 22,
                  color: NAVY,
                }}
              >
                {frac}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom chrome ────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pb-4 px-4" style={{ zIndex: 10 }}>
        {/* Hint text badge (shown after requesting hint) */}
        <div
          className="w-full rounded-2xl text-center py-2 px-4"
          style={{
            background: '#FFFFFF',
            border: `2px solid ${PATH_BLUE}`,
            fontSize: 13,
            fontWeight: 600,
            color: NAVY,
            opacity: 0.9,
          }}
        >
          💡 Think: the circle has 2 equal parts. The blue part is 1 of them.
        </div>

        {/* Check button — amber, 3D press style */}
        <button
          className="rounded-full flex items-center justify-center w-4/5 cursor-pointer"
          style={{
            height: 56,
            background: AMBER,
            border: `4px solid ${AMBER_DARK}`,
            boxShadow: `0 6px 0 ${AMBER_DARK}`,
            fontFamily: '"Fredoka One", "Nunito", sans-serif',
            fontSize: 22,
            fontWeight: 700,
            color: '#78350F',
            letterSpacing: '0.01em',
          }}
        >
          Check ✓
        </button>

        {/* 5-star progress bar */}
        <div
          className="w-full rounded-2xl flex flex-col items-center gap-1 py-2 px-4"
          style={{
            background: 'rgba(255,255,255,0.85)',
            border: `2px solid ${PATH_BLUE}`,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Progress
          </span>
          <StarBar filled={2} total={5} />
        </div>
      </div>
    </div>
  );
}

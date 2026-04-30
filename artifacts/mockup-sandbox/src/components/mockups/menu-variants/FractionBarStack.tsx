import React from 'react';
import { Play, RotateCcw, Settings, Star, Trophy, Puzzle } from 'lucide-react';

export function FractionBarStack() {
  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] font-['Fredoka'] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;800&family=Nunito:wght@400;700;900&display=swap');
      `,
        }}
      />

      {/* Background grid pattern to look like a classroom desk or cutting mat */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      ></div>

      <div className="w-full max-w-[420px] flex flex-col gap-6 z-10">
        {/* Header Area */}
        <div className="text-center mb-2">
          <h2 className="text-[#64748b] text-sm uppercase tracking-widest font-bold mb-1">
            A math adventure!
          </h2>
        </div>

        {/* 1 Whole - Title Bar */}
        <div className="flex items-stretch gap-2">
          <div className="w-8 text-[#94a3b8] font-bold text-xl flex-shrink-0 font-['Nunito'] flex items-center justify-center">
            1
          </div>
          <div className="flex-1 bg-[#ef4444] rounded-2xl min-h-[120px] border-b-[10px] border-[#b91c1c] shadow-sm flex items-center justify-center p-4 transform transition-transform hover:scale-[1.02]">
            <h1 className="text-white text-[2.5rem] font-black tracking-wide drop-shadow-md text-center leading-[1.1] font-['Fredoka']">
              Questerix
              <br />
              Fractions
            </h1>
          </div>
        </div>

        {/* 1/2 Halves Row */}
        <div className="flex items-stretch gap-2">
          <div className="w-8 text-[#94a3b8] font-bold text-xl flex-shrink-0 flex flex-col items-center justify-center font-['Nunito'] leading-none">
            <span>1</span>
            <span className="w-4 border-t-4 border-[#94a3b8] my-[3px]"></span>
            <span>2</span>
          </div>
          <div className="flex-1 flex gap-3 h-[140px]">
            {/* Play Button - 1/2 */}
            <button className="flex-1 bg-[#f59e0b] hover:bg-[#fbbf24] active:bg-[#d97706] rounded-2xl border-b-[10px] border-[#b45309] shadow-sm flex flex-col items-center justify-center gap-2 transition-all active:translate-y-[10px] active:border-b-0 group">
              <Play className="w-14 h-14 text-white fill-white group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-3xl drop-shadow-sm font-['Fredoka']">
                Play
              </span>
            </button>

            {/* Continue Button - 1/2 */}
            <button className="flex-1 bg-[#10b981] hover:bg-[#34d399] active:bg-[#059669] rounded-2xl border-b-[10px] border-[#047857] shadow-sm flex flex-col items-center justify-center gap-2 transition-all active:translate-y-[10px] active:border-b-0 group">
              <RotateCcw
                className="w-12 h-12 text-white group-hover:-rotate-45 transition-transform"
                strokeWidth={3}
              />
              <span className="text-white font-bold text-2xl drop-shadow-sm font-['Fredoka']">
                Continue
              </span>
            </button>
          </div>
        </div>

        {/* 1/3 Thirds Row */}
        <div className="flex items-stretch gap-2">
          <div className="w-8 text-[#94a3b8] font-bold text-xl flex-shrink-0 flex flex-col items-center justify-center font-['Nunito'] leading-none">
            <span>1</span>
            <span className="w-4 border-t-4 border-[#94a3b8] my-[3px]"></span>
            <span>3</span>
          </div>
          <div className="flex-1 flex gap-3 h-[110px]">
            <button className="flex-1 bg-[#3b82f6] hover:bg-[#60a5fa] active:bg-[#2563eb] rounded-2xl border-b-[8px] border-[#1d4ed8] shadow-sm flex flex-col items-center justify-center gap-1 transition-all active:translate-y-[8px] active:border-b-0 group">
              <Settings
                className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-500"
                strokeWidth={2.5}
              />
              <span className="text-white font-bold text-lg drop-shadow-sm font-['Fredoka']">
                Settings
              </span>
            </button>

            <button className="flex-1 bg-[#8b5cf6] hover:bg-[#a78bfa] active:bg-[#6d28d9] rounded-2xl border-b-[8px] border-[#4338ca] shadow-sm flex flex-col items-center justify-center gap-1 transition-all active:translate-y-[8px] active:border-b-0 group">
              <Trophy
                className="w-8 h-8 text-white group-hover:scale-110 transition-transform"
                strokeWidth={2.5}
              />
              <span className="text-white font-bold text-lg drop-shadow-sm font-['Fredoka']">
                Badges
              </span>
            </button>

            <button className="flex-1 bg-[#6366f1] hover:bg-[#818cf8] active:bg-[#4f46e5] rounded-2xl border-b-[8px] border-[#3730a3] shadow-sm flex flex-col items-center justify-center gap-1 transition-all active:translate-y-[8px] active:border-b-0 group">
              <Puzzle
                className="w-8 h-8 text-white group-hover:scale-110 transition-transform"
                strokeWidth={2.5}
              />
              <span className="text-white font-bold text-lg drop-shadow-sm font-['Fredoka']">
                Levels
              </span>
            </button>
          </div>
        </div>

        {/* 1/4 Fourths Row */}
        <div className="flex items-stretch gap-2">
          <div className="w-8 text-[#94a3b8] font-bold text-xl flex-shrink-0 flex flex-col items-center justify-center font-['Nunito'] leading-none">
            <span>1</span>
            <span className="w-4 border-t-4 border-[#94a3b8] my-[3px]"></span>
            <span>4</span>
          </div>
          <div className="flex-1 flex gap-3 h-[70px]">
            <div className="flex-1 bg-[#ec4899] rounded-xl border-b-[6px] border-[#be185d] shadow-sm flex items-center justify-center">
              <Star className="w-6 h-6 text-white fill-white opacity-80" />
            </div>
            <div className="flex-1 bg-[#d946ef] rounded-xl border-b-[6px] border-[#9d174d] shadow-sm flex items-center justify-center">
              <Star className="w-6 h-6 text-white fill-white opacity-80" />
            </div>
            <div className="flex-1 bg-[#c026d3] rounded-xl border-b-[6px] border-[#86198f] shadow-sm flex items-center justify-center">
              <Star className="w-6 h-6 text-white/40 fill-white/40" />
            </div>
            <div className="flex-1 bg-[#a21caf] rounded-xl border-b-[6px] border-[#701a75] shadow-sm flex items-center justify-center">
              <Star className="w-6 h-6 text-white/40 fill-white/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Play, PlayCircle, Settings, MapPin, Flag, Rocket } from 'lucide-react';

export function NumberLineQuest() {
  return (
    <div className="w-[420px] h-[780px] bg-[#E0F2FE] relative overflow-hidden font-['Nunito'] flex flex-col items-center">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;900&display=swap');
        
        .title-stroke {
          -webkit-text-stroke: 2px #1E3A8A;
        }
        
        .path-line {
          stroke-dasharray: 12 12;
          animation: march 2s linear infinite;
        }
        
        @keyframes march {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .path-line {
            animation: none;
          }
        }
      `,
        }}
      />

      {/* Header / Title */}
      <div className="mt-12 z-20 flex flex-col items-center text-center px-4">
        <h1 className="font-['Fredoka_One'] text-5xl text-white leading-tight drop-shadow-[0_4px_0px_#1E3A8A] title-stroke">
          Questerix
          <br />
          Fractions
        </h1>
        <div className="bg-white/90 text-[#1E3A8A] px-4 py-2 rounded-full mt-4 font-bold text-lg shadow-md border-2 border-[#1E3A8A] transform -rotate-2">
          A math adventure! 🚀
        </div>
      </div>

      {/* Map / Path Area */}
      <div className="absolute inset-0 top-32 z-10">
        <svg className="w-full h-full" viewBox="0 0 420 600" preserveAspectRatio="xMidYMax slice">
          {/* Main path line */}
          <path
            d="M 210 500 C 100 450, 100 350, 210 300 C 320 250, 320 150, 210 100"
            fill="none"
            stroke="#93C5FD"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M 210 500 C 100 450, 100 350, 210 300 C 320 250, 320 150, 210 100"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="10"
            strokeLinecap="round"
            className="path-line"
          />
        </svg>
      </div>

      {/* Interactive Elements on Path */}
      <div className="absolute inset-0 top-32 z-20 pointer-events-none">
        {/* Point 1: END (Top) */}
        <div className="absolute top-[80px] left-[210px] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
          <div className="bg-white text-blue-900 font-bold text-2xl px-3 py-1 rounded-xl mb-2 border-4 border-blue-900 shadow-[0_4px_0_#1E3A8A]">
            1
          </div>
          <button className="flex flex-col items-center justify-center w-[80px] h-[80px] bg-blue-400 hover:bg-blue-300 text-white rounded-full border-4 border-blue-900 shadow-[0_6px_0_#1E3A8A] transition-all active:translate-y-[6px] active:shadow-none group">
            <Settings className="w-10 h-10 group-hover:rotate-45 transition-transform" />
          </button>
          <span className="font-['Fredoka_One'] text-blue-900 text-lg mt-2 bg-white/80 px-3 py-1 rounded-full border-2 border-blue-900">
            Settings
          </span>
        </div>

        {/* Point 1/2: MIDDLE */}
        <div className="absolute top-[280px] left-[210px] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
          <div className="flex items-center gap-1 bg-white text-emerald-700 font-bold text-xl px-3 py-1 rounded-xl mb-2 border-4 border-emerald-800 shadow-[0_4px_0_#065F46]">
            <span className="text-sm">1</span>
            <span className="text-2xl leading-none">/</span>
            <span className="text-sm">2</span>
          </div>
          <button className="flex items-center justify-center gap-2 px-6 h-[72px] bg-emerald-400 hover:bg-emerald-300 text-white font-['Fredoka_One'] text-2xl rounded-full border-4 border-emerald-900 shadow-[0_6px_0_#064E3B] transition-all active:translate-y-[6px] active:shadow-none">
            <MapPin className="w-8 h-8" />
            Continue
          </button>
        </div>

        {/* Point 0: START (Bottom) */}
        <div className="absolute top-[480px] left-[210px] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
          <div className="bg-white text-amber-600 font-bold text-2xl px-3 py-1 rounded-xl mb-2 border-4 border-amber-600 shadow-[0_4px_0_#B45309]">
            0
          </div>
          <button className="flex items-center justify-center gap-3 px-8 h-[88px] bg-[#FCD34D] hover:bg-[#F59E0B] text-[#78350F] font-['Fredoka_One'] text-4xl rounded-full border-4 border-[#B45309] shadow-[0_8px_0_#B45309] transition-all active:translate-y-[8px] active:shadow-none">
            <PlayCircle className="w-10 h-10" fill="#78350F" color="#FCD34D" />
            Play!
          </button>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="absolute bottom-[-20px] left-[-20px] w-48 h-48 bg-emerald-300 rounded-full blur-2xl opacity-50 z-0"></div>
      <div className="absolute top-[200px] right-[-20px] w-64 h-64 bg-blue-300 rounded-full blur-2xl opacity-50 z-0"></div>
    </div>
  );
}

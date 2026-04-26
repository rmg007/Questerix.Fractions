import React, { useState } from 'react';
import { Play, Settings, ArrowRight } from 'lucide-react';

export function Layout3GameCard() {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div className="w-[420px] h-[780px] bg-[#38BDF8] relative overflow-hidden flex flex-col items-center justify-center p-6 font-['Nunito']">
      
      {/* Ambient Background Elements */}
      <div className="absolute top-12 left-12 w-24 h-24 bg-yellow-300 rounded-full opacity-80 blur-sm animate-pulse" />
      <div className="absolute top-20 right-10 w-32 h-12 bg-white/60 rounded-full blur-[2px]" />
      <div className="absolute top-24 right-4 w-20 h-10 bg-white/50 rounded-full blur-[2px]" />
      <div className="absolute bottom-32 left-8 w-40 h-16 bg-white/40 rounded-full blur-[2px]" />
      <div className="absolute bottom-40 right-12 w-28 h-10 bg-white/30 rounded-full blur-[2px]" />

      {/* Main Card */}
      <div 
        className="w-full bg-[#FFFBF0] rounded-[2rem] border-8 border-[#4ADE80] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-[float_4s_ease-in-out_infinite]"
        style={{
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), inset 0 -8px 0 rgba(0,0,0,0.05)'
        }}
      >
        
        {/* 1. Header Strip */}
        <div className="bg-[#4ADE80] w-full py-2 px-4 text-center">
          <p className="text-[#064E3B] font-bold tracking-wide uppercase text-sm">
            A math adventure! 🍕
          </p>
        </div>

        <div className="p-8 flex flex-col items-center flex-1">
          
          {/* 2. Title Block */}
          <h1 className="font-['Fredoka_One'] text-4xl text-center text-[#1E3A8A] leading-tight mb-2 drop-shadow-sm">
            Questerix<br/>Fractions
          </h1>

          {/* 3. Character Badge */}
          <div className="relative w-[100px] h-[100px] my-6 drop-shadow-md">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_20s_linear_infinite]">
              {/* Left Half (Yellow) */}
              <path d="M 50 10 A 40 40 0 0 0 50 90 L 50 10 Z" fill="#FCD34D" />
              {/* Right Half (Orange) */}
              <path d="M 50 10 A 40 40 0 0 1 50 90 L 50 10 Z" fill="#FB923C" />
              {/* Dashed Center Line */}
              <line x1="50" y1="10" x2="50" y2="90" stroke="white" strokeWidth="4" strokeDasharray="6 4" />
              {/* Face Details */}
              <g className="animate-none">
                {/* Eyes */}
                <circle cx="35" cy="40" r="6" fill="white" />
                <circle cx="35" cy="40" r="3" fill="#1E3A8A" />
                <circle cx="65" cy="40" r="6" fill="white" />
                <circle cx="65" cy="40" r="3" fill="#1E3A8A" />
                
                {/* Cheeks */}
                <circle cx="25" cy="55" r="5" fill="#EF4444" opacity="0.4" />
                <circle cx="75" cy="55" r="5" fill="#EF4444" opacity="0.4" />
                
                {/* Smile */}
                <path d="M 30 60 Q 50 80 70 60" fill="none" stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round" />
                <path d="M 40 67 L 40 73 M 50 69 L 50 76 M 60 67 L 60 73" stroke="#1E3A8A" strokeWidth="3" fill="none" />
              </g>
            </svg>
          </div>

          {/* 4. Button Block */}
          <div className="w-full flex flex-col gap-4 mt-auto">
            {/* Play Button */}
            <button 
              onMouseEnter={() => setHoveredBtn('play')}
              onMouseLeave={() => setHoveredBtn(null)}
              className="w-full h-[80px] bg-gradient-to-b from-[#FCD34D] to-[#F59E0B] rounded-2xl flex items-center justify-center gap-3 border-b-[6px] border-[#D97706] active:border-b-0 active:translate-y-[6px] transition-all relative overflow-hidden group shadow-lg hover:shadow-xl animate-[bounce_2s_infinite]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out" />
              <Play fill="white" className="w-8 h-8 text-white drop-shadow-md" />
              <span className="font-['Fredoka_One'] text-3xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] tracking-wider">
                PLAY!
              </span>
            </button>

            {/* Continue Button */}
            <button 
              onMouseEnter={() => setHoveredBtn('continue')}
              onMouseLeave={() => setHoveredBtn(null)}
              className="w-full h-[64px] bg-gradient-to-b from-[#60A5FA] to-[#3B82F6] rounded-2xl flex items-center justify-center gap-3 border-b-[5px] border-[#2563EB] active:border-b-0 active:translate-y-[5px] transition-all relative shadow-md hover:shadow-lg hover:-translate-y-1"
            >
              <ArrowRight className="w-6 h-6 text-white drop-shadow-sm" />
              <span className="font-['Fredoka_One'] text-xl text-white drop-shadow-sm">
                CONTINUE
              </span>
            </button>

            {/* Settings Button */}
            <button 
              onMouseEnter={() => setHoveredBtn('settings')}
              onMouseLeave={() => setHoveredBtn(null)}
              className="w-full h-[64px] bg-white rounded-2xl flex items-center justify-center gap-3 border-[3px] border-[#E2E8F0] border-b-[6px] border-b-[#CBD5E1] active:border-b-[3px] active:translate-y-[3px] transition-all shadow-sm hover:bg-gray-50"
            >
              <Settings className="w-6 h-6 text-[#64748B]" />
              <span className="font-['Fredoka_One'] text-xl text-[#64748B]">
                SETTINGS
              </span>
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

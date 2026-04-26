import React from "react";
import { Button } from "@/components/ui/button";

export function StarlightQuest() {
  return (
    <div className="relative w-full max-w-[420px] h-[780px] min-h-screen mx-auto overflow-hidden bg-gradient-to-b from-[#0F0C29] via-[#1E1B4B] to-[#312E81] flex flex-col items-center font-['Nunito'] text-white shadow-2xl">
      <style>
        {`
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 15px 5px rgba(6, 182, 212, 0.4); }
            50% { box-shadow: 0 0 30px 10px rgba(6, 182, 212, 0.8); }
          }
          @keyframes text-shimmer {
            0% { text-shadow: 0 0 10px rgba(196, 181, 253, 0.5); }
            50% { text-shadow: 0 0 20px rgba(196, 181, 253, 1), 0 0 30px rgba(196, 181, 253, 0.8); }
            100% { text-shadow: 0 0 10px rgba(196, 181, 253, 0.5); }
          }
          .star {
            position: absolute;
            animation: twinkle 3s infinite ease-in-out;
            color: #FCD34D;
          }
          .star-1 { top: 10%; left: 15%; animation-delay: 0s; font-size: 1.5rem; }
          .star-2 { top: 25%; left: 80%; animation-delay: 1s; font-size: 1rem; }
          .star-3 { top: 15%; left: 60%; animation-delay: 0.5s; font-size: 0.8rem; }
          .star-4 { top: 40%; left: 10%; animation-delay: 1.5s; font-size: 1.2rem; }
          .star-5 { top: 50%; left: 85%; animation-delay: 0.8s; font-size: 1.5rem; }
          .star-6 { top: 75%; left: 20%; animation-delay: 2s; font-size: 1rem; }
          .star-7 { top: 85%; left: 75%; animation-delay: 1.2s; font-size: 1.8rem; }
        `}
      </style>

      {/* Background Stars */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="star star-1">✨</div>
        <div className="star star-2">★</div>
        <div className="star star-3">🌟</div>
        <div className="star star-4">★</div>
        <div className="star star-5">✨</div>
        <div className="star star-6">🌟</div>
        <div className="star star-7">★</div>
      </div>

      {/* Header / Title Area */}
      <div className="mt-16 text-center z-10 px-4 w-full">
        <h1 
          className="text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-br from-[#C4B5FD] to-white"
          style={{ animation: 'text-shimmer 4s infinite' }}
        >
          Questerix
          <br/>
          Fractions
        </h1>
        <p className="text-[#C4B5FD] text-lg font-bold tracking-wide mt-2 opacity-90">
          A Magical Math Adventure!
        </p>
      </div>

      {/* Central Visual: Glowing Moon Split in Half */}
      <div className="flex-1 w-full flex items-center justify-center z-10 relative">
        <div className="relative w-64 h-64" style={{ animation: 'float 6s infinite ease-in-out' }}>
          {/* Moon Glow */}
          <div className="absolute inset-0 bg-[#06B6D4] opacity-20 rounded-full blur-[40px]"></div>
          
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(196,181,253,0.6)]">
            <defs>
              <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E0E7FF" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            {/* Left Half */}
            <path d="M50 10 A40 40 0 0 0 50 90 L50 10 Z" fill="url(#moonGrad)" />
            {/* Right Half - separated slightly to show fraction */}
            <path d="M54 10 A40 40 0 0 1 54 90 L54 10 Z" fill="url(#moonGrad)" opacity="0.6" />
            
            <text x="32" y="55" fontSize="16" fill="#1E1B4B" fontWeight="bold" fontFamily="Nunito">½</text>
            <text x="68" y="55" fontSize="16" fill="#1E1B4B" fontWeight="bold" fontFamily="Nunito">½</text>
          </svg>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full px-8 pb-16 z-10 flex flex-col gap-4">
        <Button 
          size="lg" 
          className="w-full h-16 rounded-3xl text-2xl font-black text-[#0F0C29] bg-gradient-to-r from-[#06B6D4] to-[#2DD4BF] hover:from-[#2DD4BF] hover:to-[#06B6D4] border-2 border-white/20 transition-transform active:scale-95"
          style={{ animation: 'pulse-glow 3s infinite' }}
        >
          Play! 🚀
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          className="w-full h-14 rounded-3xl text-xl font-bold text-white border-2 border-[#C4B5FD]/40 bg-[#312E81]/50 hover:bg-[#312E81] hover:border-[#C4B5FD] transition-all backdrop-blur-sm"
        >
          Continue
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full h-12 text-[#C4B5FD] hover:text-white hover:bg-white/10 font-bold text-lg rounded-2xl"
        >
          Settings ⚙️
        </Button>
      </div>
    </div>
  );
}

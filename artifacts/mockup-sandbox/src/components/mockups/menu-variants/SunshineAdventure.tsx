import React from "react";
import { Button } from "@/components/ui/button";

export function SunshineAdventure() {
  return (
    <div className="relative w-full max-w-[420px] h-[780px] bg-[#38BDF8] overflow-hidden flex flex-col font-['Nunito'] mx-auto border-4 border-black rounded-3xl shadow-2xl">
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(2deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          @keyframes sun-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes cloud-drift {
            0% { transform: translateX(-50px); }
            50% { transform: translateX(20px); }
            100% { transform: translateX(-50px); }
          }
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
            50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
          }
          .animate-float {
            animation: float 4s ease-in-out infinite;
          }
          .animate-sun-spin {
            animation: sun-spin 20s linear infinite;
          }
          .animate-cloud-drift {
            animation: cloud-drift 10s ease-in-out infinite;
          }
          .animate-bounce-subtle {
            animation: bounce-subtle 1.5s infinite;
          }
        `}
      </style>

      {/* Sky & Sun Background Area */}
      <div className="relative h-[300px] w-full shrink-0 flex justify-center items-center overflow-hidden">
        {/* Sun */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-[#FCD34D] rounded-full flex items-center justify-center animate-sun-spin">
          <div className="w-32 h-32 absolute border-[8px] border-dashed border-[#F59E0B] rounded-full opacity-50"></div>
        </div>

        {/* Clouds */}
        <div className="absolute top-8 right-8 text-6xl animate-cloud-drift opacity-90">☁️</div>
        <div className="absolute top-24 left-1/2 text-5xl animate-cloud-drift opacity-80" style={{ animationDelay: '-3s' }}>☁️</div>

        {/* Fraction Character */}
        <div className="relative z-10 animate-float mt-12 drop-shadow-xl">
          <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Face circle */}
            <circle cx="80" cy="80" r="76" fill="#FDE68A" stroke="#B45309" strokeWidth="8"/>
            {/* Split line (fraction divider) */}
            <path d="M80 4V156" stroke="#B45309" strokeWidth="8" strokeDasharray="8 8"/>

            {/* Left eye — big cartoon eye */}
            <ellipse cx="54" cy="66" rx="13" ry="14" fill="white" stroke="#B45309" strokeWidth="3"/>
            <circle cx="57" cy="68" r="8" fill="#1E3A5F"/>
            <circle cx="60" cy="65" r="3" fill="white"/>

            {/* Right eye — big cartoon eye */}
            <ellipse cx="106" cy="66" rx="13" ry="14" fill="white" stroke="#B45309" strokeWidth="3"/>
            <circle cx="109" cy="68" r="8" fill="#1E3A5F"/>
            <circle cx="112" cy="65" r="3" fill="white"/>

            {/* Happy eyebrows */}
            <path d="M38 50 Q54 40 68 48" stroke="#B45309" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <path d="M92 48 Q106 40 122 50" stroke="#B45309" strokeWidth="5" strokeLinecap="round" fill="none"/>

            {/* Wide grin with teeth */}
            <path d="M38 96 Q80 132 122 96" stroke="#B45309" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <path d="M46 100 Q80 130 114 100" fill="white" stroke="none"/>
            <path d="M46 100 Q80 130 114 100 Q80 108 46 100Z" fill="white"/>
            <line x1="63" y1="102" x2="63" y2="118" stroke="#B45309" strokeWidth="3"/>
            <line x1="80" y1="104" x2="80" y2="121" stroke="#B45309" strokeWidth="3"/>
            <line x1="97" y1="102" x2="97" y2="118" stroke="#B45309" strokeWidth="3"/>

            {/* Rosy cheeks */}
            <ellipse cx="35" cy="88" rx="12" ry="8" fill="#FB7185" opacity="0.45"/>
            <ellipse cx="125" cy="88" rx="12" ry="8" fill="#FB7185" opacity="0.45"/>
          </svg>
        </div>
      </div>

      {/* Grass Transition */}
      <div className="relative w-full h-12 shrink-0">
        <svg preserveAspectRatio="none" viewBox="0 0 1440 320" className="w-full h-full absolute bottom-0">
          <path fill="#4ADE80" fillOpacity="1" d="M0,128L48,138.7C96,149,192,171,288,186.7C384,203,480,213,576,192C672,171,768,117,864,106.7C960,96,1056,128,1152,144C1248,160,1344,171,1392,176L1440,181.3L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Ground / UI Area */}
      <div className="flex-1 bg-[#4ADE80] flex flex-col items-center pt-2 pb-8 px-6">
        
        {/* Titles */}
        <div className="text-center mb-8 drop-shadow-md">
          <h1 className="text-5xl font-['Fredoka_One'] font-black text-white tracking-wide uppercase" style={{ textShadow: '0 4px 0 #15803D' }}>
            Questerix
          </h1>
          <h2 className="text-4xl font-['Fredoka_One'] font-black text-[#FCD34D] uppercase mt-[-5px]" style={{ textShadow: '0 4px 0 #B45309' }}>
            Fractions
          </h2>
          <p className="text-white font-bold text-lg mt-3 bg-[#15803D] px-4 py-1 rounded-full inline-block">
            A math adventure! 🍕
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4 w-full mt-auto mb-6">
          <button className="w-full h-20 bg-[#F59E0B] hover:bg-[#FCD34D] active:translate-y-2 active:shadow-[0_0px_0_0_#B45309] transition-all rounded-full text-white font-['Fredoka_One'] font-black text-3xl shadow-[0_8px_0_0_#B45309] border-4 border-white animate-bounce-subtle flex items-center justify-center gap-2">
            <span>Play!</span>
            <span className="text-4xl">✨</span>
          </button>

          <button className="w-full h-16 bg-[#0EA5E9] hover:bg-[#38BDF8] active:translate-y-1 active:shadow-[0_0px_0_0_#0284C7] transition-all rounded-full text-white font-['Fredoka_One'] font-bold text-2xl shadow-[0_6px_0_0_#0284C7] border-4 border-white flex items-center justify-center">
            Continue
          </button>

          <button className="w-full h-14 bg-white hover:bg-gray-100 active:translate-y-1 active:shadow-[0_0px_0_0_#D1D5DB] transition-all rounded-full text-[#15803D] font-['Fredoka_One'] font-bold text-xl shadow-[0_4px_0_0_#D1D5DB] border-4 border-[#15803D] flex items-center justify-center">
            ⚙️ Settings
          </button>
        </div>
        
      </div>
    </div>
  );
}

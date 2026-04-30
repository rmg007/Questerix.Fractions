import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Play, ArrowRight } from 'lucide-react';

export function Layout1Hero() {
  return (
    <div className="relative w-full max-w-[420px] mx-auto h-[780px] bg-[#38BDF8] overflow-hidden flex flex-col items-center justify-between shadow-2xl font-['Nunito'] border-4 border-slate-900 rounded-[32px]">
      {/* Background Decor */}
      <div className="absolute top-4 left-4 opacity-80">
        <svg
          width="48"
          height="32"
          viewBox="0 0 48 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 16C12 9.37258 17.3726 4 24 4C28.8475 4 33.0232 6.87326 34.9392 11.0827C35.6322 11.0284 36.3402 11 37.0588 11C42.548 11 47 15.4772 47 21C47 26.5228 42.548 31 37.0588 31H12C5.37258 31 0 25.6274 0 19C0 12.3726 5.37258 7 12 7V16Z"
            fill="white"
          />
        </svg>
      </div>

      <div className="absolute top-8 right-6 opacity-90 animate-[spin_10s_linear_infinite]">
        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="30" cy="30" r="16" fill="#FCD34D" />
          <path d="M30 0L32 10H28L30 0Z" fill="#FCD34D" />
          <path d="M30 60L28 50H32L30 60Z" fill="#FCD34D" />
          <path d="M60 30L50 28V32L60 30Z" fill="#FCD34D" />
          <path d="M0 30L10 32V28L0 30Z" fill="#FCD34D" />
          <path
            d="M51.2132 8.7868L44.1421 15.8579L41.3137 13.0294L48.3848 5.95837L51.2132 8.7868Z"
            fill="#FCD34D"
          />
          <path
            d="M8.7868 51.2132L15.8579 44.1421L13.0294 41.3137L5.95837 48.3848L8.7868 51.2132Z"
            fill="#FCD34D"
          />
          <path
            d="M51.2132 51.2132L48.3848 54.0416L41.3137 46.9706L44.1421 44.1421L51.2132 51.2132Z"
            fill="#FCD34D"
          />
          <path
            d="M8.7868 8.7868L5.95837 11.6152L13.0294 18.6863L15.8579 15.8579L8.7868 8.7868Z"
            fill="#FCD34D"
          />
        </svg>
      </div>

      <div className="absolute top-24 right-12 opacity-70">
        <svg
          width="36"
          height="24"
          viewBox="0 0 48 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 16C12 9.37258 17.3726 4 24 4C28.8475 4 33.0232 6.87326 34.9392 11.0827C35.6322 11.0284 36.3402 11 37.0588 11C42.548 11 47 15.4772 47 21C47 26.5228 42.548 31 37.0588 31H12C5.37258 31 0 25.6274 0 19C0 12.3726 5.37258 7 12 7V16Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Hero Character - Floating */}
      <div className="relative mt-20 z-10 w-full flex justify-center animate-[float_4s_ease-in-out_infinite]">
        <svg
          width="280"
          height="280"
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          {/* Main Body */}
          <circle cx="120" cy="120" r="110" fill="#FCD34D" stroke="#78350F" strokeWidth="8" />

          {/* Dashed line for fraction */}
          <line
            x1="120"
            y1="10"
            x2="120"
            y2="230"
            stroke="#78350F"
            strokeWidth="6"
            strokeDasharray="12 12"
          />

          {/* Eyes */}
          <ellipse cx="85" cy="90" rx="20" ry="30" fill="white" stroke="#78350F" strokeWidth="4" />
          <ellipse cx="155" cy="90" rx="20" ry="30" fill="white" stroke="#78350F" strokeWidth="4" />

          {/* Pupils */}
          <circle cx="90" cy="90" r="10" fill="#78350F" />
          <circle cx="150" cy="90" r="10" fill="#78350F" />

          {/* Eye Highlights */}
          <circle cx="86" cy="86" r="4" fill="white" />
          <circle cx="146" cy="86" r="4" fill="white" />

          {/* Rosy Cheeks */}
          <ellipse cx="50" cy="125" rx="15" ry="10" fill="#F87171" opacity="0.6" />
          <ellipse cx="190" cy="125" rx="15" ry="10" fill="#F87171" opacity="0.6" />

          {/* Smile */}
          <path
            d="M60 140 C 60 190, 180 190, 180 140 Z"
            fill="white"
            stroke="#78350F"
            strokeWidth="6"
          />

          {/* Teeth dividers */}
          <line x1="100" y1="140" x2="100" y2="175" stroke="#78350F" strokeWidth="4" />
          <line x1="140" y1="140" x2="140" y2="175" stroke="#78350F" strokeWidth="4" />
        </svg>
      </div>

      {/* Title & Content Area */}
      <div className="flex flex-col items-center z-10 -mt-6">
        <h1 className="font-['Fredoka_One'] text-[42px] leading-[1.1] text-white text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] tracking-wide">
          Questerix
          <br />
          Fractions
        </h1>
        <p className="mt-3 text-white text-xl font-bold tracking-wider drop-shadow-md">
          A math adventure! 🍕
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="w-full px-8 pb-10 mt-auto flex flex-col gap-3 relative z-10">
        <Button className="w-full h-14 bg-[#F59E0B] hover:bg-[#D97706] text-white text-2xl font-['Fredoka_One'] rounded-2xl border-b-4 border-[#B45309] shadow-lg active:translate-y-1 active:border-b-0 transition-all animate-[pulse-bounce_2s_ease-in-out_infinite]">
          <Play className="w-6 h-6 mr-2 fill-current" />
          Play!
        </Button>

        <Button className="w-full h-14 bg-[#38BDF8] hover:bg-[#0EA5E9] text-white text-xl font-bold rounded-2xl border-b-4 border-[#0284C7] shadow-md active:translate-y-1 active:border-b-0 transition-all">
          <ArrowRight className="w-5 h-5 mr-2" />
          Continue
        </Button>

        <Button className="w-full h-14 bg-white hover:bg-slate-50 text-[#0F172A] text-xl font-bold rounded-2xl border-b-4 border-slate-200 shadow-sm active:translate-y-1 active:border-b-0 transition-all">
          <Settings className="w-5 h-5 mr-2 text-slate-500" />
          Settings
        </Button>
      </div>

      {/* Bottom Grass Base */}
      <div className="absolute bottom-0 w-full h-[15%] bg-[#4ADE80] border-t-4 border-[#16A34A] flex items-start overflow-hidden">
        {/* Grass tufts */}
        <div className="w-full h-4 -mt-2 flex space-x-4">
          <div className="w-8 h-8 rounded-full bg-[#38BDF8] -mt-4"></div>
          <div className="w-12 h-12 rounded-full bg-[#38BDF8] -mt-6"></div>
          <div className="w-10 h-10 rounded-full bg-[#38BDF8] -mt-5"></div>
          <div className="w-16 h-16 rounded-full bg-[#38BDF8] -mt-8"></div>
          <div className="w-8 h-8 rounded-full bg-[#38BDF8] -mt-4"></div>
          <div className="w-12 h-12 rounded-full bg-[#38BDF8] -mt-6"></div>
        </div>
      </div>

      {/* Grass Cover to hide the blue circles overlap */}
      <div className="absolute bottom-0 w-full h-[14%] bg-[#4ADE80] border-t-0"></div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `,
        }}
      />
    </div>
  );
}

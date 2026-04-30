import React from 'react';
import { Button } from '@/components/ui/button';

export function Layout2Horizon() {
  return (
    <div className="w-[420px] h-[780px] flex flex-col relative overflow-hidden bg-[#4ADE80] font-['Nunito']">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;900&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes cloudFloat {
          0% { transform: translateX(120%); }
          100% { transform: translateX(-120%); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-cloud-1 {
          animation: cloudFloat 20s linear infinite;
        }
        .animate-cloud-2 {
          animation: cloudFloat 25s linear infinite 5s;
        }
        .animate-button:hover {
          animation: bounce-subtle 0.5s ease-in-out;
        }
      `,
        }}
      />

      {/* TOP ZONE: Sky (40%) */}
      <div className="h-[40%] bg-[#38BDF8] relative flex flex-col items-center pt-12 z-10">
        {/* Sun */}
        <svg
          className="absolute top-6 left-6 w-20 h-20 animate-[spin_10s_linear_infinite]"
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="20" fill="#FCD34D" />
          <path
            d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50 M22 22 L29 29 M71 71 L78 78 M22 78 L29 71 M71 29 L78 22"
            stroke="#FCD34D"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>

        {/* Clouds */}
        <div className="absolute top-16 right-[-20%] w-24 opacity-80 animate-cloud-1">
          <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.1325 20.177 10.2078 17.8633 10.0166C17.3756 7.18579 14.9392 5 12 5C8.68629 5 6 7.68629 6 11C6 11.0558 6.00077 11.1114 6.00229 11.1668C3.76615 11.6025 2 13.5936 2 16C2 18.7614 4.23858 21 7 21H17.5C18.6046 21 19.5 20.1046 19.5 19H17.5Z" />
          </svg>
        </div>

        <div className="absolute top-32 left-[-20%] w-32 opacity-70 animate-cloud-2">
          <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.1325 20.177 10.2078 17.8633 10.0166C17.3756 7.18579 14.9392 5 12 5C8.68629 5 6 7.68629 6 11C6 11.0558 6.00077 11.1114 6.00229 11.1668C3.76615 11.6025 2 13.5936 2 16C2 18.7614 4.23858 21 7 21H17.5C18.6046 21 19.5 20.1046 19.5 19H17.5Z" />
          </svg>
        </div>

        {/* Title */}
        <div className="z-20 flex flex-col items-center">
          <h1
            className="font-['Fredoka_One'] text-5xl text-white text-center leading-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] stroke-black stroke-2"
            style={{ WebkitTextStroke: '2px #1E3A8A' }}
          >
            Questerix
            <br />
            Fractions
          </h1>
          <p className="text-white font-bold text-xl mt-2 drop-shadow-md">A math adventure! 🍕</p>
        </div>
      </div>

      {/* HORIZON LINE: Wavy divider + Character */}
      <div className="relative w-full h-16 z-20">
        {/* Wavy Divider */}
        <div className="absolute bottom-0 w-[120%] -left-[10%] text-[#4ADE80]">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-16 fill-current"
          >
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C55.74,120.4,142.14,115.1,209.6,104.9,248.8,99,286.9,81.4,321.39,56.44Z"></path>
          </svg>
        </div>

        {/* Character straddling the horizon */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 animate-float">
          <svg width="180" height="180" viewBox="0 0 200 200">
            {/* Base Circle */}
            <circle cx="100" cy="100" r="90" fill="#FCD34D" stroke="#B45309" strokeWidth="8" />

            {/* Split dashed line */}
            <line
              x1="100"
              y1="10"
              x2="100"
              y2="190"
              stroke="#B45309"
              strokeWidth="6"
              strokeDasharray="10 10"
            />

            {/* Eyes */}
            <ellipse
              cx="65"
              cy="75"
              rx="15"
              ry="25"
              fill="white"
              stroke="#B45309"
              strokeWidth="4"
            />
            <ellipse
              cx="135"
              cy="75"
              rx="15"
              ry="25"
              fill="white"
              stroke="#B45309"
              strokeWidth="4"
            />

            {/* Pupils */}
            <circle cx="70" cy="80" r="6" fill="#1E3A8A" />
            <circle cx="130" cy="80" r="6" fill="#1E3A8A" />

            {/* Rosy Cheeks */}
            <circle cx="45" cy="115" r="12" fill="#EF4444" opacity="0.4" />
            <circle cx="155" cy="115" r="12" fill="#EF4444" opacity="0.4" />

            {/* Smile */}
            <path d="M 50 120 Q 100 170 150 120" fill="white" stroke="#B45309" strokeWidth="6" />
            <path d="M 50 120 Q 100 140 150 120" fill="none" stroke="#B45309" strokeWidth="6" />
          </svg>
        </div>
      </div>

      {/* BOTTOM ZONE: Action (60%) */}
      <div className="flex-1 bg-[#4ADE80] z-10 flex flex-col items-center justify-end pb-12 px-8 pt-16">
        <div className="w-full flex flex-col gap-5 mt-auto">
          {/* Play Button */}
          <button className="w-full h-[70px] bg-[#FCD34D] hover:bg-[#F59E0B] text-[#78350F] font-['Fredoka_One'] text-3xl rounded-full border-4 border-[#B45309] shadow-[0_6px_0_#B45309] transition-all active:translate-y-[6px] active:shadow-none animate-button">
            Play!
          </button>

          {/* Continue Button */}
          <button className="w-full h-[60px] bg-[#38BDF8] hover:bg-[#0EA5E9] text-white font-['Fredoka_One'] text-2xl rounded-full border-4 border-[#1E3A8A] shadow-[0_6px_0_#1E3A8A] transition-all active:translate-y-[6px] active:shadow-none animate-button">
            Continue
          </button>

          {/* Settings Button */}
          <button className="w-full h-[60px] bg-white hover:bg-gray-100 text-[#1E3A8A] font-['Fredoka_One'] text-2xl rounded-full border-4 border-[#1E3A8A] shadow-[0_6px_0_#1E3A8A] transition-all active:translate-y-[6px] active:shadow-none animate-button">
            Settings
          </button>
        </div>

        {/* Grass decorations on bottom */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between px-4 pointer-events-none opacity-60">
          <svg
            width="40"
            height="30"
            viewBox="0 0 40 30"
            fill="none"
            stroke="#16A34A"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M20 30 L20 10 M20 30 L10 15 M20 30 L30 18" />
          </svg>
          <svg
            width="50"
            height="40"
            viewBox="0 0 50 40"
            fill="none"
            stroke="#16A34A"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M25 40 L25 15 M25 40 L10 20 M25 40 L40 25 M25 40 L15 10" />
          </svg>
          <svg
            width="35"
            height="25"
            viewBox="0 0 35 25"
            fill="none"
            stroke="#16A34A"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M17 25 L17 10 M17 25 L8 15 M17 25 L26 12" />
          </svg>
        </div>
      </div>
    </div>
  );
}

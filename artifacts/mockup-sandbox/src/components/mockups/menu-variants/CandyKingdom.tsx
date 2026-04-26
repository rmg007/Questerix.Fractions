import React from "react";
import { Play, Settings, ArrowRight } from "lucide-react";

export function CandyKingdom() {
  return (
    <div className="relative min-h-[780px] w-full max-w-[420px] mx-auto overflow-hidden bg-gradient-to-b from-[#FDF2F8] to-[#F3E8FF] flex flex-col items-center justify-center font-['Nunito']">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(236, 72, 153, 0.4); }
          50% { box-shadow: 0 0 35px rgba(236, 72, 153, 0.7); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 5s ease-in-out infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
      `}} />

      {/* Background Decor */}
      <div className="absolute top-10 left-10 text-4xl animate-float opacity-70">🍭</div>
      <div className="absolute top-20 right-8 text-5xl animate-float-reverse opacity-70">🍬</div>
      <div className="absolute bottom-32 left-8 text-4xl animate-float-reverse opacity-70">🎀</div>
      <div className="absolute bottom-40 right-12 text-3xl animate-float opacity-70">✨</div>
      <div className="absolute top-1/3 left-4 text-2xl animate-float opacity-50">🌟</div>
      <div className="absolute top-1/2 right-6 text-2xl animate-float-reverse opacity-50">🍰</div>
      <div className="absolute bottom-1/4 left-1/4 text-xl animate-float opacity-60">💖</div>
      <div className="absolute top-1/4 right-1/4 text-3xl animate-float-reverse opacity-60">🍩</div>

      <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#EC4899] rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[#A855F7] rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full px-6 flex flex-col items-center gap-8 mt-12">
        
        {/* Title Section */}
        <div className="text-center animate-bounce-subtle">
          <h1 className="text-5xl font-extrabold tracking-tight text-[#EC4899] drop-shadow-md font-['Fredoka_One'] uppercase leading-tight flex flex-col">
            <span className="text-white drop-shadow-[0_4px_4px_rgba(236,72,153,0.8)] stroke-black border-black text-6xl rotate-[-2deg]">Questerix</span>
            <span className="text-[#FDE047] drop-shadow-[0_4px_4px_rgba(251,146,60,0.8)] rotate-[2deg] text-4xl mt-2">Fractions</span>
          </h1>
          <p className="mt-4 text-[#A855F7] font-bold text-lg bg-white/60 px-4 py-1.5 rounded-full inline-block shadow-sm">
            A Sweet Math Adventure! 🧁
          </p>
        </div>

        {/* Hero Visual - Half Cupcake */}
        <div className="relative w-48 h-48 my-2 animate-float">
          {/* Sunburst background */}
          <div className="absolute inset-0 bg-[#FDE047] rounded-full opacity-40 animate-spin-slow"></div>
          
          <div className="absolute inset-0 flex items-center justify-center text-8xl drop-shadow-xl">
            {/* Left Half (Full color) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden w-1/2 left-0 pr-1 border-r-4 border-dashed border-white z-20">
              <span className="relative left-1/2 -ml-12">🧁</span>
            </div>
            {/* Right Half (Faded) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden w-1/2 right-0 pl-1 z-10 opacity-40 grayscale">
               <span className="relative right-1/2 -mr-12">🧁</span>
            </div>
            {/* 1/2 Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white text-[#EC4899] font-black text-3xl px-3 py-1 rounded-xl shadow-lg border-4 border-[#EC4899] rotate-[-5deg]">
              1/2
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-[280px] flex flex-col gap-4 mt-4">
          <button className="w-full relative group animate-pulse-glow rounded-2xl">
            <div className="absolute inset-0 bg-[#BE185D] rounded-2xl translate-y-2 group-active:translate-y-0 transition-transform"></div>
            <div className="relative bg-[#EC4899] border-4 border-white text-white font-black text-3xl py-4 rounded-2xl flex items-center justify-center gap-3 transform group-active:translate-y-2 transition-transform shadow-[0_10px_0_0_#BE185D]">
              <Play className="w-8 h-8 fill-white" />
              PLAY!
            </div>
          </button>

          <button className="w-full relative group mt-2">
            <div className="absolute inset-0 bg-[#059669] rounded-2xl translate-y-1.5 group-active:translate-y-0 transition-transform"></div>
            <div className="relative bg-[#34D399] border-4 border-white text-white font-black text-xl py-3 rounded-2xl flex items-center justify-center gap-2 transform group-active:translate-y-1.5 transition-transform shadow-[0_6px_0_0_#059669]">
              <ArrowRight className="w-6 h-6 stroke-[3]" />
              Continue
            </div>
          </button>

          <button className="w-full relative group mt-2">
            <div className="absolute inset-0 bg-[#7E22CE] rounded-2xl translate-y-1 group-active:translate-y-0 transition-transform"></div>
            <div className="relative bg-[#A855F7] border-4 border-white text-white font-bold text-lg py-2 rounded-2xl flex items-center justify-center gap-2 transform group-active:translate-y-1 transition-transform shadow-[0_4px_0_0_#7E22CE]">
              <Settings className="w-5 h-5" />
              Settings
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}

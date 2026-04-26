import React from "react";
import { Play, RotateCcw, Settings } from "lucide-react";

export function PieChartMenu() {
  return (
    <div className="w-[420px] h-[780px] bg-[#FFF8E7] flex items-center justify-center relative overflow-hidden font-['Nunito']">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;900&display=swap');
        
        .slice {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }
        
        .slice-play:hover {
          transform: translateY(8px);
        }
        .slice-play:active {
          transform: translateY(4px);
        }
        
        .slice-continue:hover {
          transform: translate(-6px, -6px);
        }
        .slice-continue:active {
          transform: translate(-3px, -3px);
        }
        
        .slice-settings:hover {
          transform: translate(6px, -6px);
        }
        .slice-settings:active {
          transform: translate(3px, -3px);
        }
      `}} />

      {/* Subtle background decoration to emphasize the math theme */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-4xl font-black text-orange-400 rotate-12">½</div>
        <div className="absolute bottom-20 right-10 text-5xl font-black text-blue-400 -rotate-12">⅓</div>
        <div className="absolute top-40 right-12 text-3xl font-black text-green-400 rotate-45">¼</div>
        <div className="absolute bottom-40 left-8 text-4xl font-black text-purple-400 -rotate-12">⅛</div>
      </div>

      <div className="relative w-full max-w-[400px] aspect-square z-10 px-4">
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-xl overflow-visible">
          
          {/* PLAY SLICE (1/2, Bottom half) */}
          <g className="slice slice-play">
            <path 
              d="M 200 200 L 380 200 A 180 180 0 0 1 20 200 Z" 
              fill="#F43F5E" 
              stroke="#000" 
              strokeWidth="8" 
              strokeLinejoin="round" 
            />
            {/* Play Label */}
            <foreignObject x="80" y="230" width="240" height="100">
              <div className="w-full h-full flex flex-col items-center justify-center text-white pointer-events-none">
                <Play className="w-12 h-12 mb-1 fill-white" />
                <span className="font-['Fredoka_One'] text-4xl stroke-black drop-shadow-[0_2px_0_#000]">Play!</span>
                <span className="font-black text-lg bg-black/20 px-3 py-0.5 rounded-full mt-1">½</span>
              </div>
            </foreignObject>
          </g>

          {/* CONTINUE SLICE (1/3, Top left: 180 to 300 deg) */}
          {/* 300 deg: x = 200 + 180*0.5 = 290, y = 200 - 180*0.866 = 44.1155 */}
          <g className="slice slice-continue">
            <path 
              d="M 200 200 L 20 200 A 180 180 0 0 1 290 44.1155 Z" 
              fill="#3B82F6" 
              stroke="#000" 
              strokeWidth="8" 
              strokeLinejoin="round" 
            />
            {/* Continue Label */}
            {/* Center approx at angle 240: x=200-180*0.5=110, y=200-180*0.866=44 */}
            <foreignObject x="40" y="60" width="140" height="120">
              <div className="w-full h-full flex flex-col items-center justify-center text-white pointer-events-none -rotate-12">
                <RotateCcw className="w-8 h-8 mb-1 stroke-[3]" />
                <span className="font-['Fredoka_One'] text-2xl drop-shadow-[0_2px_0_#000]">Continue</span>
                <span className="font-black text-sm bg-black/20 px-2 py-0.5 rounded-full mt-1">⅓</span>
              </div>
            </foreignObject>
          </g>

          {/* SETTINGS SLICE (1/6, Top right: 300 to 360 deg) */}
          <g className="slice slice-settings">
            <path 
              d="M 200 200 L 290 44.1155 A 180 180 0 0 1 380 200 Z" 
              fill="#10B981" 
              stroke="#000" 
              strokeWidth="8" 
              strokeLinejoin="round" 
            />
            {/* Settings Label */}
            {/* Center approx at angle 330: x=200+180*0.866=355, y=200-180*0.5=110 */}
            <foreignObject x="240" y="80" width="120" height="100">
              <div className="w-full h-full flex flex-col items-center justify-center text-white pointer-events-none rotate-12">
                <Settings className="w-8 h-8 mb-1 stroke-[3]" />
                <span className="font-['Fredoka_One'] text-xl drop-shadow-[0_2px_0_#000]">Settings</span>
                <span className="font-black text-xs bg-black/20 px-2 py-0.5 rounded-full mt-1">⅙</span>
              </div>
            </foreignObject>
          </g>

          {/* CENTRAL HUB */}
          <g className="pointer-events-none">
            <circle cx="200" cy="200" r="75" fill="white" stroke="#000" strokeWidth="8" />
            <circle cx="200" cy="200" r="60" fill="#FFF8E7" stroke="#E5E7EB" strokeWidth="4" strokeDasharray="6 6" />
            <foreignObject x="130" y="130" width="140" height="140">
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-2">
                <h1 className="font-['Fredoka_One'] text-[22px] leading-tight text-orange-500 drop-shadow-sm">
                  Questerix<br/>Fractions
                </h1>
                <p className="text-xs font-bold text-gray-500 mt-1 leading-tight">
                  A math adventure!
                </p>
              </div>
            </foreignObject>
          </g>

        </svg>
      </div>
      
      {/* Decorative pizza/pie crust crumbs below */}
      <div className="absolute bottom-8 text-center w-full px-8 text-gray-400 font-bold text-sm tracking-widest uppercase opacity-50">
        Choose your slice
      </div>
    </div>
  );
}

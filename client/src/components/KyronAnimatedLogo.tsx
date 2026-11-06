import React from 'react';

export interface KyronAnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}

/**
 * KyronAnimatedLogo — The official three-layered animated KYRON brand identity.
 * Features:
 * - Central 3D KYRON emblem floating in the middle
 * - Three independent translucent rounded geometric plates offset and slightly rotated
 * - Subtle multi-axis floating, independent harmonic rotation, and luminous amber glow
 * - Dynamic light/dark theme adaptation (warm translucent peach/amber glass in light mode,
 *   luminous smoked obsidian glass with glowing neon orange edge backlight in dark mode)
 * - Complete accessibility support with reduced-motion compliance
 */
export function KyronAnimatedLogo({
  className = '',
  size = 'lg',
}: KyronAnimatedLogoProps) {
  return (
    <div
      role="img"
      aria-label="Animated KYRON Three-Layered Logo"
      className={`relative flex items-center justify-center select-none overflow-visible ${className}`}
    >
      {/* ================= AMBIENT ORANGE GLOW ================= */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[440px] md:w-[520px] h-[340px] sm:h-[440px] md:h-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.32)_0%,rgba(251,146,60,0.18)_40%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.52)_0%,rgba(234,88,12,0.28)_45%,transparent_70%)] animate-kyron-glow-pulse filter blur-2xl"
      />

      {/* Container with perspective for 3D depth */}
      <div className="relative w-[300px] sm:w-[380px] md:w-[440px] h-[240px] sm:h-[300px] md:h-[350px] flex items-center justify-center">
        
        {/* ================= LAYER 1: BACK PLATE (Tilted ~-20°) ================= */}
        <div
          aria-hidden="true"
          className="absolute w-[280px] sm:w-[350px] md:w-[410px] h-[190px] sm:h-[240px] md:h-[280px] rounded-[32px] sm:rounded-[40px] md:rounded-[48px] bg-gradient-to-br from-[#FED7AA]/50 via-[#FDBA74]/35 to-[#FFEDD5]/20 dark:from-[#1D0C04]/80 dark:via-[#130702]/70 dark:to-[#0A0401]/85 backdrop-blur-md border border-[#FDBA74]/50 dark:border-[#F97316]/50 shadow-[0_20px_50px_-10px_rgba(249,115,22,0.22)] dark:shadow-[0_0_45px_rgba(249,115,22,0.35),inset_0_1px_2px_rgba(255,255,255,0.1)] animate-kyron-plate-back transition-colors duration-300 pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          {/* Subtle specular sheen */}
          <div className="absolute inset-0 rounded-[32px] sm:rounded-[40px] md:rounded-[48px] bg-gradient-to-tr from-transparent via-white/20 dark:via-[#F97316]/10 to-transparent pointer-events-none" />
        </div>

        {/* ================= LAYER 2: MIDDLE PLATE (Tilted ~+18°) ================= */}
        <div
          aria-hidden="true"
          className="absolute w-[255px] sm:w-[325px] md:w-[380px] h-[175px] sm:h-[220px] md:h-[255px] rounded-[28px] sm:rounded-[36px] md:rounded-[42px] bg-gradient-to-tr from-white/60 via-[#FFEDD5]/40 to-[#FED7AA]/30 dark:from-[#240F05]/85 dark:via-[#170902]/75 dark:to-[#0E0502]/85 backdrop-blur-lg border-2 border-[#FB923C]/70 dark:border-2 dark:border-[#F97316]/80 shadow-[0_20px_50px_-10px_rgba(249,115,22,0.25)] dark:shadow-[0_0_45px_rgba(249,115,22,0.45),inset_0_1px_2px_rgba(251,146,60,0.3)] animate-kyron-plate-mid transition-colors duration-300 pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          {/* Internal glass highlight */}
          <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[28px] sm:rounded-t-[36px] md:rounded-t-[42px] bg-gradient-to-b from-white/40 dark:from-[#FB923C]/20 to-transparent pointer-events-none" />
        </div>

        {/* ================= LAYER 3: FRONT PLATE (Tilted ~+8°) ================= */}
        <div
          aria-hidden="true"
          className="absolute w-[230px] sm:w-[295px] md:w-[345px] h-[160px] sm:h-[200px] md:h-[235px] rounded-[24px] sm:rounded-[32px] md:rounded-[38px] bg-gradient-to-br from-white/80 via-[#FFF7ED]/70 to-[#FED7AA]/50 dark:from-[#2A1206]/85 dark:via-[#1A0B03]/80 dark:to-[#110602]/85 backdrop-blur-xl border border-white/90 border-b-2 border-r-2 border-b-[#F97316] border-r-[#FB923C]/80 dark:border-2 dark:border-[#F97316] shadow-[0_25px_60px_-10px_rgba(249,115,22,0.35),0_8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_0_50px_rgba(249,115,22,0.6),inset_0_1px_2px_rgba(255,255,255,0.25)] animate-kyron-plate-front transition-colors duration-300 pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          {/* Glossy top bevel reflection */}
          <div className="absolute inset-x-3 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white dark:via-[#FDBA74] to-transparent opacity-80" />
        </div>

        {/* ================= CENTRAL SYMBOL: KYRON 3D EMBLEM ================= */}
        <div
          className="relative z-20 flex items-center justify-center animate-kyron-logo-float"
          style={{ willChange: 'transform' }}
        >
          <img
            src="/logo.png"
            alt="KYRON Emblem"
            className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:scale-105"
            draggable={false}
          />
        </div>

      </div>
    </div>
  );
}

export default KyronAnimatedLogo;


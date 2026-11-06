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
          className="absolute w-[260px] sm:w-[330px] md:w-[380px] h-[170px] sm:h-[220px] md:h-[250px] rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-[#FED7AA]/45 via-[#FDBA74]/30 to-[#FFEDD5]/20 dark:from-[#241005]/90 dark:via-[#1A0A03]/75 dark:to-[#0D0502]/85 backdrop-blur-md border border-white/60 dark:border-[#F97316]/40 shadow-[0_20px_50px_-10px_rgba(249,115,22,0.25)] dark:shadow-[0_0_60px_-5px_rgba(249,115,22,0.45),inset_0_1px_2px_rgba(255,255,255,0.12)] animate-kyron-plate-back transition-colors duration-300"
          style={{ willChange: 'transform' }}
        >
          {/* Subtle specular sheen */}
          <div className="absolute inset-0 rounded-[28px] sm:rounded-[36px] bg-gradient-to-tr from-transparent via-white/20 dark:via-[#F97316]/10 to-transparent pointer-events-none" />
        </div>

        {/* ================= LAYER 2: MIDDLE PLATE (Tilted ~+16°) ================= */}
        <div
          aria-hidden="true"
          className="absolute w-[230px] sm:w-[300px] md:w-[340px] h-[155px] sm:h-[200px] md:h-[230px] rounded-[24px] sm:rounded-[32px] bg-gradient-to-tr from-white/75 via-[#FFF7ED]/55 to-white/40 dark:from-[#1D0C05]/95 dark:via-[#2A1207]/75 dark:to-[#140803]/90 backdrop-blur-lg border border-white/80 dark:border-[#F97316]/55 shadow-[0_25px_60px_-15px_rgba(249,115,22,0.3)] dark:shadow-[0_0_45px_-5px_rgba(249,115,22,0.4),inset_0_1px_2px_rgba(251,146,60,0.3)] animate-kyron-plate-mid transition-colors duration-300"
          style={{ willChange: 'transform' }}
        >
          {/* Internal glass highlight */}
          <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[24px] sm:rounded-t-[32px] bg-gradient-to-b from-white/35 dark:from-[#FB923C]/15 to-transparent pointer-events-none" />
        </div>

        {/* ================= LAYER 3: FRONT PLATE (Tilted ~-5°) ================= */}
        <div
          aria-hidden="true"
          className="absolute w-[205px] sm:w-[265px] md:w-[300px] h-[140px] sm:h-[180px] md:h-[205px] rounded-[20px] sm:rounded-[26px] bg-gradient-to-br from-white/85 via-white/55 to-white/25 dark:from-[#200E05]/95 dark:via-[#160903]/85 dark:to-[#2B1307]/70 backdrop-blur-xl border border-white dark:border-[#FB923C]/65 shadow-[0_30px_70px_-20px_rgba(249,115,22,0.35)] dark:shadow-[0_0_40px_-5px_rgba(249,115,22,0.45),inset_0_1px_2px_rgba(255,255,255,0.25)] animate-kyron-plate-front transition-colors duration-300"
          style={{ willChange: 'transform' }}
        >
          {/* Glossy top bevel reflection */}
          <div className="absolute inset-x-3 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white dark:via-[#FDBA74] to-transparent opacity-75" />
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

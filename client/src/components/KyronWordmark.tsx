import React from 'react';

export interface KyronWordmarkProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
  orangeColor?: string;
}

/**
 * KyronWordmark — Razor-sharp SVG typography matching the official futuristic geometric KYRON wordmark.
 * Direct 1:1 recreation from the typography master reference (media_1793968864650_686b053c.jpg).
 * Features:
 * - Geometric glyphs for K, Y, R, O, N matching exact stroke proportions and kerning
 * - Distinctive horizontal cut/notch in the letter R between the top bar and lower stem
 * - Signature vibrant orange (#F97316) lower-left vertical stem on the R
 * - Adaptive light/dark rendering via `currentColor`
 */
export function KyronWordmark({
  className = 'h-5 w-auto text-[#171717] dark:text-white',
  color = 'currentColor',
  orangeColor = '#F97316',
  ...props
}: KyronWordmarkProps) {
  return (
    <svg
      viewBox="0 0 916 135"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="KYRON"
      className={className}
      {...props}
    >
      {/* Letter K */}
      {/* Left vertical stem */}
      <rect x="0" y="0" width="31" height="135" rx="1.5" fill={color} />
      {/* Chevron diagonal arms */}
      <polygon
        points="109,0 146,0 48,67 146,135 109,135 31,74 31,60"
        fill={color}
      />

      {/* Letter Y */}
      {/* Symmetrical diagonal arms and vertical stem */}
      <polygon
        points="176,0 210,0 258,66 306,0 340,0 273,74 273,135 243,135 243,74"
        fill={color}
      />

      {/* Letter R */}
      {/* Upper floating bar, rounded outer loop, inner counter, and diagonal leg */}
      <path
        fill={color}
        d="M 379 0 H 495 C 517 0, 527 10, 527 26 V 42 C 527 56, 517 66, 495 66 H 455 L 526 135 H 490 L 430 66 H 414 V 44 H 488 C 499 44, 503 38, 503 32 V 22 C 503 16, 499 16, 488 16 H 379 Z"
      />
      {/* Signature Accent: Vibrant orange lower-left vertical stem below the notch */}
      <rect x="379" y="66" width="26" height="69" rx="2" fill={orangeColor} />

      {/* Letter O (Futuristic squircle) */}
      <path
        fill={color}
        fillRule="evenodd"
        d="M 595 0 H 683 A 32 32 0 0 1 715 32 V 103 A 32 32 0 0 1 683 135 H 595 A 32 32 0 0 1 563 103 V 32 A 32 32 0 0 1 595 0 Z M 607 27 H 671 A 14 14 0 0 1 685 41 V 94 A 14 14 0 0 1 671 108 H 607 A 14 14 0 0 1 593 94 V 41 A 14 14 0 0 1 607 27 Z"
      />

      {/* Letter N (Geometric vertical stems & diagonal bridge) */}
      <rect x="763" y="0" width="31" height="135" rx="1.5" fill={color} />
      <rect x="878" y="0" width="31" height="135" rx="1.5" fill={color} />
      <polygon
        points="763,0 802,0 878,107 878,135 839,135 763,30"
        fill={color}
      />
    </svg>
  );
}

export default KyronWordmark;

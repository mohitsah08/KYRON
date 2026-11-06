import React from 'react';

export interface KyronWordmarkProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  height?: number | string;
  color?: string;
  orangeColor?: string;
}

/**
 * KyronWordmark — Razor-sharp SVG typography matching the official futuristic geometric KYRON wordmark.
 * Features:
 * - Geometric modern glyphs for K, Y, R, O, N
 * - Distinctive notch/cut in the letter R
 * - Signature vibrant orange (#F97316) lower-left vertical stem
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
      viewBox="0 0 915 134"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="KYRON"
      className={className}
      {...props}
    >
      {/* Letter K */}
      <rect x="0" y="0" width="29" height="134" rx="1.5" fill={color} />
      <polygon points="105,0 142,0 74,67 142,134 105,134 29,67" fill={color} />

      {/* Letter Y */}
      <polygon points="175,0 213,0 257,51 302,0 340,0 271,82 271,134 243,134 243,82" fill={color} />

      {/* Letter R */}
      {/* Upper floating bar, rounded outer loop, inner loop, and diagonal leg */}
      <path
        fill={color}
        d="M 381 0 H 485 C 506 0, 513 8, 513 26 V 48 C 513 62, 504 68, 485 68 H 450 L 523 134 H 485 L 442 68 H 409 V 56 H 480 C 492 56, 496 50, 496 40 V 34 C 496 26, 492 26, 480 26 H 381 Z"
      />
      {/* Signature Accent: Vibrant orange lower-left vertical stem below the notch */}
      <rect x="381" y="58" width="28" height="76" rx="2.5" fill={orangeColor} />

      {/* Letter O (Futuristic squircle) */}
      <path
        fill={color}
        fillRule="evenodd"
        d="M 595 0 H 687 A 30 30 0 0 1 717 30 V 104 A 30 30 0 0 1 687 134 H 595 A 30 30 0 0 1 565 104 V 30 A 30 30 0 0 1 595 0 Z M 607 27 H 675 A 12 12 0 0 1 687 39 V 94 A 12 12 0 0 1 675 106 H 607 A 12 12 0 0 1 595 94 V 39 A 12 12 0 0 1 607 27 Z"
      />

      {/* Letter N (Sharp geometric diagonal) */}
      <polygon points="765,0 802,0 883,105 883,0 911,0 911,134 874,134 794,29 794,134 765,134" fill={color} />
    </svg>
  );
}

export default KyronWordmark;

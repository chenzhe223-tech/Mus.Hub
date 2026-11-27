import React from 'react';

interface BrandMotionBadgeProps {
  isPlaying: boolean;
  size?: number;
}

/**
 * Pixel2Motion-inspired semantic layered SVG vinyl emblem for the studio header.
 * Features animated tonearm tracking & smooth disc spin without external assets.
 */
export const BrandMotionBadge: React.FC<BrandMotionBadgeProps> = ({ isPlaying, size = 38 }) => {
  return (
    <div
      className="relative flex items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--bg-panel)] shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size - 6}
        height={size - 6}
        fill="none"
        aria-hidden="true"
        className="overflow-visible"
      >
        <g
          className={`origin-center ${isPlaying ? 'animate-spin' : 'group-hover:rotate-45 transition-transform duration-500'}`}
          style={{ animationDuration: '4.8s', transformOrigin: '32px 32px' }}
        >
          <circle cx="32" cy="32" r="26" fill="#141822" stroke="var(--accent)" strokeWidth="1.8" />
          <circle
            cx="32"
            cy="32"
            r="20"
            stroke="#f2ede4"
            strokeOpacity="0.24"
            strokeWidth="1"
            strokeDasharray="36 8 24 10"
          />
          <circle
            cx="32"
            cy="32"
            r="14"
            stroke="#f2ede4"
            strokeOpacity="0.28"
            strokeWidth="1"
            strokeDasharray="22 8 16 10"
          />
          <circle cx="32" cy="32" r="8.5" fill="var(--accent)" />
          <circle cx="32" cy="32" r="2.3" fill="#0f1218" />
        </g>

        {/* Articulated Tonearm (Disney anticipation/follow-through style angle shift) */}
        <g
          className="transition-transform duration-500 ease-out"
          style={{
            transformOrigin: '52px 12px',
            transform: isPlaying ? 'rotate(16deg)' : 'rotate(0deg)',
          }}
        >
          <circle cx="52" cy="12" r="3.2" fill="#27272a" stroke="var(--accent)" strokeWidth="1.2" />
          <path
            d="M 52 12 L 49 34 L 44 40"
            stroke="var(--ink-primary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="40"
            y="38"
            width="5"
            height="7"
            rx="1.2"
            transform="rotate(24 42.5 41.5)"
            fill="var(--heart)"
          />
        </g>
      </svg>

      <span
        className={`w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-0.5 ${
          isPlaying ? 'bg-[var(--heart)] animate-pulse' : 'bg-[var(--ink-muted)]'
        }`}
      />
    </div>
  );
};

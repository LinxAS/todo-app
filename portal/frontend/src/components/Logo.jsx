import React from 'react';

// Linx-AS brand logo — 4 blue tiles with gold centre sphere.
// Accepts a `size` prop (px); defaults to 32.
export default function LinxasLogo({ size = 32 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                {/* Blue tile gradient — light at top, deeper at bottom */}
                <linearGradient id="ll-tile" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#BDE3F7" />
                    <stop offset="45%"  stopColor="#5AB8E8" />
                    <stop offset="100%" stopColor="#2278BF" />
                </linearGradient>
                {/* Gold sphere — radial, white highlight top-left */}
                <radialGradient id="ll-gold" cx="36%" cy="32%" r="58%">
                    <stop offset="0%"   stopColor="white" />
                    <stop offset="28%"  stopColor="#FFE44D" />
                    <stop offset="72%"  stopColor="#F5A500" />
                    <stop offset="100%" stopColor="#D97000" />
                </radialGradient>
            </defs>

            {/* Four tiles */}
            <rect x="4"  y="4"  width="43" height="43" rx="9" fill="url(#ll-tile)" />
            <rect x="53" y="4"  width="43" height="43" rx="9" fill="url(#ll-tile)" />
            <rect x="4"  y="53" width="43" height="43" rx="9" fill="url(#ll-tile)" />
            <rect x="53" y="53" width="43" height="43" rx="9" fill="url(#ll-tile)" />

            {/* White ring separating tiles from sphere */}
            <circle cx="50" cy="50" r="14" fill="white" />

            {/* Gold sphere */}
            <circle cx="50" cy="50" r="11" fill="url(#ll-gold)" />
        </svg>
    );
}

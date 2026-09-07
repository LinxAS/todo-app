import React from 'react';

// Linx-AS brand logo — 4 blue tiles with gold centre sphere.
export function LinxasLogo({ size = 32 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id="ll-tile" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#BDE3F7" />
                    <stop offset="45%"  stopColor="#5AB8E8" />
                    <stop offset="100%" stopColor="#2278BF" />
                </linearGradient>
                <radialGradient id="ll-gold" cx="36%" cy="32%" r="58%">
                    <stop offset="0%"   stopColor="white" />
                    <stop offset="28%"  stopColor="#FFE44D" />
                    <stop offset="72%"  stopColor="#F5A500" />
                    <stop offset="100%" stopColor="#D97000" />
                </radialGradient>
            </defs>
            <rect x="4"  y="4"  width="43" height="43" rx="9" fill="url(#ll-tile)" />
            <rect x="53" y="4"  width="43" height="43" rx="9" fill="url(#ll-tile)" />
            <rect x="4"  y="53" width="43" height="43" rx="9" fill="url(#ll-tile)" />
            <rect x="53" y="53" width="43" height="43" rx="9" fill="url(#ll-tile)" />
            <circle cx="50" cy="50" r="14" fill="white" />
            <circle cx="50" cy="50" r="11" fill="url(#ll-gold)" />
        </svg>
    );
}

const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const EditIcon = (p) => (
    <svg {...base} {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const TrashIcon = (p) => (
    <svg {...base} {...p}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
);
export const ShareIcon = (p) => (
    <svg {...base} {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4" /><path d="M15.4 6.5l-6.8 4" /></svg>
);
export const CloseIcon = (p) => (
    <svg {...base} {...p}><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
);
export const SearchIcon = (p) => (
    <svg {...base} {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
export const PlusIcon = (p) => (
    <svg {...base} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
export const UsersIcon = (p) => (
    <svg {...base} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);

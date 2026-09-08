import React from 'react';

export function LinxasLogo({ size = 32 }) {
    return (
        <img
            src="/defects/logo.png"
            alt="Linx-AS"
            width={size}
            height={size}
            style={{ objectFit: 'contain' }}
        />
    );
}

export function BugIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 8a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0v-3a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M8 12H4M20 12h-4M8 9l-2-2M16 9l2-2M8 18l-2 2M16 18l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
    );
}

export function PlusIcon({ width = 20, height = 20 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    );
}

export function CloseIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
    );
}

export function EditIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export function TrashIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 4.5h11M6 4.5V3h4v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export function SearchIcon({ className = '' }) {
    return (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    );
}

export function PaperclipIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M13.5 7.5L7 14a4 4 0 0 1-5.657-5.657l7-7a2.5 2.5 0 0 1 3.535 3.535L5.5 11.5A1 1 0 0 1 4 10l6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export function UploadIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
    );
}

export function ExternalLinkIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M6 2H2v10h10V8M8 2h4v4M8 6l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export function CommentIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M14 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2v3l3-3h7a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
    );
}

export function ProjectIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
    );
}

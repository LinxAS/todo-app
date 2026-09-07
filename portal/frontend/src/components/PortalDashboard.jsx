import React from 'react';
import { clearToken } from '../api/client';

function TasksIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#EAF0EE"/>
            <path d="M10 16.5L14 20.5L22 12" stroke="#2D5A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 10h5M10 22h5" stroke="#2D5A4A" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#EAF0EE"/>
            <circle cx="13" cy="13" r="3.5" stroke="#2D5A4A" strokeWidth="1.8"/>
            <path d="M6 23c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#2D5A4A" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="22" cy="12" r="2.5" stroke="#2D5A4A" strokeWidth="1.5" opacity="0.6"/>
            <path d="M26 21c0-2.21-1.79-4-4-4" stroke="#2D5A4A" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        </svg>
    );
}

function AppTile({ icon, title, description, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="text-left w-full bg-surface border border-border rounded-xl p-5 hover:border-accent hover:shadow-sm transition-all group"
        >
            <div className="mb-3">{icon}</div>
            <h3 className="font-bold text-ink text-base mb-1 group-hover:text-accent transition-colors">{title}</h3>
            <p className="text-sm text-muted leading-relaxed">{description}</p>
        </button>
    );
}

export default function PortalDashboard({ user, onLogout, onNavigate }) {
    function handleLogout() {
        clearToken();
        onLogout();
    }

    return (
        <div className="min-h-screen bg-bg">
            <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                            <rect width="28" height="28" rx="7" fill="#2D5A4A"/>
                            <path d="M8 14.5L12 18.5L20 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-lg font-extrabold tracking-tight text-ink">Linx-AS</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted hidden sm:inline">{user.username}</span>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="text-sm text-muted hover:text-ink underline underline-offset-2"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-ink tracking-tight">
                        Welcome back, {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
                    </h1>
                    <p className="text-sm text-muted mt-1">Select an application to get started.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AppTile
                        icon={<TasksIcon />}
                        title="Tasks"
                        description="Manage your work and personal to-do lists with priorities, deadlines, and sharing."
                        onClick={() => window.open('/todo/', '_blank')}
                    />

                    {user.is_admin && (
                        <AppTile
                            icon={<UsersIcon />}
                            title="User Management"
                            description="Create and manage portal users. Set admin roles and control access."
                            onClick={() => onNavigate('users')}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

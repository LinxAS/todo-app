import React, { useState } from 'react';
import { api, setToken } from '../api/client';

export default function LoginScreen({ onAuthenticated }) {
    const [mode, setMode] = useState('login'); // 'login' | 'setup'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const fn = mode === 'login' ? api.login : api.setup;
            const data = await fn(username.trim(), password);
            setToken(data.token);
            onAuthenticated(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
            <div className="w-full max-w-sm">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                            <rect width="28" height="28" rx="7" fill="#2D5A4A"/>
                            <path d="M8 14.5L12 18.5L20 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-2xl font-extrabold tracking-tight text-ink">Linx-AS</span>
                    </div>
                    <p className="text-muted text-sm mt-1">
                        {mode === 'login' ? 'Sign in to access the portal.' : 'Create your admin account to get started.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-ink mb-1">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            required
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        {mode === 'setup' && (
                            <p className="text-xs text-muted mt-1">At least 8 characters.</p>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-danger" role="alert">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full bg-accent hover:bg-accentmuted text-white text-sm font-semibold rounded-md py-2.5 transition-colors disabled:opacity-60"
                    >
                        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create admin account'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => { setMode(mode === 'login' ? 'setup' : 'login'); setError(''); }}
                    className="mt-4 text-sm text-muted hover:text-ink underline underline-offset-2"
                >
                    {mode === 'login' ? 'First time? Set up admin account' : 'Already have an account? Sign in'}
                </button>
            </div>
        </div>
    );
}

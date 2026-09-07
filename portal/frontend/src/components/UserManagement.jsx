import React, { useEffect, useState } from 'react';
import { api, clearToken } from '../api/client';

function Badge({ isAdmin }) {
    return isAdmin
        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-accent/10 text-accent">Admin</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-border text-muted">User</span>;
}

export default function UserManagement({ user, onBack, onLogout }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', is_admin: false });
    const [formError, setFormError] = useState('');
    const [formBusy, setFormBusy] = useState(false);

    useEffect(() => { loadUsers(); }, []);

    async function loadUsers() {
        try {
            const data = await api.listUsers();
            setUsers(data.users);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();
        setFormError('');
        setFormBusy(true);
        try {
            const data = await api.createUser(form);
            setUsers((prev) => [...prev, data.user]);
            setForm({ username: '', password: '', is_admin: false });
            setShowForm(false);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setFormBusy(false);
        }
    }

    async function handleToggleAdmin(u) {
        try {
            const data = await api.updateUser(u.id, { is_admin: !u.is_admin });
            setUsers((prev) => prev.map((x) => (x.id === u.id ? data.user : x)));
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleDelete(u) {
        if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
        try {
            await api.deleteUser(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
        } catch (err) {
            setError(err.message);
        }
    }

    function handleLogout() {
        clearToken();
        onLogout();
    }

    return (
        <div className="min-h-screen bg-bg">
            <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Portal
                        </button>
                        <span className="text-border">|</span>
                        <span className="text-base font-bold text-ink">User Management</span>
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

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-extrabold text-ink">Users</h1>
                    <button
                        type="button"
                        onClick={() => { setShowForm(true); setFormError(''); }}
                        className="bg-accent hover:bg-accentmuted text-white text-sm font-semibold rounded-md px-4 py-2 transition-colors"
                    >
                        + Add user
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                        {error}
                    </div>
                )}

                {/* Add user form */}
                {showForm && (
                    <form onSubmit={handleCreate} className="mb-6 bg-surface border border-border rounded-lg p-5 space-y-4">
                        <h2 className="font-semibold text-ink text-sm">New user</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-ink mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-ink mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.is_admin}
                                onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                                className="rounded border-border accent-accent"
                            />
                            <span className="text-sm text-ink">Grant admin role</span>
                        </label>
                        {formError && <p className="text-sm text-danger">{formError}</p>}
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={formBusy}
                                className="bg-accent hover:bg-accentmuted text-white text-sm font-semibold rounded-md px-4 py-2 transition-colors disabled:opacity-60"
                            >
                                {formBusy ? 'Creating…' : 'Create user'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="text-sm text-muted hover:text-ink px-4 py-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* User list */}
                {loading ? (
                    <p className="text-sm text-muted">Loading…</p>
                ) : (
                    <div className="bg-surface border border-border rounded-lg overflow-hidden">
                        {users.length === 0 ? (
                            <p className="text-sm text-muted p-5 text-center">No users found.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-bg">
                                        <th className="text-left px-4 py-3 font-semibold text-ink">Username</th>
                                        <th className="text-left px-4 py-3 font-semibold text-ink">Role</th>
                                        <th className="text-left px-4 py-3 font-semibold text-ink hidden sm:table-cell">Joined</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-bg/60 transition-colors">
                                            <td className="px-4 py-3 font-medium text-ink">
                                                {u.username}
                                                {u.id === user.id && (
                                                    <span className="ml-2 text-xs text-muted">(you)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3"><Badge isAdmin={u.is_admin} /></td>
                                            <td className="px-4 py-3 text-muted hidden sm:table-cell">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {u.id !== user.id && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleAdmin(u)}
                                                                className="text-xs text-muted hover:text-ink underline underline-offset-2"
                                                            >
                                                                {u.is_admin ? 'Remove admin' : 'Make admin'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(u)}
                                                                className="text-xs text-danger hover:text-danger/70 underline underline-offset-2"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

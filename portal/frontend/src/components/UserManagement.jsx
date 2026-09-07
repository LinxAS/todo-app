import React, { useEffect, useState } from 'react';
import { api, clearToken } from '../api/client';

function Badge({ isAdmin }) {
    return isAdmin
        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-accent/10 text-accent">Admin</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-border text-muted">User</span>;
}

const EMPTY_FORM = { username: '', password: '', first_name: '', last_name: '', is_admin: false };

function UserForm({ initial, onSubmit, onCancel, busy, error, mode }) {
    const [form, setForm] = useState(initial || EMPTY_FORM);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit(form);
    }

    return (
        <form onSubmit={handleSubmit} className="mb-6 bg-surface border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-ink text-sm">{mode === 'edit' ? 'Edit user' : 'New user'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-ink mb-1">First Name</label>
                    <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => set('first_name', e.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink mb-1">Last Name</label>
                    <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => set('last_name', e.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                        Username {mode === 'create' && <span className="text-danger">*</span>}
                    </label>
                    <input
                        type="text"
                        required={mode === 'create'}
                        disabled={mode === 'edit'}
                        value={form.username}
                        onChange={(e) => set('username', e.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-bg disabled:text-muted"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                        Password {mode === 'create' && <span className="text-danger">*</span>}
                        {mode === 'edit' && <span className="text-muted font-normal"> (leave blank to keep)</span>}
                    </label>
                    <input
                        type="password"
                        required={mode === 'create'}
                        minLength={8}
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={form.is_admin}
                    onChange={(e) => set('is_admin', e.target.checked)}
                    className="rounded border-border accent-accent"
                />
                <span className="text-sm text-ink">Grant admin role</span>
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={busy}
                    className="bg-accent hover:bg-accentmuted text-white text-sm font-semibold rounded-md px-4 py-2 transition-colors disabled:opacity-60"
                >
                    {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create user'}
                </button>
                <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-ink px-4 py-2">
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default function UserManagement({ user, onBack, onLogout }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [panel, setPanel] = useState(null); // null | 'create' | { ...user }
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState('');

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

    async function handleCreate(form) {
        setFormError('');
        setFormBusy(true);
        try {
            const data = await api.createUser(form);
            setUsers((prev) => [...prev, data.user]);
            setPanel(null);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setFormBusy(false);
        }
    }

    async function handleEdit(form) {
        setFormError('');
        setFormBusy(true);
        try {
            const patch = {
                first_name: form.first_name,
                last_name: form.last_name,
                is_admin: form.is_admin,
            };
            if (form.password) patch.password = form.password;
            const data = await api.updateUser(panel.id, patch);
            setUsers((prev) => prev.map((u) => (u.id === panel.id ? data.user : u)));
            setPanel(null);
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

    function fullName(u) {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
        return name || <span className="text-muted italic">—</span>;
    }

    function openEdit(u) {
        setPanel({ ...u, password: '' });
        setFormError('');
    }

    function openCreate() {
        setPanel('create');
        setFormError('');
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
                            onClick={() => { clearToken(); onLogout(); }}
                            className="text-sm text-muted hover:text-ink underline underline-offset-2"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-extrabold text-ink">Users</h1>
                    <button
                        type="button"
                        onClick={openCreate}
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

                {panel === 'create' && (
                    <UserForm
                        mode="create"
                        initial={EMPTY_FORM}
                        onSubmit={handleCreate}
                        onCancel={() => setPanel(null)}
                        busy={formBusy}
                        error={formError}
                    />
                )}

                {panel && panel !== 'create' && (
                    <UserForm
                        mode="edit"
                        initial={panel}
                        onSubmit={handleEdit}
                        onCancel={() => setPanel(null)}
                        busy={formBusy}
                        error={formError}
                    />
                )}

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
                                        <th className="text-left px-4 py-3 font-semibold text-ink">Name</th>
                                        <th className="text-left px-4 py-3 font-semibold text-ink">Username</th>
                                        <th className="text-left px-4 py-3 font-semibold text-ink">Role</th>
                                        <th className="text-left px-4 py-3 font-semibold text-ink hidden sm:table-cell">Joined</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-bg/60 transition-colors">
                                            <td className="px-4 py-3 text-ink">{fullName(u)}</td>
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
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(u)}
                                                        className="text-xs text-muted hover:text-ink underline underline-offset-2"
                                                    >
                                                        Edit
                                                    </button>
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

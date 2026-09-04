import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CloseIcon, UsersIcon } from './Icons';

export default function ShareModal({ task, onClose }) {
    const [username, setUsername] = useState('');
    const [shares, setShares] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.listShares(task.id).then((d) => setShares(d.shares)).catch(() => {});
    }, [task.id]);

    async function handleAdd(e) {
        e.preventDefault();
        if (!username.trim()) return;
        setBusy(true);
        setError('');
        try {
            await api.shareTask(task.id, username.trim());
            const d = await api.listShares(task.id);
            setShares(d.shares);
            setUsername('');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleRemove(userId) {
        await api.unshareTask(task.id, userId);
        setShares(shares.filter((s) => s.user_id !== userId));
    }

    return (
        <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4" onClick={onClose}>
            <div className="bg-surface w-full sm:max-w-sm sm:rounded-lg rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                        <UsersIcon /> Share task
                    </h2>
                    <button type="button" onClick={onClose} className="p-1 text-muted hover:text-ink" aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>
                <p className="text-sm text-muted mb-4 truncate">"{task.title}"</p>

                <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                        type="submit"
                        disabled={busy}
                        className="rounded-md bg-accent hover:bg-accentmuted text-white px-4 text-sm font-semibold disabled:opacity-60"
                    >
                        Add
                    </button>
                </form>
                {error && <p className="text-sm text-danger mb-3" role="alert">{error}</p>}

                <div className="space-y-1.5">
                    {shares.length === 0 && (
                        <p className="text-sm text-muted">Not shared with anyone yet.</p>
                    )}
                    {shares.map((s) => (
                        <div key={s.user_id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                            <span className="text-sm text-ink">{s.username}</span>
                            <button
                                type="button"
                                onClick={() => handleRemove(s.user_id)}
                                className="text-xs text-muted hover:text-danger underline underline-offset-2"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

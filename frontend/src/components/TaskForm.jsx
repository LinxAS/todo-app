import React, { useState } from 'react';
import { CloseIcon } from './Icons';

const emptyTask = { title: '', description: '', category: 'personal', priority: 'medium', deadline: '' };

export default function TaskForm({ initial, onSave, onClose }) {
    const [form, setForm] = useState(initial ? {
        title: initial.title,
        description: initial.description || '',
        category: initial.category,
        priority: initial.priority,
        deadline: initial.deadline ? initial.deadline.slice(0, 10) : '',
    } : emptyTask);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const isEdit = Boolean(initial);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title.trim()) {
            setError('Title is required');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await onSave({ ...form, deadline: form.deadline || null });
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4" onClick={onClose}>
            <div
                className="bg-surface w-full sm:max-w-md sm:rounded-lg rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-ink">{isEdit ? 'Edit task' : 'New task'}</h2>
                    <button type="button" onClick={onClose} className="p-1 text-muted hover:text-ink" aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1" htmlFor="title">Title</label>
                        <input
                            id="title"
                            type="text"
                            required
                            autoFocus
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink mb-1" htmlFor="description">Notes</label>
                        <textarea
                            id="description"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1" htmlFor="category">Category</label>
                            <select
                                id="category"
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                                <option value="personal">Personal</option>
                                <option value="work">Work</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1" htmlFor="priority">Priority</label>
                            <select
                                id="priority"
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink mb-1" htmlFor="deadline">Deadline</label>
                        <input
                            id="deadline"
                            type="date"
                            value={form.deadline}
                            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    {error && <p className="text-sm text-danger" role="alert">{error}</p>}

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium text-ink hover:bg-bg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="flex-1 rounded-md bg-accent hover:bg-accentmuted text-white py-2.5 text-sm font-semibold disabled:opacity-60"
                        >
                            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

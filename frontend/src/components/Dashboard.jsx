import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, clearToken } from '../api/client';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import ShareModal from './ShareModal';
import FilterBar from './FilterBar';
import { PlusIcon, CloseIcon } from './Icons';

export default function Dashboard({ user, onLogout }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ search: '', category: '', priority: '', scope: 'mine' });
    const [formTask, setFormTask] = useState(null); // null = closed, {} = new, task = edit
    const [shareTask, setShareTask] = useState(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const loadTasks = useCallback(async (activeFilters) => {
        try {
            const data = await api.listTasks(activeFilters);
            setTasks(data.tasks);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce search so we don't fire a request on every keystroke, while
    // category/priority/scope changes refetch immediately.
    useEffect(() => {
        const handle = setTimeout(() => loadTasks(filters), filters.search ? 250 : 0);
        return () => clearTimeout(handle);
    }, [filters, loadTasks]);

    const pending = useMemo(() => tasks.filter((t) => t.status === 'pending'), [tasks]);
    const completed = useMemo(() => tasks.filter((t) => t.status === 'completed'), [tasks]);

    // Optimistic toggle: flip status locally first so checking off a task feels
    // instant, then sync with the server and roll back only on failure.
    async function handleToggle(task) {
        const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
        try {
            await api.updateTask(task.id, { status: nextStatus });
        } catch (err) {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
            setError(err.message);
        }
    }

    async function handleSaveTask(form) {
        if (formTask && formTask.id) {
            const { task } = await api.updateTask(formTask.id, form);
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        } else {
            const { task } = await api.createTask(form);
            setTasks((prev) => [...prev, task]);
        }
        setFormTask(null);
    }

    async function handleDelete(task) {
        if (!window.confirm(`Delete "${task.title}"?`)) return;
        const prevTasks = tasks;
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        try {
            await api.deleteTask(task.id);
        } catch (err) {
            setTasks(prevTasks);
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
                    <h1 className="text-xl font-extrabold tracking-tight text-ink">Tasks</h1>
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

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
                {/* Desktop filter sidebar */}
                <aside className="hidden md:block w-56 shrink-0">
                    <FilterBar filters={filters} onChange={setFilters} />
                </aside>

                {/* Mobile filter toggle + drawer */}
                <div className="md:hidden -mt-2">
                    <button
                        type="button"
                        onClick={() => setMobileFiltersOpen(true)}
                        className="text-sm font-medium text-accent underline underline-offset-2"
                    >
                        Filters {(filters.category || filters.priority || filters.scope !== 'mine') ? '•' : ''}
                    </button>
                </div>
                {mobileFiltersOpen && (
                    <div className="fixed inset-0 bg-ink/40 z-40 md:hidden" onClick={() => setMobileFiltersOpen(false)}>
                        <div className="absolute right-0 top-0 bottom-0 w-72 bg-surface p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-ink">Filters</h2>
                                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="p-1 text-muted"><CloseIcon /></button>
                            </div>
                            <FilterBar filters={filters} onChange={setFilters} />
                        </div>
                    </div>
                )}

                <main className="flex-1 min-w-0">
                    {error && (
                        <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <p className="text-sm text-muted">Loading…</p>
                    ) : (
                        <div className="space-y-8">
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">
                                        Pending <span className="text-muted font-normal">({pending.length})</span>
                                    </h2>
                                </div>
                                {pending.length === 0 ? (
                                    <p className="text-sm text-muted border border-dashed border-border rounded-md py-6 text-center">
                                        Nothing pending. Add a task to get started.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {pending.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                onToggle={handleToggle}
                                                onEdit={setFormTask}
                                                onDelete={handleDelete}
                                                onShare={setShareTask}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {completed.length > 0 && (
                                <section>
                                    <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                                        Completed <span className="font-normal">({completed.length})</span>
                                    </h2>
                                    <ul className="space-y-2">
                                        {completed.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                onToggle={handleToggle}
                                                onEdit={setFormTask}
                                                onDelete={handleDelete}
                                                onShare={setShareTask}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <button
                type="button"
                onClick={() => setFormTask({})}
                aria-label="Add task"
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent hover:bg-accentmuted text-white shadow-lg flex items-center justify-center"
            >
                <PlusIcon width={22} height={22} />
            </button>

            {formTask !== null && (
                <TaskForm
                    initial={formTask.id ? formTask : null}
                    onSave={handleSaveTask}
                    onClose={() => setFormTask(null)}
                />
            )}
            {shareTask && (
                <ShareModal task={shareTask} onClose={() => setShareTask(null)} />
            )}
        </div>
    );
}

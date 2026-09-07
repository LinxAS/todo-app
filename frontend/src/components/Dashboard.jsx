import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import FilterBar from './FilterBar';
import { PlusIcon, CloseIcon, LinxasLogo } from './Icons';

export default function Dashboard({ user, onLogout }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ search: '', status: ['new', 'in_progress'], priority: '', scope: 'mine', deadlineMode: '', deadlineFrom: '', deadlineTo: '' });
    const [formTask, setFormTask] = useState(null); // null = closed, {} = new, task = edit
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // Admin view state
    const [adminUsers, setAdminUsers] = useState([]);
    const [adminViewUserId, setAdminViewUserId] = useState('');
    const [adminTasks, setAdminTasks] = useState([]);
    const [adminLoading, setAdminLoading] = useState(false);

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

    // Fetch all portal users once for the admin dropdown
    useEffect(() => {
        if (!user.is_admin) return;
        api.listUsers().then((d) => setAdminUsers(d.users)).catch(() => {});
    }, [user.is_admin]);

    // Reload admin tasks whenever the selected user changes
    useEffect(() => {
        if (!user.is_admin || !adminViewUserId) { setAdminTasks([]); return; }
        setAdminLoading(true);
        api.listTasks({ viewUserId: adminViewUserId, scope: 'mine' })
            .then((d) => setAdminTasks(d.tasks))
            .catch((err) => setError(err.message))
            .finally(() => setAdminLoading(false));
    }, [adminViewUserId, user.is_admin]);

    const DONE = new Set(['completed', 'closed', 'cancelled']);
    const active = useMemo(() => tasks.filter((t) => !DONE.has(t.status)), [tasks]);
    const done   = useMemo(() => tasks.filter((t) =>  DONE.has(t.status)), [tasks]);

    // Optimistic status change — updates locally first, rolls back on failure.
    async function handleStatusChange(task, newStatus) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
        try {
            await api.updateTask(task.id, { status: newStatus });
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
        onLogout();
    }

    return (
        <div className="min-h-screen bg-bg">
            <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LinxasLogo size={28} />
                        <div className="leading-tight">
                            <span className="text-lg font-extrabold tracking-tight text-ink">Task Master</span>
                            <span className="text-xs text-muted ml-2 hidden sm:inline">by Linx-AS</span>
                        </div>
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
                        Filters {(filters.status?.length > 0 || filters.priority || filters.scope !== 'mine' || filters.deadlineMode) ? '•' : ''}
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
                                        Active <span className="text-muted font-normal">({active.length})</span>
                                    </h2>
                                </div>
                                {active.length === 0 ? (
                                    <p className="text-sm text-muted border border-dashed border-border rounded-md py-6 text-center">
                                        No active tasks. Add a task to get started.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {active.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                onStatusChange={handleStatusChange}
                                                onEdit={setFormTask}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {done.length > 0 && (
                                <section>
                                    <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                                        Done <span className="font-normal">({done.length})</span>
                                    </h2>
                                    <ul className="space-y-2">
                                        {done.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                onStatusChange={handleStatusChange}
                                                onEdit={setFormTask}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
                    )}

                    {/* ── Admin Tasks ── */}
                    {user.is_admin && (
                        <div className="mt-8 border-t border-border pt-6">
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide shrink-0">
                                    Admin View
                                </h2>
                                <select
                                    value={adminViewUserId}
                                    onChange={(e) => setAdminViewUserId(e.target.value)}
                                    className="rounded-md border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
                                >
                                    <option value="">— Select a user —</option>
                                    {adminUsers.map((u) => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </select>
                            </div>

                            {adminViewUserId && (
                                adminLoading ? (
                                    <p className="text-sm text-muted">Loading…</p>
                                ) : adminTasks.length === 0 ? (
                                    <p className="text-sm text-muted border border-dashed border-border rounded-md py-6 text-center">
                                        No tasks for this user.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {adminTasks.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                readOnly
                                            />
                                        ))}
                                    </ul>
                                )
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

        </div>
    );
}

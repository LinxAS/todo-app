import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import DefectCard, { STATUSES } from './DefectCard';
import DefectForm from './DefectForm';
import FilterBar from './FilterBar';
import { LinxasLogo, BugIcon, PlusIcon, CloseIcon, ProjectIcon } from './Icons';

const DONE_STATUSES = new Set(['resolved', 'closed', 'cancelled']);

const STAT_GROUPS = [
    { label: 'New',           value: 'new',           cls: 'text-blue-600' },
    { label: 'In Progress',   value: 'in_progress',   cls: 'text-amber-600' },
    { label: 'Pending Info',  value: 'pending_info',  cls: 'text-orange-600' },
    { label: 'Ready to Test', value: 'ready_to_test', cls: 'text-violet-600' },
    { label: 'Resolved',      value: 'resolved',      cls: 'text-green-700' },
];

function StatPill({ label, count, colorCls }) {
    return (
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className={`text-xl font-bold ${colorCls}`}>{count}</p>
            <p className="text-[10px] text-muted uppercase tracking-wide font-medium mt-0.5">{label}</p>
        </div>
    );
}

export default function Dashboard({ user, onLogout }) {
    const [defects, setDefects]           = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');
    const [projects, setProjects]         = useState([]);
    const [users, setUsers]               = useState([]);
    const [filters, setFilters]           = useState({
        search: '', project: '', status: ['new', 'in_progress'], priority: [], functionalUser: '', technicalUser: '',
    });
    const [formDefect, setFormDefect]     = useState(null); // null=closed, {}=new, defect=edit
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [projectFormOpen, setProjectFormOpen]     = useState(false);
    const [projectForm, setProjectForm]             = useState({ name: '', description: '' });
    const [projectBusy, setProjectBusy]             = useState(false);
    const [projectError, setProjectError]           = useState('');

    // ── Data loading ───────────────────────────────────────────────────────
    const loadDefects = useCallback(async (activeFilters) => {
        try {
            const data = await api.listDefects(activeFilters);
            setDefects(data.defects);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handle = setTimeout(() => loadDefects(filters), filters.search ? 300 : 0);
        return () => clearTimeout(handle);
    }, [filters, loadDefects]);

    useEffect(() => {
        api.listProjects().then((d) => setProjects(d.projects)).catch(() => {});
        api.listUsers().then((d) => setUsers(d.users)).catch(() => {});
    }, []);

    // ── Derived ────────────────────────────────────────────────────────────
    const active = useMemo(() => defects.filter((d) => !DONE_STATUSES.has(d.status)), [defects]);
    const done   = useMemo(() => defects.filter((d) =>  DONE_STATUSES.has(d.status)), [defects]);

    const stats = useMemo(() => {
        const counts = {};
        for (const d of defects) counts[d.status] = (counts[d.status] || 0) + 1;
        return counts;
    }, [defects]);

    // ── Handlers ───────────────────────────────────────────────────────────
    async function handleStatusChange(defect, newStatus) {
        setDefects((prev) => prev.map((d) => (d.id === defect.id ? { ...d, status: newStatus } : d)));
        try {
            await api.updateDefect(defect.id, { status: newStatus });
        } catch (err) {
            setDefects((prev) => prev.map((d) => (d.id === defect.id ? { ...d, status: defect.status } : d)));
            setError(err.message);
        }
    }

    async function handleSave(form) {
        if (formDefect?.id) {
            const { defect } = await api.updateDefect(formDefect.id, form);
            setDefects((prev) => prev.map((d) => (d.id === defect.id ? defect : d)));
            return defect;
        } else {
            const { defect } = await api.createDefect(form);
            setDefects((prev) => [defect, ...prev]);
            return defect;
        }
    }

    function handleAttachmentsUploaded(defectId, attachments) {
        setDefects((prev) => prev.map((d) =>
            d.id === defectId ? { ...d, attachments: [...(d.attachments || []), ...attachments] } : d
        ));
    }

    async function handleDelete(defect) {
        if (!window.confirm(`Delete defect #${defect.id} "${defect.title}"?`)) return;
        const prev = defects;
        setDefects((d) => d.filter((x) => x.id !== defect.id));
        try {
            await api.deleteDefect(defect.id);
        } catch (err) {
            setDefects(prev);
            setError(err.message);
        }
    }

    async function handleCreateProject(e) {
        e.preventDefault();
        if (!projectForm.name.trim()) { setProjectError('Name is required'); return; }
        setProjectBusy(true); setProjectError('');
        try {
            const { project } = await api.createProject(projectForm);
            setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
            setProjectForm({ name: '', description: '' });
            setProjectFormOpen(false);
        } catch (err) {
            setProjectError(err.message);
        } finally {
            setProjectBusy(false);
        }
    }

    const hasActiveFilters = filters.status?.length > 0 || filters.priority?.length > 0 ||
                             filters.project || filters.functionalUser || filters.technicalUser;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-bg">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <LinxasLogo size={28} />
                        <div className="leading-tight">
                            <span className="text-base font-extrabold tracking-tight text-ink">Defect Tracker</span>
                            <span className="text-xs text-muted ml-2 hidden sm:inline">by Linx-AS</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted hidden sm:inline">{user.username}</span>
                        <a href="/" className="text-sm text-muted hover:text-ink underline underline-offset-2">Portal</a>
                        <button
                            type="button"
                            onClick={onLogout}
                            className="text-sm text-muted hover:text-ink underline underline-offset-2"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">

                {/* Desktop sidebar */}
                <aside className="hidden md:flex flex-col gap-4 w-56 shrink-0">
                    <FilterBar
                        filters={filters}
                        projects={projects}
                        users={users}
                        onChange={setFilters}
                    />

                    {/* Admin: Manage projects */}
                    {user.is_admin && (
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={() => setProjectFormOpen(true)}
                                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accentHover"
                            >
                                <ProjectIcon size={13} />
                                Add project
                            </button>
                        </div>
                    )}
                </aside>

                {/* Mobile filter toggle */}
                <div className="md:hidden -mt-2">
                    <button
                        type="button"
                        onClick={() => setMobileFiltersOpen(true)}
                        className="text-sm font-medium text-accent underline underline-offset-2"
                    >
                        Filters {hasActiveFilters ? '•' : ''}
                    </button>
                </div>

                {/* Mobile filter drawer */}
                {mobileFiltersOpen && (
                    <div className="fixed inset-0 bg-ink/40 z-40 md:hidden" onClick={() => setMobileFiltersOpen(false)}>
                        <div
                            className="absolute right-0 top-0 bottom-0 w-72 bg-surface p-5 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-ink">Filters</h2>
                                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="p-1 text-muted">
                                    <CloseIcon />
                                </button>
                            </div>
                            <FilterBar filters={filters} projects={projects} users={users} onChange={setFilters} />
                        </div>
                    </div>
                )}

                {/* Main content */}
                <main className="flex-1 min-w-0">
                    {error && (
                        <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                            {error}
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="flex gap-2 flex-wrap mb-5">
                        {STAT_GROUPS.map((g) => (
                            <StatPill key={g.value} label={g.label} count={stats[g.value] || 0} colorCls={g.cls} />
                        ))}
                        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center min-w-[80px]">
                            <p className="text-xl font-bold text-ink">{defects.length}</p>
                            <p className="text-[10px] text-muted uppercase tracking-wide font-medium mt-0.5">Total</p>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-sm text-muted">Loading…</p>
                    ) : (
                        <div className="space-y-8">
                            {/* Active defects */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <BugIcon size={16} className="text-muted" />
                                    <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">
                                        Open <span className="text-muted font-normal">({active.length})</span>
                                    </h2>
                                </div>
                                {active.length === 0 ? (
                                    <p className="text-sm text-muted border border-dashed border-border rounded-lg py-8 text-center">
                                        No open defects match your filters.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {active.map((defect) => (
                                            <DefectCard
                                                key={defect.id}
                                                defect={defect}
                                                onStatusChange={handleStatusChange}
                                                onEdit={setFormDefect}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {/* Resolved / Done */}
                            {done.length > 0 && (
                                <section>
                                    <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                                        Resolved / Closed <span className="font-normal">({done.length})</span>
                                    </h2>
                                    <ul className="space-y-2">
                                        {done.map((defect) => (
                                            <DefectCard
                                                key={defect.id}
                                                defect={defect}
                                                onStatusChange={handleStatusChange}
                                                onEdit={setFormDefect}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* FAB — New Defect */}
            <button
                type="button"
                onClick={() => setFormDefect({})}
                aria-label="Report defect"
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent hover:bg-accentHover text-white shadow-lg flex items-center justify-center transition-colors"
            >
                <PlusIcon width={22} height={22} />
            </button>

            {/* Defect form modal */}
            {formDefect !== null && (
                <DefectForm
                    initial={formDefect.id ? formDefect : null}
                    projects={projects}
                    users={users}
                    currentUser={user}
                    onSave={handleSave}
                    onAttachmentsUploaded={handleAttachmentsUploaded}
                    onClose={() => setFormDefect(null)}
                />
            )}

            {/* Add project modal (admin only) */}
            {projectFormOpen && (
                <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4" onClick={() => setProjectFormOpen(false)}>
                    <div className="bg-surface rounded-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-ink">New Project</h2>
                            <button type="button" onClick={() => setProjectFormOpen(false)} className="p-1 text-muted hover:text-ink">
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1" htmlFor="proj-name">Name</label>
                                <input
                                    id="proj-name"
                                    type="text"
                                    required
                                    autoFocus
                                    value={projectForm.name}
                                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1" htmlFor="proj-desc">Description</label>
                                <textarea
                                    id="proj-desc"
                                    rows={2}
                                    value={projectForm.description}
                                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                                />
                            </div>
                            {projectError && <p className="text-sm text-danger">{projectError}</p>}
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setProjectFormOpen(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-ink hover:bg-bg">
                                    Cancel
                                </button>
                                <button type="submit" disabled={projectBusy} className="flex-1 rounded-lg bg-accent hover:bg-accentHover text-white py-2 text-sm font-semibold disabled:opacity-60">
                                    {projectBusy ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

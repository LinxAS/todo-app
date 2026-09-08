import React from 'react';
import { SearchIcon } from './Icons';

const STATUSES = [
    { value: 'new',           label: 'New' },
    { value: 'in_progress',   label: 'In Progress' },
    { value: 'pending_info',  label: 'Pending Info' },
    { value: 'ready_to_test', label: 'Ready to Test' },
    { value: 'resolved',      label: 'Resolved' },
    { value: 'closed',        label: 'Closed' },
    { value: 'cancelled',     label: 'Cancelled' },
];

const PRIORITIES = [
    { value: 'critical', label: 'Critical' },
    { value: 'high',     label: 'High' },
    { value: 'medium',   label: 'Medium' },
    { value: 'low',      label: 'Low' },
];

const sectionLabel = 'text-xs font-semibold text-ink uppercase tracking-wide mb-1.5 bg-border px-2 py-0.5 rounded inline-block';

export default function FilterBar({ filters, projects, users, onChange }) {
    function update(key, value) { onChange({ ...filters, [key]: value }); }

    function toggleMulti(key, value) {
        const cur = filters[key] || [];
        update(key, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]);
    }

    return (
        <div className="space-y-5">
            {/* Search */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                    type="search"
                    placeholder="Search defects…"
                    value={filters.search}
                    onChange={(e) => update('search', e.target.value)}
                    className="w-full rounded-md border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
                />
            </div>

            {/* Project */}
            <div>
                <p className={sectionLabel}>Project</p>
                <select
                    value={filters.project || ''}
                    onChange={(e) => update('project', e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface mt-1"
                >
                    <option value="">All projects</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Status */}
            <div>
                <p className={sectionLabel}>Status</p>
                <div className="flex gap-1.5 flex-wrap mt-1">
                    {STATUSES.map((s) => {
                        const active = (filters.status || []).includes(s.value);
                        return (
                            <button
                                key={s.value}
                                type="button"
                                onClick={() => toggleMulti('status', s.value)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors
                                    ${active ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-bg'}`}
                            >
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Priority */}
            <div>
                <p className={sectionLabel}>Priority</p>
                <div className="flex gap-1.5 flex-wrap mt-1">
                    {PRIORITIES.map((p) => {
                        const active = (filters.priority || []).includes(p.value);
                        return (
                            <button
                                key={p.value}
                                type="button"
                                onClick={() => toggleMulti('priority', p.value)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors
                                    ${active ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-bg'}`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scope */}
            <div>
                <p className={sectionLabel}>Scope</p>
                <div className="flex gap-1.5 flex-wrap mt-1">
                    {[
                        ['all',      'All'],
                        ['mine',     'Involving me'],
                        ['created',  'Created by me'],
                        ['assigned', 'Assigned to me'],
                    ].map(([v, label]) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => update('scope', v)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors
                                ${filters.scope === v ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-bg'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assignee */}
            <div>
                <p className={sectionLabel}>Assignee</p>
                <select
                    value={filters.assignee || ''}
                    onChange={(e) => update('assignee', e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface mt-1"
                >
                    <option value="">Anyone</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

import React from 'react';
import { SearchIcon } from './Icons';

export default function FilterBar({ filters, onChange }) {
    function update(key, value) {
        onChange({ ...filters, [key]: value });
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                    type="search"
                    placeholder="Search tasks…"
                    value={filters.search}
                    onChange={(e) => update('search', e.target.value)}
                    className="w-full rounded-md border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
                />
            </div>

            <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Status</p>
                <div className="flex gap-1.5 flex-wrap">
                    {[
                        { value: 'new',           label: 'New' },
                        { value: 'in_progress',   label: 'In Progress' },
                        { value: 'pending_info',  label: 'Pending Info' },
                        { value: 'ready_to_test', label: 'Ready to Test' },
                        { value: 'closed',        label: 'Closed' },
                        { value: 'cancelled',     label: 'Cancelled' },
                        { value: 'completed',     label: 'Completed' },
                    ].map((s) => {
                        const active = (filters.status || []).includes(s.value);
                        return (
                            <button
                                key={s.value}
                                type="button"
                                onClick={() => {
                                    const cur = filters.status || [];
                                    update('status', active ? cur.filter((v) => v !== s.value) : [...cur, s.value]);
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border
                                    ${active ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-bg'}`}
                            >
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Category</p>
                <div className="flex gap-1.5 flex-wrap">
                    {['', 'work', 'personal'].map((c) => (
                        <button
                            key={c || 'all'}
                            type="button"
                            onClick={() => update('category', c)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize
                                ${filters.category === c ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-bg'}`}
                        >
                            {c || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Priority</p>
                <div className="flex gap-1.5 flex-wrap">
                    {['', 'high', 'medium', 'low'].map((p) => (
                        <button
                            key={p || 'all'}
                            type="button"
                            onClick={() => update('priority', p)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize
                                ${filters.priority === p ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-bg'}`}
                        >
                            {p || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Scope</p>
                <div className="flex gap-1.5 flex-wrap">
                    {[['mine', 'All'], ['owned', 'Mine'], ['assigned', 'Assigned to me']].map(([v, label]) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => update('scope', v)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border
                                ${filters.scope === v ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-bg'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

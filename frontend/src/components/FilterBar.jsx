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
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Owner</p>
                <div className="flex gap-1.5 flex-wrap">
                    {[['mine', 'All'], ['owned', 'Mine'], ['shared', 'Shared with me']].map(([v, label]) => (
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

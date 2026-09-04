import React from 'react';
import { EditIcon, TrashIcon, ShareIcon, UsersIcon } from './Icons';

const PRIORITY_STYLE = {
    high: { bar: 'bg-priorityHigh', label: 'High', text: 'text-priorityHigh' },
    medium: { bar: 'bg-priorityMedium', label: 'Medium', text: 'text-priorityMedium' },
    low: { bar: 'bg-priorityLow', label: 'Low', text: 'text-priorityLow' },
};

function formatDeadline(deadline) {
    if (!deadline) return null;
    const d = new Date(deadline + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d - today) / 86400000);

    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (diffDays < 0) return { label: `${label} (overdue)`, tone: 'overdue' };
    if (diffDays === 0) return { label: 'Today', tone: 'soon' };
    if (diffDays === 1) return { label: 'Tomorrow', tone: 'soon' };
    return { label, tone: 'normal' };
}

export default function TaskItem({ task, onToggle, onEdit, onDelete, onShare }) {
    const priority = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
    const deadline = formatDeadline(task.deadline);
    const isCompleted = task.status === 'completed';

    return (
        <li className="flex items-stretch bg-surface border border-border rounded-md overflow-hidden group">
            <span className={`w-1 shrink-0 ${priority.bar}`} aria-hidden="true" />
            <div className="flex-1 flex items-start gap-3 px-3 py-3 min-w-0">
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={isCompleted}
                    aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                    onClick={() => onToggle(task)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isCompleted ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}
                >
                    {isCompleted && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted' : 'text-ink'}`}>
                            {task.title}
                        </p>
                        {!task.is_owner && (
                            <span className="text-[11px] text-muted shrink-0">from {task.owner_username}</span>
                        )}
                    </div>
                    {task.description && (
                        <p className={`text-xs mt-0.5 truncate ${isCompleted ? 'text-muted/70' : 'text-muted'}`}>
                            {task.description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                        <span className="px-1.5 py-0.5 rounded border border-border text-muted capitalize">{task.category}</span>
                        <span className={`font-semibold ${priority.text}`}>{priority.label}</span>
                        {deadline && (
                            <span className={deadline.tone === 'overdue' ? 'text-danger font-medium' : deadline.tone === 'soon' ? 'text-ink font-medium' : 'text-muted'}>
                                {deadline.label}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    {task.is_owner && (
                        <button type="button" onClick={() => onShare(task)} title="Share" className="p-1.5 rounded hover:bg-bg text-muted hover:text-ink">
                            <ShareIcon />
                        </button>
                    )}
                    <button type="button" onClick={() => onEdit(task)} title="Edit" className="p-1.5 rounded hover:bg-bg text-muted hover:text-ink">
                        <EditIcon />
                    </button>
                    {task.is_owner && (
                        <button type="button" onClick={() => onDelete(task)} title="Delete" className="p-1.5 rounded hover:bg-bg text-muted hover:text-danger">
                            <TrashIcon />
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
}

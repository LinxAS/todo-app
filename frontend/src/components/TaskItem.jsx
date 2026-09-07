import React from 'react';
import { EditIcon, TrashIcon } from './Icons';

const PRIORITY_STYLE = {
    high:   { bar: 'bg-priorityHigh',   label: 'High',   text: 'text-priorityHigh' },
    medium: { bar: 'bg-priorityMedium', label: 'Medium', text: 'text-priorityMedium' },
    low:    { bar: 'bg-priorityLow',    label: 'Low',    text: 'text-priorityLow' },
};

export const STATUSES = [
    { value: 'new',            label: 'New',            cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: 'in_progress',    label: 'In Progress',    cls: 'bg-amber-50 text-amber-600 border-amber-200' },
    { value: 'pending_info',   label: 'Pending Info',   cls: 'bg-orange-50 text-orange-600 border-orange-200' },
    { value: 'ready_to_test',  label: 'Ready to Test',  cls: 'bg-violet-50 text-violet-600 border-violet-200' },
    { value: 'closed',         label: 'Closed',         cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    { value: 'cancelled',      label: 'Cancelled',      cls: 'bg-red-50 text-red-600 border-red-200' },
    { value: 'completed',      label: 'Completed',      cls: 'bg-green-50 text-green-700 border-green-200' },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

function formatDeadline(deadline) {
    if (!deadline) return null;
    const d = new Date(deadline.slice(0, 10) + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d - today) / 86400000);

    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (diffDays < 0) return { label: `${label} (overdue)`, tone: 'overdue' };
    if (diffDays === 0) return { label: 'Today', tone: 'soon' };
    if (diffDays === 1) return { label: 'Tomorrow', tone: 'soon' };
    return { label, tone: 'normal' };
}

export default function TaskItem({ task, onStatusChange, onEdit, onDelete, readOnly = false }) {
    const priority = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
    const deadline = formatDeadline(task.deadline);
    const statusStyle = STATUS_MAP[task.status] || STATUS_MAP.new;
    const isDone = ['completed', 'closed', 'cancelled'].includes(task.status);

    return (
        <li className="flex items-stretch bg-surface border border-border rounded-md overflow-hidden group">
            <span className={`w-1 shrink-0 ${priority.bar}`} aria-hidden="true" />
            <div className="flex-1 flex items-start gap-3 px-3 py-3 min-w-0">

                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-muted' : 'text-ink'}`}>
                            {task.title}
                        </p>
                        {!task.is_owner && (
                            <span className="text-[11px] text-muted shrink-0">from {task.owner_username}</span>
                        )}
                        {task.is_owner && task.assigned_username && (
                            <span className="text-[11px] text-muted shrink-0">→ {task.assigned_username}</span>
                        )}
                    </div>
                    {task.description && (
                        <p className={`text-xs mt-0.5 truncate ${isDone ? 'text-muted/70' : 'text-muted'}`}>
                            {task.description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                        <span className={`font-semibold ${priority.text}`}>{priority.label}</span>
                        {deadline && (
                            <span className={deadline.tone === 'overdue' ? 'text-danger font-medium' : deadline.tone === 'soon' ? 'text-ink font-medium' : 'text-muted'}>
                                {deadline.label}
                            </span>
                        )}
                        {/* Inline status selector */}
                        {readOnly ? (
                            <span className={`px-1.5 py-0.5 rounded border text-[11px] font-medium ${statusStyle.cls}`}>
                                {statusStyle.label}
                            </span>
                        ) : (
                            <select
                                value={task.status}
                                onChange={(e) => onStatusChange(task, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-1.5 py-0.5 rounded border text-[11px] font-medium cursor-pointer focus:outline-none ${statusStyle.cls}`}
                                aria-label="Task status"
                            >
                                {STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => onEdit(task)} title="Edit" className="p-1.5 rounded hover:bg-bg text-muted hover:text-ink">
                            <EditIcon />
                        </button>
                        {task.is_owner && (
                            <button type="button" onClick={() => onDelete(task)} title="Delete" className="p-1.5 rounded hover:bg-bg text-muted hover:text-danger">
                                <TrashIcon />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}

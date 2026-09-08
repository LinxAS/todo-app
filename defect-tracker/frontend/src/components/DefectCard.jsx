import React from 'react';
import { EditIcon, TrashIcon, PaperclipIcon } from './Icons';

const PRIORITY_STYLE = {
    critical: { bar: 'bg-priorityCritical', label: 'Critical', text: 'text-priorityCritical' },
    high:     { bar: 'bg-priorityHigh',     label: 'High',     text: 'text-priorityHigh' },
    medium:   { bar: 'bg-priorityMedium',   label: 'Medium',   text: 'text-priorityMedium' },
    low:      { bar: 'bg-priorityLow',      label: 'Low',      text: 'text-priorityLow' },
};

export const STATUSES = [
    { value: 'new',           label: 'New',            cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: 'in_progress',   label: 'In Progress',    cls: 'bg-amber-50 text-amber-600 border-amber-200' },
    { value: 'pending_info',  label: 'Pending Info',   cls: 'bg-orange-50 text-orange-600 border-orange-200' },
    { value: 'ready_to_test', label: 'Ready to Test',  cls: 'bg-violet-50 text-violet-600 border-violet-200' },
    { value: 'resolved',      label: 'Resolved',       cls: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'closed',        label: 'Closed',         cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    { value: 'cancelled',     label: 'Cancelled',      cls: 'bg-red-50 text-red-500 border-red-200' },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

function formatDeadline(deadline) {
    if (!deadline) return null;
    const d = new Date(deadline.slice(0, 10) + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (diff < 0)  return { label: `${label} (overdue)`, tone: 'overdue' };
    if (diff === 0) return { label: 'Today',    tone: 'soon' };
    if (diff === 1) return { label: 'Tomorrow', tone: 'soon' };
    return { label, tone: 'normal' };
}

export default function DefectCard({ defect, onStatusChange, onEdit, onDelete }) {
    const priority    = PRIORITY_STYLE[defect.priority] || PRIORITY_STYLE.medium;
    const statusStyle = STATUS_MAP[defect.status]       || STATUS_MAP.new;
    const deadline    = formatDeadline(defect.deadline);
    const isDone      = ['resolved', 'closed', 'cancelled'].includes(defect.status);

    return (
        <li className="flex items-stretch bg-surface border border-border rounded-lg overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
            {/* Priority bar */}
            <span className={`w-1.5 shrink-0 ${priority.bar}`} aria-hidden="true" />

            <div className="flex-1 flex items-start gap-3 px-4 py-3.5 min-w-0">
                <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-muted shrink-0">#{defect.id}</span>
                        <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-muted' : 'text-ink'}`}>
                            {defect.title}
                        </p>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 shrink-0 font-medium">
                            {defect.project_name}
                        </span>
                    </div>

                    {/* Description snippet */}
                    {defect.description && (
                        <p className="text-xs mt-1 text-muted line-clamp-2 leading-relaxed">
                            {defect.description}
                        </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px]">
                        {/* Priority */}
                        <span className={`font-semibold ${priority.text}`}>{priority.label}</span>

                        {/* Status selector */}
                        <select
                            value={defect.status}
                            onChange={(e) => onStatusChange(defect, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-1.5 py-0.5 rounded border text-[11px] font-medium cursor-pointer focus:outline-none ${statusStyle.cls}`}
                            aria-label="Status"
                        >
                            {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>

                        {/* Deadline */}
                        {deadline && (
                            <span className={
                                deadline.tone === 'overdue' ? 'text-danger font-medium' :
                                deadline.tone === 'soon'    ? 'text-ink font-medium'    : 'text-muted'
                            }>
                                {deadline.label}
                            </span>
                        )}

                        {/* Functional user */}
                        <span className="text-muted">
                            Reported: <span className="font-medium text-ink">{defect.functional_username}</span>
                        </span>

                        {/* Technical user */}
                        {defect.technical_username && (
                            <span className="text-muted">
                                Dev: <span className="font-medium text-ink">{defect.technical_username}</span>
                            </span>
                        )}

                        {/* Attachments count */}
                        {defect.attachments?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-muted">
                                <PaperclipIcon size={12} />
                                {defect.attachments.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={() => onEdit(defect)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-bg text-muted hover:text-ink"
                    >
                        <EditIcon />
                    </button>
                    {defect.is_owner && (
                        <button
                            type="button"
                            onClick={() => onDelete(defect)}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-bg text-muted hover:text-danger"
                        >
                            <TrashIcon />
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
}

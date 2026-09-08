import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { EditIcon, TrashIcon, PaperclipIcon, CloseIcon, CommentIcon } from './Icons';

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
    const [lightbox, setLightbox] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments, setComments]         = useState(null); // null = not loaded yet
    const [commentBody, setCommentBody]   = useState('');
    const [commentBusy, setCommentBusy]   = useState(false);
    const [commentCount, setCommentCount] = useState(defect.comment_count || 0);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!commentsOpen || comments !== null) return;
        api.listComments(defect.id).then((d) => setComments(d.comments)).catch(() => setComments([]));
    }, [commentsOpen, comments, defect.id]);

    useEffect(() => {
        if (commentsOpen) textareaRef.current?.focus();
    }, [commentsOpen]);

    async function handleAddComment(e) {
        e.preventDefault();
        if (!commentBody.trim()) return;
        setCommentBusy(true);
        try {
            const { comment } = await api.createComment(defect.id, commentBody);
            setComments((prev) => [...(prev || []), comment]);
            setCommentCount((n) => n + 1);
            setCommentBody('');
        } catch {}
        setCommentBusy(false);
    }

    async function handleDeleteComment(comment) {
        try {
            await api.deleteComment(defect.id, comment.id);
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
            setCommentCount((n) => Math.max(0, n - 1));
        } catch {}
    }

    function formatCommentTime(ts) {
        const d = new Date(ts);
        const diff = (Date.now() - d) / 1000;
        if (diff < 60)   return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    const imageAttachments = (defect.attachments || []).filter((a) => a.mime_type?.startsWith('image/'));
    const otherAttachments = (defect.attachments || []).filter((a) => !a.mime_type?.startsWith('image/'));

    return (
        <>
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
                        <div className="mt-1">
                            <p className={`text-xs text-muted leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-2'}`}>
                                {defect.description}
                            </p>
                            <button
                                type="button"
                                onClick={() => setExpanded((v) => !v)}
                                className="text-[11px] text-accent hover:underline mt-0.5"
                            >
                                {expanded ? 'Show less' : 'Show more'}
                            </button>
                        </div>
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

                        {/* Non-image attachment count */}
                        {otherAttachments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-muted">
                                <PaperclipIcon size={12} />
                                {otherAttachments.length}
                            </span>
                        )}

                        {/* Comments toggle */}
                        <button
                            type="button"
                            onClick={() => setCommentsOpen((v) => !v)}
                            className={`flex items-center gap-1 ${commentsOpen ? 'text-accent' : 'text-muted hover:text-ink'}`}
                        >
                            <CommentIcon size={12} />
                            <span>{commentCount > 0 ? commentCount : ''} {commentCount === 1 ? 'comment' : commentCount > 1 ? 'comments' : 'Add comment'}</span>
                        </button>
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

            {/* Screenshot thumbnails */}
            {imageAttachments.length > 0 && (
                <div className="flex gap-2 px-4 pb-3 flex-wrap">
                    {imageAttachments.map((a) => {
                        const url = `${import.meta.env.BASE_URL}api/uploads/${a.filename}`;
                        return (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => setLightbox(url)}
                                className="shrink-0 rounded overflow-hidden border border-border hover:border-accent transition-colors"
                                title={a.original_name}
                            >
                                <img
                                    src={url}
                                    alt={a.original_name}
                                    className="h-16 w-24 object-cover"
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Comments panel */}
            {commentsOpen && (
                <div className="border-t border-border px-4 pt-3 pb-4 bg-bg/50">
                    {/* Existing comments */}
                    {comments === null ? (
                        <p className="text-xs text-muted py-1">Loading…</p>
                    ) : comments.length === 0 ? (
                        <p className="text-xs text-muted py-1 mb-2">No comments yet. Be the first!</p>
                    ) : (
                        <ul className="space-y-2 mb-3">
                            {comments.map((c) => (
                                <li key={c.id} className="flex gap-2 group/comment">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-semibold text-ink">{c.username}</span>
                                            <span className="text-[11px] text-muted">{formatCommentTime(c.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap mt-0.5">{c.body}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteComment(c)}
                                        className="shrink-0 opacity-0 group-hover/comment:opacity-100 p-1 text-muted hover:text-danger transition-opacity"
                                        title="Delete comment"
                                    >
                                        <TrashIcon size={12} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Add comment form */}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={commentBody}
                            onChange={(e) => setCommentBody(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(e); } }}
                            placeholder="Add a comment… (Enter to submit)"
                            className="flex-1 rounded-md border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent bg-surface resize-none"
                        />
                        <button
                            type="submit"
                            disabled={commentBusy || !commentBody.trim()}
                            className="px-3 py-1.5 rounded-md bg-accent hover:bg-accentHover text-white text-xs font-medium disabled:opacity-50"
                        >
                            Post
                        </button>
                    </form>
                </div>
            )}
        </li>

        {/* Lightbox */}
        {lightbox && (
            <div
                className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                onClick={() => setLightbox(null)}
            >
                <button
                    type="button"
                    onClick={() => setLightbox(null)}
                    className="absolute top-4 right-4 p-2 text-white hover:text-gray-300"
                    aria-label="Close"
                >
                    <CloseIcon size={24} />
                </button>
                <img
                    src={lightbox}
                    alt="Screenshot"
                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )}
        </>
    );
}

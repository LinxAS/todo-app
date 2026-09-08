import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { CloseIcon, UploadIcon, PaperclipIcon, TrashIcon } from './Icons';

const STATUSES = [
    { value: 'new',           label: 'New' },
    { value: 'in_progress',   label: 'In Progress' },
    { value: 'pending_info',  label: 'Pending Info' },
    { value: 'ready_to_test', label: 'Ready to Test' },
    { value: 'resolved',      label: 'Resolved' },
    { value: 'closed',        label: 'Closed' },
    { value: 'cancelled',     label: 'Cancelled' },
];

const empty = {
    project_id: '', title: '', description: '',
    priority: 'medium', status: 'new',
    functional_username: '', technical_username: '', deadline: '',
};

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DefectForm({ initial, projects, users, currentUser, onSave, onClose }) {
    const isEdit = Boolean(initial?.id);
    const [form, setForm]     = useState(() => initial ? {
        project_id:          initial.project_id,
        title:               initial.title,
        description:         initial.description || '',
        priority:            initial.priority,
        status:              initial.status,
        functional_username: initial.functional_username || '',
        technical_username:  initial.technical_username  || '',
        deadline:            initial.deadline ? initial.deadline.slice(0, 10) : '',
    } : { ...empty, functional_username: currentUser.username });

    const [stagedFiles, setStagedFiles]   = useState([]); // new files to upload
    const [existingAttachments, setExistingAttachments] = useState(initial?.attachments || []);
    const [dragOver, setDragOver]         = useState(false);
    const [error, setError]               = useState('');
    const [busy, setBusy]                 = useState(false);
    const fileInputRef                    = useRef(null);

    const canChangeAssignees = !isEdit || initial?.is_owner || currentUser.is_admin;
    const [pasteFlash, setPasteFlash] = useState(false);

    const addFiles = useCallback((fileList) => {
        const allowed = /^(image\/|video\/|application\/pdf)/;
        const valid = Array.from(fileList).filter((f) => allowed.test(f.type));
        if (valid.length < fileList.length) setError('Only images, videos, and PDFs are allowed');
        setStagedFiles((prev) => [...prev, ...valid]);
    }, []);

    // Clipboard paste — converts any image to JPEG and adds to staged files
    useEffect(() => {
        function handlePaste(e) {
            const items = Array.from(e.clipboardData?.items || []);
            const imageItem = items.find((item) => item.type.startsWith('image/'));
            if (!imageItem) return;
            e.preventDefault();
            const file = imageItem.getAsFile();
            if (!file) return;

            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width  = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                URL.revokeObjectURL(objectUrl);
                canvas.toBlob((blob) => {
                    const name = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
                    setStagedFiles((prev) => [...prev, new File([blob], name, { type: 'image/jpeg' })]);
                    setPasteFlash(true);
                    setTimeout(() => setPasteFlash(false), 1500);
                }, 'image/jpeg', 0.92);
            };
            img.src = objectUrl;
        }
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    function removeStaged(idx) {
        setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
    }

    async function removeExisting(attach) {
        try {
            await api.deleteAttachment(initial.id, attach.id);
            setExistingAttachments((prev) => prev.filter((a) => a.id !== attach.id));
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title.trim())    { setError('Title is required');   return; }
        if (!form.project_id)      { setError('Project is required'); return; }
        setBusy(true); setError('');

        try {
            const saved = await onSave(form);
            // Upload any staged files after the defect is saved/updated
            if (stagedFiles.length && saved?.id) {
                await api.uploadAttachments(saved.id, stagedFiles);
            }
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface';
    const labelCls = 'block text-sm font-medium text-ink mb-1';

    return (
        <div
            className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4"
            onClick={onClose}
        >
            <div
                className="bg-surface w-full sm:max-w-2xl sm:rounded-xl rounded-t-2xl max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="text-lg font-bold text-ink">
                        {isEdit ? `Edit Defect #${initial.id}` : 'Report New Defect'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-1 text-muted hover:text-ink" aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

                    {/* Project + Priority row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls} htmlFor="project">Project</label>
                            <select
                                id="project"
                                required
                                value={form.project_id}
                                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                                className={inputCls}
                            >
                                <option value="">— Select project —</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls} htmlFor="priority">Priority</label>
                            <select
                                id="priority"
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                className={inputCls}
                            >
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className={labelCls} htmlFor="title">Title</label>
                        <input
                            id="title"
                            type="text"
                            required
                            autoFocus
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className={inputCls}
                            placeholder="Short, descriptive summary of the defect"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls} htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            rows={4}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className={`${inputCls} resize-none`}
                            placeholder="Steps to reproduce, expected vs actual behaviour, environment…"
                        />
                    </div>

                    {/* Status + Deadline row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls} htmlFor="status">Status</label>
                            <select
                                id="status"
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className={inputCls}
                            >
                                {STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls} htmlFor="deadline">Deadline</label>
                            <input
                                id="deadline"
                                type="date"
                                value={form.deadline}
                                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Functional + Technical user row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls} htmlFor="functional_user">
                                Functional User
                                <span className="text-muted font-normal ml-1">(reported by)</span>
                            </label>
                            <select
                                id="functional_user"
                                value={form.functional_username}
                                onChange={(e) => setForm({ ...form, functional_username: e.target.value })}
                                className={inputCls}
                                disabled={!canChangeAssignees}
                            >
                                <option value="">— Select user —</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.username}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls} htmlFor="technical_user">
                                Technical User
                                <span className="text-muted font-normal ml-1">(assigned dev)</span>
                            </label>
                            <select
                                id="technical_user"
                                value={form.technical_username}
                                onChange={(e) => setForm({ ...form, technical_username: e.target.value })}
                                className={inputCls}
                            >
                                <option value="">— Unassigned —</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.username}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className={labelCls}>Attachments</label>

                        {/* Existing attachments (edit mode) */}
                        {existingAttachments.length > 0 && (
                            <div className="mb-2 space-y-1">
                                {existingAttachments.map((a) => {
                                    const isImage = a.mime_type?.startsWith('image/');
                                    const url = `${import.meta.env.BASE_URL}api/uploads/${a.filename}`;
                                    return (
                                        <div key={a.id} className="flex items-center gap-2 text-xs text-muted bg-bg rounded px-2 py-1">
                                            {isImage ? (
                                                <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                                                    <img src={url} alt={a.original_name} className="h-10 w-16 object-cover rounded border border-border" />
                                                </a>
                                            ) : (
                                                <PaperclipIcon size={12} />
                                            )}
                                            <a href={url} target="_blank" rel="noreferrer" className="flex-1 truncate text-accent hover:underline">
                                                {a.original_name}
                                            </a>
                                            <span>{formatBytes(a.size_bytes)}</span>
                                            <button type="button" onClick={() => removeExisting(a)} className="text-muted hover:text-danger" title="Remove">
                                                <TrashIcon size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Staged new files */}
                        {stagedFiles.length > 0 && (
                            <div className="mb-2 space-y-1">
                                {stagedFiles.map((f, i) => {
                                    const isImage = f.type.startsWith('image/');
                                    const previewUrl = isImage ? URL.createObjectURL(f) : null;
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-xs text-muted bg-blue-50 rounded px-2 py-1">
                                            {isImage && previewUrl ? (
                                                <img src={previewUrl} alt={f.name} className="h-10 w-16 object-cover rounded border border-blue-200 shrink-0" />
                                            ) : (
                                                <PaperclipIcon size={12} />
                                            )}
                                            <span className="flex-1 truncate text-ink">{f.name}</span>
                                            <span>{formatBytes(f.size)}</span>
                                            <button type="button" onClick={() => removeStaged(i)} className="text-muted hover:text-danger" title="Remove">
                                                <TrashIcon size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Drop zone */}
                        <div
                            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors
                                ${pasteFlash ? 'border-green-400 bg-green-50' :
                                  dragOver    ? 'border-accent bg-blue-50'   :
                                               'border-border hover:border-accent hover:bg-bg'}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                        >
                            <UploadIcon size={26} className="mx-auto text-muted mb-1.5" />
                            {pasteFlash ? (
                                <p className="text-sm font-medium text-green-600">Screenshot added!</p>
                            ) : (
                                <>
                                    <p className="text-sm text-muted">
                                        <span className="font-medium text-accent">Click to upload</span> or drag & drop
                                    </p>
                                    <p className="text-xs text-muted mt-0.5">
                                        Or press <kbd className="px-1 py-0.5 rounded bg-border text-ink font-mono text-[10px]">Ctrl+V</kbd> to paste a screenshot
                                    </p>
                                    <p className="text-xs text-muted mt-0.5">Images, videos, PDFs — max 50 MB each</p>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,video/*,application/pdf"
                                className="hidden"
                                onChange={(e) => addFiles(e.target.files)}
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-danger" role="alert">{error}</p>}

                    {/* Footer */}
                    <div className="flex gap-3 pt-1 pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-ink hover:bg-bg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="flex-1 rounded-lg bg-accent hover:bg-accentHover text-white py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors"
                        >
                            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Report defect'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

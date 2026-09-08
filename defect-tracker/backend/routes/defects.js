const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool       = require('../db/pool');
const portalPool = require('../db/portalPool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── File upload setup ────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
        cb(null, /^(image\/|video\/|application\/pdf)/.test(file.mimetype));
    },
});

// ── Constants ────────────────────────────────────────────────────────────────
const VALID_PRIORITY = ['critical', 'high', 'medium', 'low'];
const VALID_STATUS   = ['new', 'in_progress', 'pending_info', 'ready_to_test', 'resolved', 'closed', 'cancelled'];
const TERMINAL_STATUS = new Set(['resolved', 'closed', 'cancelled']);

const ORDER_CLAUSE = `
    ORDER BY
        CASE d.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
        d.deadline ASC NULLS LAST,
        d.created_at DESC
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getUsernameMap(userIds) {
    if (!userIds.length) return {};
    const result = await portalPool.query(
        'SELECT id, username FROM users WHERE id = ANY($1::int[])',
        [userIds]
    );
    return Object.fromEntries(result.rows.map((u) => [u.id, u.username]));
}

async function attachUsernames(defects) {
    const ids = [...new Set([
        ...defects.map((d) => d.created_by),
        ...defects.map((d) => d.functional_user_id),
        ...defects.filter((d) => d.technical_user_id).map((d) => d.technical_user_id),
    ])];
    const map = await getUsernameMap(ids);
    return defects.map((d) => ({
        ...d,
        created_by_username:  map[d.created_by]          || 'unknown',
        functional_username:  map[d.functional_user_id]  || 'unknown',
        technical_username:   d.technical_user_id ? (map[d.technical_user_id] || 'unknown') : null,
    }));
}

async function loadAttachments(defectIds) {
    if (!defectIds.length) return {};
    const result = await pool.query(
        'SELECT * FROM attachments WHERE defect_id = ANY($1::int[]) ORDER BY uploaded_at ASC',
        [defectIds]
    );
    const map = {};
    for (const row of result.rows) {
        (map[row.defect_id] = map[row.defect_id] || []).push(row);
    }
    return map;
}

async function resolveUsername(username) {
    if (!username || !username.trim()) return null;
    const result = await portalPool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (!result.rows.length) {
        const err = new Error(`User "${username.trim()}" not found`);
        err.status = 404;
        throw err;
    }
    return result.rows[0].id;
}

// ── GET /api/defects ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const userId = req.user.id;
    const { project, status, priority, search, scope = 'all', assignee } = req.query;

    const conditions = [];
    const params = [userId]; // $1 = requesting user
    let p = 1;

    if (scope === 'mine') {
        conditions.push(`(d.created_by = $1 OR d.functional_user_id = $1 OR d.technical_user_id = $1)`);
    } else if (scope === 'created') {
        conditions.push(`d.created_by = $1`);
    } else if (scope === 'assigned') {
        conditions.push(`(d.functional_user_id = $1 OR d.technical_user_id = $1)`);
    }

    if (project) {
        const pid = parseInt(project, 10);
        if (!isNaN(pid)) { p++; params.push(pid); conditions.push(`d.project_id = $${p}`); }
    }
    if (status && status.trim()) {
        const list = status.split(',').map((s) => s.trim()).filter((s) => VALID_STATUS.includes(s));
        if (list.length) { p++; params.push(list); conditions.push(`d.status = ANY($${p}::text[])`); }
    }
    if (priority && priority.trim()) {
        const list = priority.split(',').map((s) => s.trim()).filter((s) => VALID_PRIORITY.includes(s));
        if (list.length) { p++; params.push(list); conditions.push(`d.priority = ANY($${p}::text[])`); }
    }
    if (search && search.trim()) {
        p++; params.push(`%${search.trim()}%`);
        conditions.push(`(d.title ILIKE $${p} OR d.description ILIKE $${p})`);
    }
    if (assignee) {
        const aid = parseInt(assignee, 10);
        if (!isNaN(aid)) {
            p++; params.push(aid);
            conditions.push(`(d.functional_user_id = $${p} OR d.technical_user_id = $${p})`);
        }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
        const result = await pool.query(
            `SELECT d.*, p.name AS project_name, (d.created_by = $1) AS is_owner
             FROM defects d
             JOIN projects p ON d.project_id = p.id
             ${where}
             ${ORDER_CLAUSE}`,
            params
        );
        const defects = await attachUsernames(result.rows);
        const attachMap = await loadAttachments(defects.map((d) => d.id));
        res.json({ defects: defects.map((d) => ({ ...d, attachments: attachMap[d.id] || [] })) });
    } catch (err) {
        console.error('List defects error:', err);
        res.status(500).json({ error: 'Could not fetch defects' });
    }
});

// ── POST /api/defects ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const userId = req.user.id;
    const { project_id, title, description, priority, status, functional_username, technical_username, deadline } = req.body;

    if (!title || !title.trim())  return res.status(400).json({ error: 'Title is required' });
    if (!project_id)              return res.status(400).json({ error: 'Project is required' });
    if (priority && !VALID_PRIORITY.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
    if (status   && !VALID_STATUS.includes(status))     return res.status(400).json({ error: 'Invalid status' });

    let functionalUserId = userId;
    let technicalUserId  = null;
    try {
        if (functional_username && functional_username.trim()) {
            functionalUserId = await resolveUsername(functional_username) || userId;
        }
        technicalUserId = await resolveUsername(technical_username);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    try {
        const ins = await pool.query(
            `INSERT INTO defects
               (project_id, title, description, priority, status,
                functional_user_id, technical_user_id, deadline, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [project_id, title.trim(), description || null,
             priority || 'medium', status || 'new',
             functionalUserId, technicalUserId, deadline || null, userId]
        );
        const row = await pool.query(
            `SELECT d.*, p.name AS project_name, TRUE AS is_owner
             FROM defects d JOIN projects p ON d.project_id = p.id WHERE d.id = $1`,
            [ins.rows[0].id]
        );
        const [defect] = await attachUsernames(row.rows);
        res.status(201).json({ defect: { ...defect, attachments: [] } });
    } catch (err) {
        console.error('Create defect error:', err);
        res.status(500).json({ error: 'Could not create defect' });
    }
});

// ── PATCH /api/defects/:id ───────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
    const userId   = req.user.id;
    const defectId = parseInt(req.params.id, 10);

    const chk = await pool.query(
        'SELECT created_by, functional_user_id, technical_user_id FROM defects WHERE id = $1',
        [defectId]
    );
    if (!chk.rows.length) return res.status(404).json({ error: 'Defect not found' });
    const row = chk.rows[0];
    const isOwner   = row.created_by === userId;
    const hasAccess = isOwner || row.functional_user_id === userId ||
                      row.technical_user_id === userId || req.user.is_admin;
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const { title, description, priority, status, functional_username, technical_username, deadline, project_id } = req.body;

    if (priority && !VALID_PRIORITY.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
    if (status   && !VALID_STATUS.includes(status))     return res.status(400).json({ error: 'Invalid status' });

    const fields = [];
    const params = [defectId];
    let p = 1;
    const set = (col, val) => { p++; params.push(val); fields.push(`${col} = $${p}`); };

    if (title      !== undefined) set('title',      title.trim());
    if (description!== undefined) set('description', description);
    if (priority   !== undefined) set('priority',   priority);
    if (project_id !== undefined) set('project_id', project_id);
    if (deadline   !== undefined) set('deadline',   deadline || null);
    if (status     !== undefined) {
        set('status', status);
        fields.push(`resolved_at = ${TERMINAL_STATUS.has(status) ? 'NOW()' : 'NULL'}`);
    }

    if (isOwner || req.user.is_admin) {
        if (functional_username !== undefined) {
            try { set('functional_user_id', (await resolveUsername(functional_username)) || userId); }
            catch (err) { return res.status(err.status || 400).json({ error: err.message }); }
        }
        if (technical_username !== undefined) {
            try { set('technical_user_id', await resolveUsername(technical_username)); }
            catch (err) { return res.status(err.status || 400).json({ error: err.message }); }
        }
    }

    fields.push('updated_at = NOW()');
    if (fields.length === 1) return res.status(400).json({ error: 'Nothing to update' });

    try {
        await pool.query(`UPDATE defects SET ${fields.join(', ')} WHERE id = $1`, params);
        const updated = await pool.query(
            `SELECT d.*, p.name AS project_name, (d.created_by = $2) AS is_owner
             FROM defects d JOIN projects p ON d.project_id = p.id WHERE d.id = $1`,
            [defectId, userId]
        );
        const [defect] = await attachUsernames(updated.rows);
        const attachMap = await loadAttachments([defectId]);
        res.json({ defect: { ...defect, attachments: attachMap[defectId] || [] } });
    } catch (err) {
        console.error('Update defect error:', err);
        res.status(500).json({ error: 'Could not update defect' });
    }
});

// ── DELETE /api/defects/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    const userId   = req.user.id;
    const defectId = parseInt(req.params.id, 10);

    try {
        const chk = await pool.query('SELECT created_by FROM defects WHERE id = $1', [defectId]);
        if (!chk.rows.length) return res.status(404).json({ error: 'Defect not found' });
        if (chk.rows[0].created_by !== userId && !req.user.is_admin) {
            return res.status(403).json({ error: 'Only the creator or an admin can delete this defect' });
        }
        const files = await pool.query('SELECT filename FROM attachments WHERE defect_id = $1', [defectId]);
        for (const f of files.rows) {
            try { fs.unlinkSync(path.join(uploadDir, f.filename)); } catch {}
        }
        await pool.query('DELETE FROM defects WHERE id = $1', [defectId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete defect error:', err);
        res.status(500).json({ error: 'Could not delete defect' });
    }
});

// ── POST /api/defects/:id/attachments ───────────────────────────────────────
router.post('/:id/attachments', upload.array('files', 10), async (req, res) => {
    const userId   = req.user.id;
    const defectId = parseInt(req.params.id, 10);

    const chk = await pool.query(
        'SELECT created_by, functional_user_id, technical_user_id FROM defects WHERE id = $1',
        [defectId]
    );
    if (!chk.rows.length) return res.status(404).json({ error: 'Defect not found' });
    const row = chk.rows[0];
    const hasAccess = row.created_by === userId || row.functional_user_id === userId ||
                      row.technical_user_id === userId || req.user.is_admin;
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
    if (!req.files?.length) return res.status(400).json({ error: 'No files provided' });

    try {
        const inserted = [];
        for (const file of req.files) {
            const r = await pool.query(
                `INSERT INTO attachments (defect_id, filename, original_name, mime_type, size_bytes, uploaded_by)
                 VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                [defectId, file.filename, file.originalname, file.mimetype, file.size, userId]
            );
            inserted.push(r.rows[0]);
        }
        await pool.query('UPDATE defects SET updated_at = NOW() WHERE id = $1', [defectId]);
        res.status(201).json({ attachments: inserted });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Could not save attachments' });
    }
});

// ── DELETE /api/defects/:defectId/attachments/:attachId ─────────────────────
router.delete('/:defectId/attachments/:attachId', async (req, res) => {
    const userId   = req.user.id;
    const defectId = parseInt(req.params.defectId, 10);
    const attachId = parseInt(req.params.attachId, 10);

    try {
        const defect = await pool.query('SELECT created_by FROM defects WHERE id = $1', [defectId]);
        if (!defect.rows.length) return res.status(404).json({ error: 'Defect not found' });

        const attach = await pool.query(
            'SELECT * FROM attachments WHERE id = $1 AND defect_id = $2',
            [attachId, defectId]
        );
        if (!attach.rows.length) return res.status(404).json({ error: 'Attachment not found' });

        const canDelete = defect.rows[0].created_by === userId ||
                          attach.rows[0].uploaded_by === userId || req.user.is_admin;
        if (!canDelete) return res.status(403).json({ error: 'Access denied' });

        try { fs.unlinkSync(path.join(uploadDir, attach.rows[0].filename)); } catch {}
        await pool.query('DELETE FROM attachments WHERE id = $1', [attachId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete attachment error:', err);
        res.status(500).json({ error: 'Could not delete attachment' });
    }
});

module.exports = router;

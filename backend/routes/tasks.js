const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_CATEGORY = ['work', 'personal'];
const VALID_PRIORITY = ['high', 'medium', 'low'];
const VALID_STATUS = ['pending', 'completed'];

// Priority-then-deadline sort expression, reused by every SELECT below.
const ORDER_CLAUSE = `
    ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        t.deadline ASC NULLS LAST,
        t.created_at ASC
`;

const TASK_COLUMNS = `
    t.id, t.title, t.description, t.category, t.priority, t.status,
    t.deadline, t.created_at, t.updated_at, t.completed_at,
    t.owner_id, u.username AS owner_username,
    (t.owner_id = $1) AS is_owner
`;

// GET /api/tasks?status=&category=&priority=&search=&scope=
// scope: 'mine' (default, owned + shared with me), 'owned', 'shared'
router.get('/', async (req, res) => {
    const userId = req.user.id;
    const { status, category, priority, search, scope = 'mine' } = req.query;

    const conditions = [];
    const params = [userId];
    let p = 1;

    let scopeClause;
    if (scope === 'owned') {
        scopeClause = `t.owner_id = $1`;
    } else if (scope === 'shared') {
        scopeClause = `t.id IN (SELECT task_id FROM task_shares WHERE shared_with_user_id = $1)`;
    } else {
        scopeClause = `(t.owner_id = $1 OR t.id IN (SELECT task_id FROM task_shares WHERE shared_with_user_id = $1))`;
    }
    conditions.push(scopeClause);

    if (status && VALID_STATUS.includes(status)) {
        p += 1;
        params.push(status);
        conditions.push(`t.status = $${p}`);
    }
    if (category && VALID_CATEGORY.includes(category)) {
        p += 1;
        params.push(category);
        conditions.push(`t.category = $${p}`);
    }
    if (priority && VALID_PRIORITY.includes(priority)) {
        p += 1;
        params.push(priority);
        conditions.push(`t.priority = $${p}`);
    }
    if (search && search.trim()) {
        p += 1;
        params.push(`%${search.trim()}%`);
        conditions.push(`(t.title ILIKE $${p} OR t.description ILIKE $${p})`);
    }

    const query = `
        SELECT ${TASK_COLUMNS}
        FROM tasks t
        JOIN users u ON u.id = t.owner_id
        WHERE ${conditions.join(' AND ')}
        ${ORDER_CLAUSE}
    `;

    try {
        const result = await pool.query(query, params);
        res.json({ tasks: result.rows });
    } catch (err) {
        console.error('List tasks error:', err);
        res.status(500).json({ error: 'Could not fetch tasks' });
    }
});

// POST /api/tasks
router.post('/', async (req, res) => {
    const userId = req.user.id;
    const { title, description, category, priority, deadline } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
    }
    if (category && !VALID_CATEGORY.includes(category)) {
        return res.status(400).json({ error: 'Category must be work or personal' });
    }
    if (priority && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ error: 'Priority must be high, medium, or low' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO tasks (owner_id, title, description, category, priority, deadline)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                userId,
                title.trim(),
                description || null,
                category || 'personal',
                priority || 'medium',
                deadline || null,
            ]
        );

        const created = await pool.query(
            `SELECT ${TASK_COLUMNS} FROM tasks t JOIN users u ON u.id = t.owner_id WHERE t.id = $2`,
            [userId, result.rows[0].id]
        );
        res.status(201).json({ task: created.rows[0] });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ error: 'Could not create task' });
    }
});

// Helper: confirm the user may modify this task (owner, or shared with edit rights)
async function assertCanEdit(taskId, userId) {
    const result = await pool.query(
        `SELECT t.owner_id,
                EXISTS(
                    SELECT 1 FROM task_shares
                    WHERE task_id = t.id AND shared_with_user_id = $2 AND can_edit = TRUE
                ) AS shared_edit
         FROM tasks t WHERE t.id = $1`,
        [taskId, userId]
    );
    if (result.rows.length === 0) return { ok: false, status: 404, error: 'Task not found' };
    const row = result.rows[0];
    if (row.owner_id !== userId && !row.shared_edit) {
        return { ok: false, status: 403, error: 'You do not have access to this task' };
    }
    return { ok: true, isOwner: row.owner_id === userId };
}

// PATCH /api/tasks/:id  (partial update; also used to toggle status)
router.patch('/:id', async (req, res) => {
    const userId = req.user.id;
    const taskId = parseInt(req.params.id, 10);
    const { title, description, category, priority, deadline, status } = req.body;

    const access = await assertCanEdit(taskId, userId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    if (category && !VALID_CATEGORY.includes(category)) {
        return res.status(400).json({ error: 'Category must be work or personal' });
    }
    if (priority && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ error: 'Priority must be high, medium, or low' });
    }
    if (status && !VALID_STATUS.includes(status)) {
        return res.status(400).json({ error: 'Status must be pending or completed' });
    }

    const fields = [];
    const params = [taskId];
    let p = 1;

    function set(column, value) {
        p += 1;
        params.push(value);
        fields.push(`${column} = $${p}`);
    }

    if (title !== undefined) set('title', title.trim());
    if (description !== undefined) set('description', description);
    if (category !== undefined) set('category', category);
    if (priority !== undefined) set('priority', priority);
    if (deadline !== undefined) set('deadline', deadline);
    if (status !== undefined) {
        set('status', status);
        // Completing a task stamps completed_at; reopening it clears that stamp,
        // which is what drives the automatic move between Pending and Completed lists.
        fields.push(`completed_at = ${status === 'completed' ? 'NOW()' : 'NULL'}`);
    }
    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    try {
        await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $1`, params);
        const updated = await pool.query(
            `SELECT ${TASK_COLUMNS} FROM tasks t JOIN users u ON u.id = t.owner_id WHERE t.id = $2`,
            [userId, taskId]
        );
        res.json({ task: updated.rows[0] });
    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({ error: 'Could not update task' });
    }
});

// DELETE /api/tasks/:id  (owner only)
router.delete('/:id', async (req, res) => {
    const userId = req.user.id;
    const taskId = parseInt(req.params.id, 10);

    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND owner_id = $2 RETURNING id',
            [taskId, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found or you are not the owner' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ error: 'Could not delete task' });
    }
});

// POST /api/tasks/:id/share  { username, canEdit }  (owner only)
router.post('/:id/share', async (req, res) => {
    const userId = req.user.id;
    const taskId = parseInt(req.params.id, 10);
    const { username, canEdit = true } = req.body;

    if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const task = await pool.query('SELECT owner_id FROM tasks WHERE id = $1', [taskId]);
        if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        if (task.rows[0].owner_id !== userId) {
            return res.status(403).json({ error: 'Only the task owner can share it' });
        }

        const targetUser = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
        if (targetUser.rows.length === 0) {
            return res.status(404).json({ error: 'No user with that username' });
        }
        const targetId = targetUser.rows[0].id;
        if (targetId === userId) {
            return res.status(400).json({ error: 'You already own this task' });
        }

        await pool.query(
            `INSERT INTO task_shares (task_id, shared_with_user_id, can_edit)
             VALUES ($1, $2, $3)
             ON CONFLICT (task_id, shared_with_user_id) DO UPDATE SET can_edit = $3`,
            [taskId, targetId, canEdit]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Share task error:', err);
        res.status(500).json({ error: 'Could not share task' });
    }
});

// GET /api/tasks/:id/shares  (owner only) - who a task is currently shared with
router.get('/:id/shares', async (req, res) => {
    const userId = req.user.id;
    const taskId = parseInt(req.params.id, 10);

    try {
        const task = await pool.query('SELECT owner_id FROM tasks WHERE id = $1', [taskId]);
        if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        if (task.rows[0].owner_id !== userId) {
            return res.status(403).json({ error: 'Only the task owner can view sharing' });
        }

        const shares = await pool.query(
            `SELECT u.id AS user_id, u.username, ts.can_edit
             FROM task_shares ts JOIN users u ON u.id = ts.shared_with_user_id
             WHERE ts.task_id = $1`,
            [taskId]
        );
        res.json({ shares: shares.rows });
    } catch (err) {
        console.error('List shares error:', err);
        res.status(500).json({ error: 'Could not fetch sharing info' });
    }
});

// DELETE /api/tasks/:id/share/:userId  (owner only)
router.delete('/:id/share/:userId', async (req, res) => {
    const userId = req.user.id;
    const taskId = parseInt(req.params.id, 10);
    const targetId = parseInt(req.params.userId, 10);

    try {
        const task = await pool.query('SELECT owner_id FROM tasks WHERE id = $1', [taskId]);
        if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        if (task.rows[0].owner_id !== userId) {
            return res.status(403).json({ error: 'Only the task owner can unshare it' });
        }

        await pool.query(
            'DELETE FROM task_shares WHERE task_id = $1 AND shared_with_user_id = $2',
            [taskId, targetId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Unshare task error:', err);
        res.status(500).json({ error: 'Could not unshare task' });
    }
});

module.exports = router;

const express = require('express');
const pool = require('../db/pool');             // todoapp DB — tasks
const portalPool = require('../db/portalPool'); // linxas_portal DB — user lookups
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_PRIORITY = ['high', 'medium', 'low'];
const VALID_STATUS = ['new', 'in_progress', 'pending_info', 'ready_to_test', 'closed', 'cancelled', 'completed'];
const TERMINAL_STATUS = new Set(['completed', 'closed', 'cancelled']);

// Priority-then-deadline sort expression, reused by every SELECT below.
const ORDER_CLAUSE = `
    ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        t.deadline ASC NULLS LAST,
        t.created_at ASC
`;

// Task columns — owner_username / assigned_username resolved separately via portalPool.
const TASK_COLUMNS = `
    t.id, t.title, t.description, t.category, t.priority, t.status,
    t.deadline, t.created_at, t.updated_at, t.completed_at,
    t.owner_id, t.assigned_to, (t.owner_id = $1) AS is_owner
`;

// Fetch { userId: username } map from linxas_portal for the given user ID list.
async function getUsernameMap(userIds) {
    if (!userIds.length) return {};
    const result = await portalPool.query(
        'SELECT id, username FROM users WHERE id = ANY($1::int[])',
        [userIds]
    );
    return Object.fromEntries(result.rows.map((u) => [u.id, u.username]));
}

// Attach owner_username and assigned_username to each task row.
async function attachUsernames(tasks) {
    const allIds = [...new Set([
        ...tasks.map((t) => t.owner_id),
        ...tasks.filter((t) => t.assigned_to).map((t) => t.assigned_to),
    ])];
    const map = await getUsernameMap(allIds);
    return tasks.map((t) => ({
        ...t,
        owner_username: map[t.owner_id] || 'unknown',
        assigned_username: t.assigned_to ? (map[t.assigned_to] || 'unknown') : null,
    }));
}

// Resolve a username to a user ID via portalPool; returns null for blank input.
// Throws a 404-shaped object if the username doesn't exist.
async function resolveUsername(username) {
    if (!username || !username.trim()) return null;
    const result = await portalPool.query(
        'SELECT id FROM users WHERE username = $1',
        [username.trim()]
    );
    if (result.rows.length === 0) {
        const err = new Error('Assigned user not found');
        err.status = 404;
        throw err;
    }
    return result.rows[0].id;
}

// GET /api/tasks?status=&category=&priority=&search=&scope=&viewUserId=
// scope: 'mine' (default — owned + assigned to me), 'owned', 'assigned'
// viewUserId: admin-only — view tasks owned or assigned to a specific user
router.get('/', async (req, res) => {
    const userId = req.user.id;
    const { status, category, priority, search, scope = 'mine', viewUserId } = req.query;

    const conditions = [];
    const params = [userId]; // $1 = requesting user (used in is_owner calculation)
    let p = 1;

    // Admin can view tasks for any specific user
    let scopeRef = '$1';
    if (req.user.is_admin && viewUserId) {
        const parsed = parseInt(viewUserId, 10);
        if (!isNaN(parsed) && parsed !== userId) {
            p += 1; params.push(parsed);
            scopeRef = `$${p}`;
        }
    }

    let scopeClause;
    if (scope === 'owned') {
        scopeClause = `t.owner_id = ${scopeRef}`;
    } else if (scope === 'assigned') {
        scopeClause = `t.assigned_to = ${scopeRef}`;
    } else {
        scopeClause = `(t.owner_id = ${scopeRef} OR t.assigned_to = ${scopeRef})`;
    }
    conditions.push(scopeClause);

    if (status && status.trim()) {
        const statusList = status.split(',').map((s) => s.trim()).filter((s) => VALID_STATUS.includes(s));
        if (statusList.length > 0) {
            p += 1; params.push(statusList);
            conditions.push(`t.status = ANY($${p}::text[])`);
        }
    }
    if (priority && VALID_PRIORITY.includes(priority)) {
        p += 1; params.push(priority);
        conditions.push(`t.priority = $${p}`);
    }
    if (search && search.trim()) {
        p += 1; params.push(`%${search.trim()}%`);
        conditions.push(`(t.title ILIKE $${p} OR t.description ILIKE $${p})`);
    }

    const { deadlineMode, deadlineFrom, deadlineTo } = req.query;
    if (deadlineMode && deadlineFrom) {
        if (deadlineMode === 'on') {
            p += 1; params.push(deadlineFrom);
            conditions.push(`t.deadline = $${p}`);
        } else if (deadlineMode === 'before') {
            p += 1; params.push(deadlineFrom);
            conditions.push(`t.deadline < $${p}`);
        } else if (deadlineMode === 'after') {
            p += 1; params.push(deadlineFrom);
            conditions.push(`t.deadline > $${p}`);
        } else if (deadlineMode === 'between' && deadlineTo) {
            p += 1; params.push(deadlineFrom);
            const pFrom = p;
            p += 1; params.push(deadlineTo);
            conditions.push(`t.deadline BETWEEN $${pFrom} AND $${p}`);
        }
    }

    const query = `
        SELECT ${TASK_COLUMNS}
        FROM tasks t
        WHERE ${conditions.join(' AND ')}
        ${ORDER_CLAUSE}
    `;

    try {
        const result = await pool.query(query, params);
        const tasks = await attachUsernames(result.rows);
        res.json({ tasks });
    } catch (err) {
        console.error('List tasks error:', err);
        res.status(500).json({ error: 'Could not fetch tasks' });
    }
});

// POST /api/tasks
router.post('/', async (req, res) => {
    const userId = req.user.id;
    const { title, description, priority, deadline, assignedTo } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
    }
    if (priority && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ error: 'Priority must be high, medium, or low' });
    }

    let assignedToId;
    try {
        assignedToId = await resolveUsername(assignedTo);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    try {
        const result = await pool.query(
            `INSERT INTO tasks (owner_id, title, description, priority, deadline, assigned_to)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [userId, title.trim(), description || null, priority || 'medium', deadline || null, assignedToId]
        );

        const created = await pool.query(
            `SELECT ${TASK_COLUMNS} FROM tasks t WHERE t.id = $2`,
            [userId, result.rows[0].id]
        );
        const [task] = await attachUsernames(created.rows);
        res.status(201).json({ task });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ error: 'Could not create task' });
    }
});

// Helper: confirm the user may modify this task (owner or assignee).
async function assertCanEdit(taskId, userId) {
    const result = await pool.query(
        'SELECT owner_id, assigned_to FROM tasks WHERE id = $1',
        [taskId]
    );
    if (result.rows.length === 0) return { ok: false, status: 404, error: 'Task not found' };
    const row = result.rows[0];
    if (row.owner_id !== userId && row.assigned_to !== userId) {
        return { ok: false, status: 403, error: 'You do not have access to this task' };
    }
    return { ok: true, isOwner: row.owner_id === userId };
}

// PATCH /api/tasks/:id  (partial update; also used to toggle status)
router.patch('/:id', async (req, res) => {
    const userId = req.user.id;
    const taskId = parseInt(req.params.id, 10);
    const { title, description, priority, deadline, status, assignedTo } = req.body;

    const access = await assertCanEdit(taskId, userId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    if (priority && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ error: 'Priority must be high, medium, or low' });
    }
    if (status && !VALID_STATUS.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    const fields = [];
    const params = [taskId];
    let p = 1;

    function set(column, value) {
        p += 1; params.push(value); fields.push(`${column} = $${p}`);
    }

    if (title !== undefined) set('title', title.trim());
    if (description !== undefined) set('description', description);
    if (priority !== undefined) set('priority', priority);
    if (deadline !== undefined) set('deadline', deadline);
    if (status !== undefined) {
        set('status', status);
        fields.push(`completed_at = ${TERMINAL_STATUS.has(status) ? 'NOW()' : 'NULL'}`);
    }

    // Only the task owner can change the assignee.
    if (assignedTo !== undefined) {
        if (!access.isOwner) {
            return res.status(403).json({ error: 'Only the task owner can change the assignee' });
        }
        let assignedToId;
        try {
            assignedToId = await resolveUsername(assignedTo);
        } catch (err) {
            return res.status(err.status || 400).json({ error: err.message });
        }
        set('assigned_to', assignedToId);
    }

    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    try {
        await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $1`, params);
        const updated = await pool.query(
            `SELECT ${TASK_COLUMNS} FROM tasks t WHERE t.id = $2`,
            [userId, taskId]
        );
        const [task] = await attachUsernames(updated.rows);
        res.json({ task });
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

module.exports = router;

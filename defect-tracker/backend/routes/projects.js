const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/projects?all=true  (all=true shows inactive, admin only)
router.get('/', async (req, res) => {
    const showAll = req.query.all === 'true' && req.user.is_admin;
    try {
        const result = await pool.query(`
            SELECT p.*,
                COUNT(d.id) FILTER (WHERE d.status NOT IN ('resolved','closed','cancelled')) AS open_count,
                COUNT(d.id) AS total_count
            FROM projects p
            LEFT JOIN defects d ON d.project_id = p.id
            ${showAll ? '' : 'WHERE p.is_active = TRUE'}
            GROUP BY p.id
            ORDER BY p.name ASC
        `);
        res.json({ projects: result.rows });
    } catch (err) {
        console.error('List projects error:', err);
        res.status(500).json({ error: 'Could not fetch projects' });
    }
});

// POST /api/projects — admin only
router.post('/', async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    try {
        const result = await pool.query(
            'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name.trim(), description || null, req.user.id]
        );
        res.status(201).json({ project: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Project name already exists' });
        console.error('Create project error:', err);
        res.status(500).json({ error: 'Could not create project' });
    }
});

// PATCH /api/projects/:id — admin only
router.patch('/:id', async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    const id = parseInt(req.params.id, 10);
    const { name, description, is_active } = req.body;

    const fields = [];
    const params = [id];
    let p = 1;

    if (name !== undefined)        { p++; params.push(name.trim()); fields.push(`name = $${p}`); }
    if (description !== undefined) { p++; params.push(description); fields.push(`description = $${p}`); }
    if (is_active !== undefined)   { p++; params.push(is_active);   fields.push(`is_active = $${p}`); }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    try {
        const result = await pool.query(
            `UPDATE projects SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
            params
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
        res.json({ project: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Project name already exists' });
        console.error('Update project error:', err);
        res.status(500).json({ error: 'Could not update project' });
    }
});

module.exports = router;

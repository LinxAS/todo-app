const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// All routes require authentication and admin role.
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, first_name, last_name, is_admin, created_at FROM users ORDER BY created_at ASC'
        );
        res.json({ users: result.rows });
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Could not list users' });
    }
});

router.post('/', async (req, res) => {
    const { username, password, is_admin = false, first_name = null, last_name = null } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: 'Username must be 3-50 characters' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await pool.query(
            `INSERT INTO users (username, password_hash, is_admin, first_name, last_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, first_name, last_name, is_admin, created_at`,
            [username, hash, is_admin, first_name || null, last_name || null]
        );
        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Could not create user' });
    }
});

router.patch('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { is_admin, password, first_name, last_name } = req.body;

    if (id === req.user.id && is_admin === false) {
        return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }

    try {
        const updates = [];
        const values = [];
        let idx = 1;

        if (is_admin !== undefined) {
            updates.push(`is_admin = $${idx++}`);
            values.push(is_admin);
        }
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }
            const hash = await bcrypt.hash(password, SALT_ROUNDS);
            updates.push(`password_hash = $${idx++}`);
            values.push(hash);
        }
        if (first_name !== undefined) {
            updates.push(`first_name = $${idx++}`);
            values.push(first_name || null);
        }
        if (last_name !== undefined) {
            updates.push(`last_name = $${idx++}`);
            values.push(last_name || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, first_name, last_name, is_admin, created_at`,
            values
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Could not update user' });
    }
});

router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Could not delete user' });
    }
});

module.exports = router;

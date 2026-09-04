const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();
const SALT_ROUNDS = 12;

function signToken(user) {
    return jwt.sign(
        { sub: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

router.post('/register', async (req, res) => {
    const { username, password } = req.body;

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
            return res.status(409).json({ error: 'Username is already taken' });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
            [username, hash]
        );

        const user = result.rows[0];
        const token = signToken(user);
        res.status(201).json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Could not create account' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = signToken(user);
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Returns the current user based on the JWT - used by the frontend on load
// to restore a session without asking for credentials again.
router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;

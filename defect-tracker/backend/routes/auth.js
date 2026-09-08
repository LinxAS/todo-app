const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const portalPool = require('../db/portalPool');

const router = express.Router();

function signToken(user) {
    return jwt.sign(
        { sub: user.id, username: user.username, is_admin: user.is_admin || false },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await portalPool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid username or password' });

        const token = signToken(user);
        res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;

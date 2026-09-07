const express = require('express');
const portalPool = require('../db/portalPool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/users — list all portal users for the assignment dropdown.
// Returns only id and username (no sensitive data).
router.get('/', async (req, res) => {
    try {
        const result = await portalPool.query(
            'SELECT id, username FROM users ORDER BY username ASC'
        );
        res.json({ users: result.rows });
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Could not fetch users' });
    }
});

module.exports = router;

const express    = require('express');
const pool       = require('../db/pool');
const portalPool = require('../db/portalPool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // gives access to :defectId
router.use(requireAuth);

// ── GET /api/defects/:defectId/comments ──────────────────────────────────────
router.get('/', async (req, res) => {
    const defectId = parseInt(req.params.defectId, 10);
    try {
        const result = await pool.query(
            'SELECT * FROM comments WHERE defect_id = $1 ORDER BY created_at ASC',
            [defectId]
        );
        // Attach usernames from portal DB
        const userIds = [...new Set(result.rows.map((c) => c.user_id))];
        let usernameMap = {};
        if (userIds.length) {
            const users = await portalPool.query(
                'SELECT id, username FROM users WHERE id = ANY($1::int[])',
                [userIds]
            );
            usernameMap = Object.fromEntries(users.rows.map((u) => [u.id, u.username]));
        }
        const comments = result.rows.map((c) => ({
            ...c,
            username: usernameMap[c.user_id] || 'unknown',
        }));
        res.json({ comments });
    } catch (err) {
        console.error('List comments error:', err);
        res.status(500).json({ error: 'Could not fetch comments' });
    }
});

// ── POST /api/defects/:defectId/comments ─────────────────────────────────────
router.post('/', async (req, res) => {
    const defectId = parseInt(req.params.defectId, 10);
    const userId   = req.user.id;
    const { body } = req.body;

    if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body is required' });

    // Verify defect exists and user has access
    try {
        const defect = await pool.query('SELECT id FROM defects WHERE id = $1', [defectId]);
        if (!defect.rows.length) return res.status(404).json({ error: 'Defect not found' });

        const result = await pool.query(
            'INSERT INTO comments (defect_id, user_id, body) VALUES ($1, $2, $3) RETURNING *',
            [defectId, userId, body.trim()]
        );
        const comment = result.rows[0];

        // Attach username
        const user = await portalPool.query('SELECT username FROM users WHERE id = $1', [userId]);
        res.status(201).json({
            comment: { ...comment, username: user.rows[0]?.username || 'unknown' },
        });
    } catch (err) {
        console.error('Create comment error:', err);
        res.status(500).json({ error: 'Could not save comment' });
    }
});

// ── DELETE /api/defects/:defectId/comments/:commentId ────────────────────────
router.delete('/:commentId', async (req, res) => {
    const defectId  = parseInt(req.params.defectId, 10);
    const commentId = parseInt(req.params.commentId, 10);
    const userId    = req.user.id;

    try {
        const result = await pool.query(
            'SELECT * FROM comments WHERE id = $1 AND defect_id = $2',
            [commentId, defectId]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Comment not found' });

        const comment = result.rows[0];
        if (comment.user_id !== userId && !req.user.is_admin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ error: 'Could not delete comment' });
    }
});

module.exports = router;

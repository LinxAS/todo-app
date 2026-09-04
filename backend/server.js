require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false, // relax CSP; Nginx/your own policy can tighten this
}));
app.use(cors({
    origin: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Serve the built frontend (frontend/dist) if present, so Nginx can simply
// reverse-proxy everything to this one Node process on port 3000.
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next();
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`TODO API listening on port ${PORT}`);
});

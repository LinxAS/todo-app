require('dotenv').config();
const express = require('express');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/defects',  require('./routes/defects'));
app.use('/api/defects/:defectId/comments', require('./routes/comments'));
app.use('/api/users',    require('./routes/users'));

// Serve compiled frontend
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(PORT, () => console.log(`Linxas Defect Tracker running on port ${PORT}`));

const { Pool } = require('pg');

// Uses standard PG* environment variables automatically (PGHOST, PGPORT,
// PGDATABASE, PGUSER, PGPASSWORD), loaded from .env via dotenv in server.js.
const pool = new Pool({
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;

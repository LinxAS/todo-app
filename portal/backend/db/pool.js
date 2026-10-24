const { Pool } = require('pg');

// Reads PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD from environment.
const pool = new Pool();

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;

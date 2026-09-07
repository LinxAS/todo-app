const { Pool } = require('pg');

// Connects to linxas_portal for user lookups (task sharing, username resolution).
// Uses the same host/port/credentials as the main pool but targets the portal DB.
module.exports = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    database: process.env.PORTAL_PGDATABASE || 'linxas_portal',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

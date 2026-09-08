const { Pool } = require('pg');
require('dotenv').config();

module.exports = new Pool({
    host:     process.env.PGHOST           || 'localhost',
    port:     parseInt(process.env.PGPORT  || '5432'),
    database: process.env.PORTAL_PGDATABASE || 'linxas_portal',
    user:     process.env.PORTAL_PGUSER,
    password: process.env.PORTAL_PGPASSWORD,
});

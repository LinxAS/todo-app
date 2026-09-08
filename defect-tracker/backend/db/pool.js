const { Pool } = require('pg');
require('dotenv').config();

module.exports = new Pool({
    host:     process.env.PGHOST     || 'localhost',
    port:     parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'linxas_defects',
    user:     process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

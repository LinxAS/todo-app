const { Pool } = require('pg');

module.exports = new Pool();
// Reads PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD from environment.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/campus_events',
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

module.exports = pool;

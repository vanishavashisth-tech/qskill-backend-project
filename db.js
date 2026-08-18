// src/config/db.js
// PostgreSQL connection pool configuration

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test the connection as soon as the app starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err.message);
    return;
  }
  console.log('Connected to PostgreSQL database successfully.');
  release();
});

module.exports = pool;

/**
 * PostgreSQL Database Connection
 */

import pg from 'pg';
const { Pool } = pg;

// Database configuration from environment variables
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'consultation_booking',
    user: process.env.DB_USER || 'consultation_user',
    password: process.env.DB_PASSWORD || 'secure_password_2026',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
});

export default pool;

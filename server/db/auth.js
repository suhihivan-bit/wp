/**
 * Authentication and Admin User Management
 */

import pool from './connection.js';
import bcrypt from 'bcryptjs';

/**
 * Create admin user
 */
export async function createAdminUser(email, password) {
    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
    INSERT INTO admin_users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, created_at
  `;

    try {
        const result = await pool.query(query, [email, passwordHash]);
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error('Email already exists');
        }
        console.error('Error creating admin user:', error);
        throw error;
    }
}

/**
 * Verify admin login
 */
export async function verifyAdminLogin(email, password) {
    const query = 'SELECT * FROM admin_users WHERE email = $1';

    try {
        const result = await pool.query(query, [email]);
        const user = result.rows[0];

        if (!user) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return null;
        }

        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;

    } catch (error) {
        console.error('Error verifying admin login:', error);
        throw error;
    }
}

/**
 * Get admin user by ID
 */
export async function getAdminById(id) {
    const query = 'SELECT id, email, created_at FROM admin_users WHERE id = $1';

    try {
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting admin user:', error);
        throw error;
    }
}

/**
 * Change admin password
 */
export async function changeAdminPassword(email, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const query = `
    UPDATE admin_users 
    SET password_hash = $1 
    WHERE email = $2 
    RETURNING id, email
  `;

    try {
        const result = await pool.query(query, [passwordHash, email]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
}

/**
 * Bookings Database Operations
 */

import pool from './connection.js';

/**
 * Create a new booking
 */
export async function createBooking(bookingData) {
    const {
        date,
        time,
        fullName,
        email,
        phone,
        category,
        messenger,
        messengerHandle,
        questions
    } = bookingData;

    const query = `
    INSERT INTO bookings (
      date, time, full_name, email, phone, 
      category, messenger, messenger_handle, questions, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

    const values = [
        date,
        time,
        fullName,
        email,
        phone,
        category,
        messenger || 'none',
        messengerHandle || '',
        questions || '',
        'pending'
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
    }
}

/**
 * Get all bookings
 */
export async function getAllBookings() {
    const query = `
    SELECT * FROM bookings 
    ORDER BY created_at DESC
  `;

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error getting bookings:', error);
        throw error;
    }
}

/**
 * Get booking by ID
 */
export async function getBookingById(id) {
    const query = 'SELECT * FROM bookings WHERE id = $1';

    try {
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting booking:', error);
        throw error;
    }
}

/**
 * Delete booking by ID
 */
export async function deleteBooking(id) {
    const query = 'DELETE FROM bookings WHERE id = $1 RETURNING *';

    try {
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error deleting booking:', error);
        throw error;
    }
}

/**
 * Get occupied time slots for a specific date
 */
export async function getOccupiedTimes(date) {
    const query = `
    SELECT time FROM bookings 
    WHERE date = $1 AND status != 'cancelled'
  `;

    try {
        const result = await pool.query(query, [date]);
        return result.rows.map(row => row.time);
    } catch (error) {
        console.error('Error getting occupied times:', error);
        throw error;
    }
}

/**
 * Check if a time slot is occupied
 */
export async function isTimeSlotOccupied(date, time) {
    const query = `
    SELECT COUNT(*) as count FROM bookings 
    WHERE date = $1 AND time = $2 AND status != 'cancelled'
  `;

    try {
        const result = await pool.query(query, [date, time]);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('Error checking time slot:', error);
        throw error;
    }
}

/**
 * Update booking status
 */
export async function updateBookingStatus(id, status) {
    const query = `
    UPDATE bookings 
    SET status = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING *
  `;

    try {
        const result = await pool.query(query, [status, id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error updating booking status:', error);
        throw error;
    }
}

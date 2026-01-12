/**
 * Work Schedule Database Operations
 */

import pool from './connection.js';

/**
 * Get work schedule for a specific day of week
 * @param {number} dayOfWeek - 1=Monday, 7=Sunday
 */
export async function getScheduleForDay(dayOfWeek) {
    const query = `
        SELECT ws.*, c.name as consultant_name
        FROM work_schedule ws
        LEFT JOIN consultants c ON ws.consultant_id = c.id
        WHERE ws.day_of_week = $1 AND ws.is_active = true
        ORDER BY ws.start_time
    `;

    try {
        const result = await pool.query(query, [dayOfWeek]);
        return result.rows;
    } catch (error) {
        console.error('Error getting schedule for day:', error);
        throw error;
    }
}

/**
 * Get all work schedules
 */
export async function getAllSchedules() {
    const query = `
        SELECT ws.*, c.name as consultant_name
        FROM work_schedule ws
        LEFT JOIN consultants c ON ws.consultant_id = c.id
        WHERE ws.is_active = true
        ORDER BY ws.day_of_week, ws.start_time
    `;

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error getting all schedules:', error);
        throw error;
    }
}

/**
 * Check if date is blocked
 */
export async function isDateBlocked(date) {
    const query = 'SELECT COUNT(*) as count FROM blocked_dates WHERE date = $1';

    try {
        const result = await pool.query(query, [date]);
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('Error checking blocked date:', error);
        throw error;
    }
}

/**
 * Get all blocked dates
 */
export async function getBlockedDates() {
    const query = `
        SELECT bd.*, c.name as consultant_name
        FROM blocked_dates bd
        LEFT JOIN consultants c ON bd.consultant_id = c.id
        ORDER BY bd.date
    `;

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error getting blocked dates:', error);
        throw error;
    }
}

/**
 * Add blocked date
 */
export async function addBlockedDate(date, reason = null) {
    const query = `
        INSERT INTO blocked_dates (date, reason)
        VALUES ($1, $2)
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [date, reason]);
        return result.rows[0];
    } catch (error) {
        console.error('Error adding blocked date:', error);
        throw error;
    }
}

/**
 * Remove blocked date
 */
export async function removeBlockedDate(id) {
    const query = 'DELETE FROM blocked_dates WHERE id = $1 RETURNING *';

    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error removing blocked date:', error);
        throw error;
    }
}

/**
 * Get available time slots for a date
 * Considers: work schedule, blocked dates, existing bookings
 */
export async function getAvailableSlots(date) {
    try {
        // Check if date is blocked
        const blocked = await isDateBlocked(date);
        if (blocked) {
            return [];
        }

        // Get day of week (0=Sunday, 1=Monday, etc.)
        const dateObj = new Date(date);
        let dayOfWeek = dateObj.getDay();
        // Convert to 1=Monday format
        dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        // Get work schedule for this day
        const schedules = await getScheduleForDay(dayOfWeek);

        if (schedules.length === 0) {
            return []; // No work on this day
        }

        // Get occupied times from bookings
        const occupiedQuery = `
            SELECT time FROM bookings 
            WHERE date = $1 AND status != 'cancelled'
        `;
        const occupiedResult = await pool.query(occupiedQuery, [date]);
        const occupiedTimes = occupiedResult.rows.map(r => r.time);

        // Generate available slots
        const slots = [];

        for (const schedule of schedules) {
            const startHour = parseInt(schedule.start_time.split(':')[0]);
            const startMin = parseInt(schedule.start_time.split(':')[1]);
            const endHour = parseInt(schedule.end_time.split(':')[0]);
            const endMin = parseInt(schedule.end_time.split(':')[1]);

            // Generate hourly slots
            for (let hour = startHour; hour < endHour; hour++) {
                const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

                if (!occupiedTimes.includes(timeSlot)) {
                    slots.push({
                        time: timeSlot,
                        consultant: schedule.consultant_name,
                        available: true
                    });
                }
            }
        }

        return slots;

    } catch (error) {
        console.error('Error getting available slots:', error);
        throw error;
    }
}

/**
 * Get booking settings
 */
export async function getSettings() {
    const query = 'SELECT * FROM booking_settings';

    try {
        const result = await pool.query(query);
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        return settings;
    } catch (error) {
        console.error('Error getting settings:', error);
        throw error;
    }
}

/**
 * Update booking setting
 */
export async function updateSetting(key, value) {
    const query = `
        INSERT INTO booking_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    try {
        const result = await pool.query(query, [key, value]);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating setting:', error);
        throw error;
    }
}

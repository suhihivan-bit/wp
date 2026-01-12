/**
 * API Client for Consultation Booking System
 * Replaces Firebase SDK with REST API calls
 */

const API_BASE_URL = ''; // Empty string for relative URLs (same origin)

class BookingAPI {
    /**
     * Create a new booking
     */
    async createBooking(bookingData) {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create booking');
        }

        return await response.json();
    }

    /**
     * Get occupied time slots for a specific date
     */
    async getOccupiedTimes(date) {
        const response = await fetch(`${API_BASE_URL}/api/bookings/occupied/${date}`);

        if (!response.ok) {
            throw new Error('Failed to get occupied times');
        }

        const data = await response.json();
        return data.occupiedTimes;
    }

    /**
     * Get all bookings (admin only)
     */
    async getAllBookings() {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            credentials: 'include' // Include cookies for auth
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            throw new Error('Failed to get bookings');
        }

        const data = await response.json();
        return data.bookings;
    }

    /**
     * Delete a booking (admin only)
     */
    async deleteBooking(id) {
        const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            throw new Error('Failed to delete booking');
        }

        return await response.json();
    }
}

class AuthAPI {
    /**
     * Login admin user
     */
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        return await response.json();
    }

    /**
     * Logout admin user
     */
    async logout() {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Logout failed');
        }

        return await response.json();
    }

    /**
     * Check authentication status
     */
    async checkAuth() {
        const response = await fetch(`${API_BASE_URL}/api/auth/check`, {
            credentials: 'include'
        });

        if (!response.ok) {
            return { authenticated: false };
        }

        return await response.json();
    }
}

// Export instances
const bookingAPI = new BookingAPI();
const authAPI = new AuthAPI();

// For ES6 modules

// For global scope (if not using modules)
if (typeof window !== 'undefined') {
    window.bookingAPI = bookingAPI;
    window.authAPI = authAPI;
}

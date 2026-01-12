/**
 * Consultation Booking Server
 * PostgreSQL-based backend with REST API
 */

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendEmailNotifications } from './notifications/email.js';
import { sendTelegramNotification } from './notifications/telegram.js';
import * as bookingsDB from './db/bookings.js';
import * as authDB from './db/auth.js';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// Session middleware for authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static('public'));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'consultation-booking-server',
        database: 'postgresql'
    });
});

// Create booking (public)
app.post('/api/bookings', async (req, res) => {
    try {
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
        } = req.body;

        // Validate required fields
        if (!date || !time || !fullName || !email || !phone || !category) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Check if time slot is occupied
        const isOccupied = await bookingsDB.isTimeSlotOccupied(date, time);
        if (isOccupied) {
            return res.status(409).json({
                error: 'Time slot already occupied'
            });
        }

        // Create booking
        const booking = await bookingsDB.createBooking({
            date,
            time,
            fullName,
            email,
            phone,
            category,
            messenger: messenger || 'none',
            messengerHandle: messengerHandle || '',
            questions: questions || ''
        });

        console.log('✅ Booking created:', booking.id);

        // Send notifications in parallel
        const notificationResults = await Promise.allSettled([
            sendTelegramNotification(booking, {
                botToken: process.env.TELEGRAM_BOT_TOKEN,
                chatId: process.env.TELEGRAM_CHAT_ID
            }),
            sendEmailNotifications(booking, {
                apiKey: process.env.RESEND_API_KEY,
                adminEmail: process.env.ADMIN_EMAIL
            })
        ]);

        const [telegramResult, emailResult] = notificationResults;

        console.log('📊 Notifications:', {
            telegram: telegramResult.status,
            email: emailResult.status
        });

        res.status(201).json({
            success: true,
            booking: {
                id: booking.id,
                date: booking.date,
                time: booking.time
            },
            notifications: {
                telegram: telegramResult.status === 'fulfilled',
                email: emailResult.status === 'fulfilled'
            }
        });

    } catch (error) {
        console.error('❌ Error creating booking:', error);
        res.status(500).json({
            error: 'Failed to create booking',
            message: error.message
        });
    }
});

// Get occupied time slots for a date (public)
app.get('/api/bookings/occupied/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const occupiedTimes = await bookingsDB.getOccupiedTimes(date);

        res.json({
            date,
            occupiedTimes
        });

    } catch (error) {
        console.error('❌ Error getting occupied times:', error);
        res.status(500).json({
            error: 'Failed to get occupied times'
        });
    }
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required'
            });
        }

        const user = await authDB.verifyAdminLogin(email, password);

        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Set session
        req.session.userId = user.id;
        req.session.userEmail = user.email;

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            error: 'Login failed'
        });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                email: req.session.userEmail
            }
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

// ==========================================
// ADMIN ENDPOINTS (require authentication)
// ==========================================

// Get all bookings
app.get('/api/bookings', requireAuth, async (req, res) => {
    try {
        const bookings = await bookingsDB.getAllBookings();

        res.json({
            bookings,
            total: bookings.length
        });

    } catch (error) {
        console.error('❌ Error getting bookings:', error);
        res.status(500).json({
            error: 'Failed to get bookings'
        });
    }
});

// Get single booking
app.get('/api/bookings/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await bookingsDB.getBookingById(id);

        if (!booking) {
            return res.status(404).json({
                error: 'Booking not found'
            });
        }

        res.json(booking);

    } catch (error) {
        console.error('❌ Error getting booking:', error);
        res.status(500).json({
            error: 'Failed to get booking'
        });
    }
});

// Delete booking
app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await bookingsDB.deleteBooking(id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Booking not found'
            });
        }

        res.json({
            success: true,
            deleted: {
                id: deleted.id
            }
        });

    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        res.status(500).json({
            error: 'Failed to delete booking'
        });
    }
});

// Update booking status
app.put('/api/bookings/:id/status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                error: 'Status required'
            });
        }

        const updated = await bookingsDB.updateBookingStatus(id, status);

        if (!updated) {
            return res.status(404).json({
                error: 'Booking not found'
            });
        }

        res.json({
            success: true,
            booking: updated
        });

    } catch (error) {
        console.error('❌ Error updating booking:', error);
        res.status(500).json({
            error: 'Failed to update booking'
        });
    }
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error'
    });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🚀 Server running on port ${PORT}    ║
║  💾 Database: PostgreSQL              ║
║  📧 Email: ${process.env.RESEND_API_KEY ? 'Enabled' : 'Disabled'}                 ║
║  📱 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'Enabled' : 'Disabled'}              ║
╚═══════════════════════════════════════╝
  `);
});

export default app;

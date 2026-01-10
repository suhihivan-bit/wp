/**
 * Self-Hosted Notification Server
 * Handles webhook calls from frontend to send email and Telegram notifications
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendEmailNotifications } from './notifications/email.js';
import { sendTelegramNotification } from './notifications/telegram.js';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(express.static('public'));

// Initialize Firebase Admin (optional - for Firestore listener)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(
        readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT, 'utf8')
    );
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized');
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'consultation-booking-server'
    });
});

// Webhook endpoint for new bookings
app.post('/api/webhook/booking', async (req, res) => {
    try {
        const booking = req.body;

        // Validate booking data
        if (!booking || !booking.fullName || !booking.email) {
            return res.status(400).json({
                error: 'Invalid booking data',
                message: 'Missing required fields: fullName, email'
            });
        }

        console.log('📌 New booking webhook received:', {
            name: booking.fullName,
            date: booking.date,
            time: booking.time
        });

        // Send notifications in parallel
        const results = await Promise.allSettled([
            sendTelegramNotification(booking, {
                botToken: process.env.TELEGRAM_BOT_TOKEN,
                chatId: process.env.TELEGRAM_CHAT_ID
            }),
            sendEmailNotifications(booking, {
                apiKey: process.env.RESEND_API_KEY,
                adminEmail: process.env.ADMIN_EMAIL
            })
        ]);

        // Log results
        const [telegramResult, emailResult] = results;

        console.log('📊 Notification results:', {
            telegram: telegramResult.status,
            email: emailResult.status
        });

        // Return response
        res.json({
            success: true,
            bookingId: booking.id || 'generated-on-save',
            notifications: {
                telegram: telegramResult.status === 'fulfilled',
                email: emailResult.status === 'fulfilled'
            }
        });

    } catch (error) {
        console.error('❌ Error processing booking webhook:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Firestore listener (optional - if you want server-side triggers)
if (process.env.ENABLE_FIRESTORE_LISTENER === 'true' && admin.apps.length > 0) {
    const db = admin.firestore();

    db.collection('bookings').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const booking = {
                    id: change.doc.id,
                    ...change.doc.data()
                };

                console.log('🔔 New booking from Firestore listener:', booking.id);

                // Send notifications
                try {
                    await Promise.all([
                        sendTelegramNotification(booking, {
                            botToken: process.env.TELEGRAM_BOT_TOKEN,
                            chatId: process.env.TELEGRAM_CHAT_ID
                        }),
                        sendEmailNotifications(booking, {
                            apiKey: process.env.RESEND_API_KEY,
                            adminEmail: process.env.ADMIN_EMAIL
                        })
                    ]);
                } catch (error) {
                    console.error('Error sending notifications:', error);
                }
            }
        });
    });

    console.log('✅ Firestore listener started');
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🚀 Server running on port ${PORT}    ║
║  📧 Email notifications: ${process.env.RESEND_API_KEY ? 'Enabled' : 'Disabled'}  ║
║  📱 Telegram notifications: ${process.env.TELEGRAM_BOT_TOKEN ? 'Enabled' : 'Disabled'} ║
║  🔥 Firestore listener: ${process.env.ENABLE_FIRESTORE_LISTENER === 'true' ? 'Enabled' : 'Disabled'}    ║
╚═══════════════════════════════════════╝
  `);
});

export default app;

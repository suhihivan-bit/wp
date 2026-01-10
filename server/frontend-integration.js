// Frontend modification for webhook integration
// Add this to your script.js after saving to Firestore

/**
 * Call webhook to trigger notifications on server
 * @param {Object} booking - Booking data
 */
async function callNotificationWebhook(booking) {
    // Your server webhook URL
    const WEBHOOK_URL = 'https://your-domain.ru/api/webhook/booking';
    // For local testing: 'http://localhost:3001/api/webhook/booking'

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(booking)
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Notifications sent:', result);
        return true;

    } catch (error) {
        console.error('⚠️ Webhook error (notifications not sent):', error);
        // Don't throw - booking is already saved, notifications are optional
        return false;
    }
}

// MODIFY existing saveBooking function in script.js
// Add webhook call AFTER successful Firebase save:

async function saveBooking(date, time, formData) {
    try {
        // Original Firebase save code
        const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
            date: date,
            time: time,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            category: formData.category,
            messenger: formData.messenger,
            messengerHandle: formData.messengerHandle || '',
            questions: formData.questions || '',
            status: 'pending',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        console.log('✅ Booking saved to Firebase with ID:', docRef.id);

        // NEW: Call webhook for notifications
        await callNotificationWebhook({
            id: docRef.id,
            date: date,
            time: time,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            category: formData.category,
            messenger: formData.messenger,
            messengerHandle: formData.messengerHandle || '',
            questions: formData.questions || ''
        });

        return docRef.id;

    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        throw new Error('Не удалось сохранить запись. Попробуйте ещё раз.');
    }
}

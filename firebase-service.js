// ==========================================
// FIREBASE INTEGRATION - BOOKING SAVE
// ==========================================

// Import Firebase functions
import { db, collection, addDoc, Timestamp, COLLECTIONS } from './firebase-config.js';

/**
 * Save booking to Firestore
 * @param {string} date - Booking date (YYYY-MM-DD)
 * @param {string} time - Booking time (HH:MM)
 * @param {Object} formData - Form data object
 * @returns {Promise<string>} Document ID
 */
export async function saveBookingToFirebase(date, time, formData) {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
            // Дата и время
            date: date,
            time: time,

            // Личные данные
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,

            // Категория
            category: formData.category,

            // Мессенджер
            messenger: formData.messenger,
            messengerHandle: formData.messengerHandle || '',

            // Вопросы
            questions: formData.questions || '',

            // Метаданные
            status: 'pending', // pending | confirmed | cancelled
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        console.log('✅ Запись сохранена в Firebase с ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Ошибка сохранения в Firebase:', error);
        throw new Error('Не удалось сохранить запись. Попробуйте ещё раз.');
    }
}

/**
 * Check if time slot is occupied (from Firestore)
 * @param {string} date - Date to check
 * @param {string} time - Time to check
 * @returns {Promise<boolean>}
 */
export async function isTimeSlotOccupiedInFirebase(date, time) {
    try {
        const { getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const q = query(
            collection(db, COLLECTIONS.BOOKINGS),
            where('date', '==', date),
            where('time', '==', time),
            where('status', '!=', 'cancelled')
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('❌ Ошибка проверки слота:', error);
        return false; // В случае ошибки разрешаем бронирование
    }
}

/**
 * Get occupied times for a specific date (from Firestore)
 * @param {string} date - Date to check
 * @returns {Promise<string[]>} Array of occupied time slots
 */
export async function getOccupiedTimesFromFirebase(date) {
    try {
        const { getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const q = query(
            collection(db, COLLECTIONS.BOOKINGS),
            where('date', '==', date),
            where('status', '!=', 'cancelled')
        );

        const querySnapshot = await getDocs(q);
        const occupiedTimes = [];

        querySnapshot.forEach((doc) => {
            occupiedTimes.push(doc.data().time);
        });

        return occupiedTimes;
    } catch (error) {
        console.error('❌ Ошибка получения занятых слотов:', error);
        return [];
    }
}

// ==========================================
// FIREBASE IMPORTS
// ==========================================
import { db, collection, query, getDocs, deleteDoc, doc, onSnapshot, orderBy, Timestamp, COLLECTIONS } from './firebase-config.js';

// ==========================================
// AUTHENTICATION CHECK
// ==========================================

// Check if user is authenticated
function checkAuth() {
    const sessionStr = localStorage.getItem('adminSession');

    if (!sessionStr) {
        window.location.href = 'login.html';
        return false;
    }

    try {
        const session = JSON.parse(sessionStr);
        const expiresAt = new Date(session.expiresAt);
        const now = new Date();

        if (now > expiresAt) {
            // Session expired
            localStorage.removeItem('adminSession');
            window.location.href = 'login.html';
            return false;
        }

        return true;
    } catch (e) {
        localStorage.removeItem('adminSession');
        window.location.href = 'login.html';
        return false;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('adminSession');
    window.location.href = 'login.html';
}

// Make logout globally available
window.logout = logout;

// Check auth immediately
if (!checkAuth()) {
    // Will redirect if not authenticated
}

// ==========================================
// ADMIN PANEL - BOOKINGS MANAGEMENT
// ==========================================

document.addEventListener('DOMContentLoaded', function () {
    let allBookings = [];
    let confirmCallback = null;
    let unsubscribe = null; // For realtime listener cleanup

    // Elements
    const tableBody = document.getElementById('bookingsTableBody');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const exportAllBtn = document.getElementById('exportAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Stats elements
    const totalBookingsEl = document.getElementById('totalBookings');
    const upcomingBookingsEl = document.getElementById('upcomingBookings');
    const applicantCountEl = document.getElementById('applicantCount');

    // Load and display bookings from Firestore (with realtime updates)
    function loadBookings() {
        console.log('📊 Setting up Firestore realtime listener...');

        // Create query to get bookings ordered by date and time
        const q = query(
            collection(db, COLLECTIONS.BOOKINGS),
            orderBy('createdAt', 'desc')
        );

        // Set up realtime listener
        unsubscribe = onSnapshot(q, (querySnapshot) => {
            allBookings = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                allBookings.push({
                    id: doc.id,  // Firestore document ID
                    date: data.date,
                    time: data.time,
                    data: {
                        fullName: data.fullName,
                        email: data.email,
                        phone: data.phone,
                        category: data.category,
                        messenger: data.messenger,
                        messengerHandle: data.messengerHandle,
                        questions: data.questions,
                        status: data.status || 'pending'
                    }
                });
            });

            console.log(`✅ Loaded ${allBookings.length} bookings from Firestore`);
            updateStats();
            renderBookings(allBookings);
        }, (error) => {
            console.error('❌ Error loading bookings from Firestore:', error);
            // Show error to user
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: #ff4444; padding: 2rem;">
                            ⚠️ Ошибка загрузки данных из Firebase. Проверьте подключение.
                        </td>
                    </tr>
                `;
            }
        });
    }

    // Update statistics
    function updateStats() {
        const total = allBookings.length;
        const now = new Date();
        const upcoming = allBookings.filter(booking => {
            const bookingDate = new Date(booking.date + 'T' + booking.time);
            return bookingDate > now;
        }).length;
        const applicants = allBookings.filter(booking => booking.data.category === 'applicant').length;

        totalBookingsEl.textContent = total;
        upcomingBookingsEl.textContent = upcoming;
        applicantCountEl.textContent = applicants;
    }

    // Render bookings table
    function renderBookings(bookings) {
        if (bookings.length === 0) {
            tableBody.innerHTML = '';
            emptyState.classList.add('active');
            return;
        }

        emptyState.classList.remove('active');

        // Sort by date and time (newest first)
        const sortedBookings = [...bookings].sort((a, b) => {
            const dateA = new Date(a.date + 'T' + a.time);
            const dateB = new Date(b.date + 'T' + b.time);
            return dateB - dateA;
        });

        tableBody.innerHTML = sortedBookings.map((booking) => {
            const { date, time, data, id } = booking;
            const categoryText = data.category === 'applicant' ? 'Абитуриент' : 'Родитель';
            const categoryClass = data.category === 'applicant' ? 'category-applicant' : 'category-parent';
            const questions = data.questions || 'Нет вопросов';
            const hasQuestions = data.questions && data.questions.trim() !== '';

            // Format messenger
            const messengerIcons = {
                telegram: '📱 Telegram',
                whatsapp: '💬 WhatsApp',
                viber: '📞 Viber',
                none: '✉️ Email'
            };
            const messengerText = messengerIcons[data.messenger] || messengerIcons.none;
            const messengerHandle = data.messengerHandle || '';

            // Format date
            const [year, month, day] = date.split('-');
            const formattedDate = `${day}.${month}.${year}`;

            return `
                <tr data-booking-id="${id}">
                    <td>
                        <div class="booking-date">${formattedDate}</div>
                        <div class="booking-time">${time}</div>
                    </td>
                    <td>${data.fullName}</td>
                    <td>
                        <span class="category-badge ${categoryClass}">${categoryText}</span>
                    </td>
                    <td>
                        <div class="contact-info">
                            <div class="contact-email">${data.email}</div>
                            <div class="contact-phone">${data.phone}</div>
                            ${messengerHandle ? `<div class="contact-messenger">${messengerText}: ${messengerHandle}</div>` : `<div class="contact-messenger">${messengerText}</div>`}
                        </div>
                    </td>
                    <td>
                        <div class="questions-cell ${hasQuestions ? '' : 'empty'}">${questions}</div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="icon-btn export-single-btn" onclick="exportSingle('${id}')" title="Экспорт в календарь">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M7 10L12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button class="icon-btn delete-btn" onclick="deleteBooking('${id}')" title="Удалить запись">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Search functionality
    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();

        if (!query) {
            renderBookings(allBookings);
            return;
        }

        const filtered = allBookings.filter(booking => {
            const { data } = booking;
            return (
                data.fullName.toLowerCase().includes(query) ||
                data.email.toLowerCase().includes(query) ||
                data.phone.toLowerCase().includes(query) ||
                (data.questions && data.questions.toLowerCase().includes(query))
            );
        });

        renderBookings(filtered);
    });

    // Export single booking
    window.exportSingle = function (bookingId) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return;
        }

        const icsContent = generateICS(booking);
        downloadICSFile(icsContent, `consultation-${booking.date}-${booking.time.replace(':', '')}.ics`);
    };

    // Export all bookings
    exportAllBtn.addEventListener('click', function () {
        if (allBookings.length === 0) {
            alert('Нет записей для экспорта');
            return;
        }

        showConfirmModal(
            'Экспорт всех записей',
            `Скачать ${allBookings.length} ${getBookingsWord(allBookings.length)} в формате .ics для импорта в календарь?`,
            function () {
                exportAllToCalendar();
            }
        );
    });

    // Export all to calendar
    function exportAllToCalendar() {
        allBookings.forEach((booking, index) => {
            setTimeout(() => {
                const icsContent = generateICS(booking);
                downloadICSFile(icsContent, `consultation-${booking.date}-${booking.time.replace(':', '')}-${index + 1}.ics`);
            }, index * 100); // Stagger downloads to avoid browser blocking
        });

        // Show success message
        setTimeout(() => {
            alert(`Экспортировано ${allBookings.length} ${getBookingsWord(allBookings.length)}!`);
        }, allBookings.length * 100 + 200);
    }

    // ICS file generation
    function generateICS(booking) {
        const { date, time, data } = booking;
        const startDateTime = new Date(`${date}T${time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        const formatDate = (d) => {
            return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const categoryText = data.category === 'applicant' ? 'Абитуриент' : 'Родитель';

        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Consultation Booking//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${booking.id || Date.now()}@consultation-booking.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDateTime)}
DTEND:${formatDate(endDateTime)}
SUMMARY:Консультация: ${data.fullName}
DESCRIPTION:Категория: ${categoryText}\\nEmail: ${data.email}\\nТелефон: ${data.phone}${data.questions ? `\\n\\nВопросы: ${data.questions}` : ''}
LOCATION:Приёмная комиссия
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
    }

    // Delete single booking
    window.deleteBooking = async function (bookingId) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return;
        }
        const [year, month, day] = booking.date.split('-');
        const formattedDate = `${day}.${month}.${year}`;

        showConfirmModal(
            'Удаление записи',
            `Удалить запись на ${formattedDate} в ${booking.time} для ${booking.data.fullName}?`,
            async function () {
                try {
                    await deleteDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId));
                    console.log('✅ Booking deleted:', bookingId);
                    // No need to call loadBookings() - onSnapshot will auto-update
                } catch (error) {
                    console.error('❌ Error deleting booking:', error);
                    alert('Ошибка при удалении записи. Попробуйте снова.');
                }
            }
        );
    };

    // Clear all bookings
    clearAllBtn.addEventListener('click', function () {
        if (allBookings.length === 0) {
            alert('Нет записей для удаления');
            return;
        }

        showConfirmModal(
            'Внимание!',
            `Удалить ВСЕ записи (${allBookings.length} ${getBookingsWord(allBookings.length)})? Это действие нельзя отменить!`,
            async function () {
                try {
                    // Delete all bookings
                    const deletePromises = allBookings.map(booking =>
                        deleteDoc(doc(db, COLLECTIONS.BOOKINGS, booking.id))
                    );

                    await Promise.all(deletePromises);
                    console.log('✅ All bookings deleted');
                    // No need to call loadBookings() - onSnapshot will auto-update
                } catch (error) {
                    console.error('❌ Error deleting all bookings:', error);
                    alert('Ошибка при удалении записей. Попробуйте снова.');
                }
            }
        );
    });

    // Modal functions
    function showConfirmModal(title, message, callback) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmCallback = callback;
        confirmModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideConfirmModal() {
        confirmModal.classList.remove('active');
        document.body.style.overflow = '';
        confirmCallback = null;
    }

    confirmBtn.addEventListener('click', function () {
        if (confirmCallback) {
            confirmCallback();
        }
        hideConfirmModal();
    });

    cancelBtn.addEventListener('click', hideConfirmModal);

    confirmModal.addEventListener('click', function (e) {
        if (e.target === confirmModal) {
            hideConfirmModal();
        }
    });

    // Helper function for proper word form
    function getBookingsWord(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return 'записей';
        }

        if (lastDigit === 1) {
            return 'запись';
        }

        if (lastDigit >= 2 && lastDigit <= 4) {
            return 'записи';
        }

        return 'записей';
    }

    // Helper to download ICS file
    function downloadICSFile(content, filename) {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Initialize - load bookings with realtime listener
    loadBookings();

    // Cleanup listener when page unloads
    window.addEventListener('beforeunload', () => {
        if (unsubscribe) {
            unsubscribe();
        }
    });

    // Note: No need for setInterval - onSnapshot provides realtime updates automatically!
});

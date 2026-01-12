// ==========================================
// ADMIN PANEL - PostgreSQL API VERSION
// ==========================================

// authAPI and bookingAPI are loaded glob ally from api-client.js

console.log('🔐 Admin Panel Loading...');

// Admin panel will initialize after auth check
let allBookings = [];

// ==========================================
// POLLING CONFIGURATION
// ==========================================

const REFRESH_INTERVAL = 5000; // 5 seconds
let refreshTimer = null;

// ==========================================
// LOAD AND DISPLAY BOOKINGS
// ==========================================

async function loadBookings() {
    try {
        const bookings = await bookingAPI.getAllBookings();
        allBookings = bookings;
        renderBookings(allBookings);
        updateStats(allBookings);
        console.log('✅ Loaded', bookings.length, 'bookings');
    } catch (error) {
        console.error('❌ Error loading bookings:', error);

        if (error.message === 'Unauthorized') {
            // Session expired, redirect to login
            window.location.href = 'login.html';
        } else {
            // Show empty state
            const tableBody = document.getElementById('bookingsTableBody');
            const emptyState = document.getElementById('emptyState');

            if (tableBody) tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
        }
    }
}

// ==========================================
// RENDER BOOKINGS TABLE
// ==========================================

function renderBookings(bookings) {
    const tableBody = document.getElementById('bookingsTableBody');
    const emptyState = document.getElementById('emptyState');

    if (!bookings || bookings.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const rows = bookings.map(booking => {
        const { id, full_name, email, phone, date, time, category, messenger, messenger_handle, questions } = booking;

        // Format date
        const formattedDate = formatDate(date);

        // Category badge
        const categoryBadge = category === 'applicant'
            ? '<span class="category-badge applicant">🎓 Абитуриент</span>'
            : '<span class="category-badge parent">👪 Родитель</span>';

        // Messenger info
        let messengerInfo = '';
        if (messenger && messenger !== 'none' && messenger_handle) {
            const icons = {
                telegram: '📱',
                whatsapp: '💬',
                viber: '📞'
            };
            const icon = icons[messenger] || '📱';
            messengerInfo = `<div class="messenger-info">${icon} ${messenger_handle}</div>`;
        }

        // Questions preview
        const questionsPreview = questions
            ? `<div class="questions-preview" title="${escapeHtml(questions)}">❓ ${escapeHtml(questions.substring(0, 50))}${questions.length > 50 ? '...' : ''}</div>`
            : '';

        return `
            <tr data-id="${id}">
                <td>
                    <div class="booking-person">
                        <div class="person-name">${escapeHtml(full_name)}</div>
                        ${categoryBadge}
                    </div>
                </td>
                <td>
                    <div class="contact-info">
                        <div class="email">📧 ${escapeHtml(email)}</div>
                        <div class="phone">📱 ${escapeHtml(phone)}</div>
                        ${messengerInfo}
                    </div>
                </td>
                <td>
                    <div class="datetime-info">
                        <div class="date">📅 ${formattedDate}</div>
                        <div class="time">🕐 ${time}</div>
                    </div>
                </td>
                <td>
                    ${questionsPreview}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="export-btn" onclick="exportBookingToCalendar(${id})" title="Экспорт в календарь">
                            📅 Экспорт
                        </button>
                        <button class="delete-btn" onclick="deleteBooking(${id})" title="Удалить">
                            🗑️ Удалить
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (tableBody) {
        tableBody.innerHTML = rows;
    }
}

// ==========================================
// UPDATE STATISTICS
// ==========================================

function updateStats(bookings) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const upcomingBookingsEl = document.getElementById('upcomingBookings');
    const applicantCountEl = document.getElementById('applicantCount');

    const total = bookings.length;

    // Count upcoming (future bookings)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= today;
    }).length;

    // Count applicants
    const applicants = bookings.filter(b => b.category === 'applicant').length;

    if (totalBookingsEl) totalBookingsEl.textContent = total;
    if (upcomingBookingsEl) upcomingBookingsEl.textContent = upcoming;
    if (applicantCountEl) applicantCountEl.textContent = applicants;
}

// ==========================================
// DELETE BOOKING
// ==========================================

window.deleteBooking = async function (bookingId) {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
        return;
    }

    try {
        await bookingAPI.deleteBooking(bookingId);
        console.log('✅ Booking deleted:', bookingId);

        // Remove from local array
        allBookings = allBookings.filter(b => b.id !== bookingId);

        // Re-render
        renderBookings(allBookings);
        updateStats(allBookings);

        // Reload from server to ensure sync
        await loadBookings();

    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        alert('Не удалось удалить запись. Попробуйте еще раз.');
    }
};

// ==========================================
// EXPORT TO CALENDAR
// ==========================================

window.exportBookingToCalendar = function (bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const icsContent = generateICS(booking);
    downloadICS(icsContent, `booking-${bookingId}.ics`);
};

function generateICS(booking) {
    const { full_name, email, date, time, category } = booking;

    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');

    const startDate = new Date(year, month - 1, day, hours, minutes);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const formatICSDate = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    };

    const categoryText = category === 'applicant' ? 'Абитуриент' : 'Родитель';

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Consultation Booking//RU',
        'BEGIN:VEVENT',
        `UID:booking-${booking.id}@consultation.local`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:Консультация - ${full_name}`,
        `DESCRIPTION:${categoryText}\\nEmail: ${email}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

function downloadICS(content, filename) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// SEARCH/FILTER
// ==========================================

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        if (!searchTerm) {
            renderBookings(allBookings);
            return;
        }

        const filtered = allBookings.filter(booking => {
            return booking.full_name.toLowerCase().includes(searchTerm) ||
                booking.email.toLowerCase().includes(searchTerm) ||
                booking.phone.includes(searchTerm);
        });

        renderBookings(filtered);
    });
}

// ==========================================
// EXPORT ALL
// ==========================================

const exportAllBtn = document.getElementById('exportAllBtn');
if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
        if (allBookings.length === 0) {
            alert('Нет записей для экспорта');
            return;
        }

        // Export all as single ICS file
        const events = allBookings.map(b => {
            const { full_name, email, date, time, category } = b;
            const [year, month, day] = date.split('-');
            const [hours, minutes] = time.split(':');
            const startDate = new Date(year, month - 1, day, hours, minutes);
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);

            const formatICSDate = (d) => {
                const pad = (n) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
            };

            const categoryText = category === 'applicant' ? 'Абитуриент' : 'Родитель';

            return [
                'BEGIN:VEVENT',
                `UID:booking-${b.id}@consultation.local`,
                `DTSTAMP:${formatICSDate(new Date())}`,
                `DTSTART:${formatICSDate(startDate)}`,
                `DTEND:${formatICSDate(endDate)}`,
                `SUMMARY:Консультация - ${full_name}`,
                `DESCRIPTION:${categoryText}\\nEmail: ${email}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            ].join('\r\n');
        }).join('\r\n');

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID: -//Consultation Booking//RU',
            events,
            'END:VCALENDAR'
        ].join('\r\n');

        downloadICS(icsContent, 'all-bookings.ics');
    });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// AUTO-REFRESH (Polling)
// ==========================================

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(() => {
        loadBookings();
    }, REFRESH_INTERVAL);

    console.log(`✅ Auto-refresh enabled (every ${REFRESH_INTERVAL / 1000}s)`);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// Stop refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        loadBookings(); // Immediate refresh when back
    }
});

// ==========================================
// INITIALIZATION
// ==========================================

// Load bookings on page load
document.addEventListener('DOMContentLoaded', () => {
    loadBookings();
    startAutoRefresh();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});

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

    // Load and display bookings
    function loadBookings() {
        allBookings = getBookings();
        updateStats();
        renderBookings(allBookings);
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

        tableBody.innerHTML = sortedBookings.map((booking, index) => {
            const { date, time, data } = booking;
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
                <tr data-index="${sortedBookings.indexOf(booking)}">
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
                            <button class="icon-btn export-single-btn" onclick="exportSingle(${allBookings.indexOf(booking)})" title="Экспорт в календарь">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M7 10L12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button class="icon-btn delete-btn" onclick="deleteBooking(${allBookings.indexOf(booking)})" title="Удалить запись">
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
    window.exportSingle = function (index) {
        const booking = allBookings[index];
        const icsContent = generateICS(booking.data);
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
                const icsContent = generateICS(booking.data);
                downloadICSFile(icsContent, `consultation-${booking.date}-${booking.time.replace(':', '')}-${index + 1}.ics`);
            }, index * 100); // Stagger downloads to avoid browser blocking
        });

        // Show success message
        setTimeout(() => {
            alert(`Экспортировано ${allBookings.length} ${getBookingsWord(allBookings.length)}!`);
        }, allBookings.length * 100 + 200);
    }

    // Delete single booking
    window.deleteBooking = function (index) {
        const booking = allBookings[index];
        const [year, month, day] = booking.date.split('-');
        const formattedDate = `${day}.${month}.${year}`;

        showConfirmModal(
            'Удаление записи',
            `Удалить запись на ${formattedDate} в ${booking.time} для ${booking.data.fullName}?`,
            function () {
                const bookingsData = getBookings();
                bookingsData.splice(index, 1);
                localStorage.setItem('consultationBookings', JSON.stringify(bookingsData));
                loadBookings();
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
            function () {
                localStorage.removeItem('consultationBookings');
                loadBookings();
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

    // Initialize
    loadBookings();

    // Auto-refresh every 30 seconds
    setInterval(loadBookings, 30000);
});

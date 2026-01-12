// ==========================================
// API CLIENT (replaces Firebase)
// ==========================================
// bookingAPI and authAPI are loaded globally from api-client.js


// ==========================================
// BOOKING MANAGEMENT SYSTEM
// ==========================================

// Initialize bookings storage (keep for backwards compatibility and offline drafts)
const BOOKINGS_KEY = 'consultationBookings';

// Get bookings from localStorage (legacy - for migration only)
function getBookingsFromLocalStorage() {
    const bookings = localStorage.getItem(BOOKINGS_KEY);
    return bookings ? JSON.parse(bookings) : [];
}

// Save booking via REST API
async function saveBooking(date, time, formData) {
    try {
        const result = await bookingAPI.createBooking({
            date,
            time,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            category: formData.category,
            messenger: formData.messenger,
            messengerHandle: formData.messengerHandle || '',
            questions: formData.questions || ''
        });

        console.log('✅ Booking saved via API:', result.booking.id);
        return result.booking.id;

    } catch (error) {
        console.error('❌ Error saving booking:', error);
        throw new Error('Не удалось сохранить запись. Попробуйте ещё раз.');
    }
}

// Check if time slot is occupied (via API)
async function isTimeSlotOccupied(date, time) {
    try {
        const occupiedTimes = await bookingAPI.getOccupiedTimes(date);
        return occupiedTimes.includes(time);
    } catch (error) {
        console.error('❌ Error checking time slot:', error);
        return false; // Allow booking on error
    }
}

// Get occupied times for a specific date (via API)
async function getOccupiedTimesForDate(date) {
    try {
        return await bookingAPI.getOccupiedTimes(date);
    } catch (error) {
        console.error('❌ Error getting occupied times:', error);
        return []; // Return empty array on error
    }
}



// ==========================================
// CALENDAR EXPORT FUNCTIONALITY
// ==========================================

function generateICS(bookingData) {
    const { date, time, fullName, email, category } = bookingData;

    // Parse date and time
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');

    // Create start datetime (consultation time)
    const startDate = new Date(year, month - 1, day, hours, minutes);

    // Create end datetime (1 hour consultation)
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    // Format dates for ICS (YYYYMMDDTHHMMSS)
    function formatICSDate(date) {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    }

    const dtstart = formatICSDate(startDate);
    const dtend = formatICSDate(endDate);
    const dtstamp = formatICSDate(new Date());

    // Generate unique ID
    const uid = `booking-${Date.now()}@consultation.local`;

    // Determine category text
    const categoryText = category === 'applicant' ? 'Абитуриент' : 'Родитель';

    // Build ICS content
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Consultation Booking//RU',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        'SUMMARY:Консультация в приёмной комиссии',
        `DESCRIPTION:Индивидуальная консультация\\n\\nКатегория: ${categoryText}\\nИмя: ${fullName}\\nEmail: ${email}`,
        'LOCATION:Приёмная комиссия',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:DISPLAY',
        'DESCRIPTION:Напоминание о консультации через 1 час',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
}

function downloadICS(bookingData) {
    const icsContent = generateICS(bookingData);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `consultation-${bookingData.date}-${bookingData.time.replace(':', '')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==========================================
// FORM HANDLING & VALIDATION
// ==========================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('bookingForm');
    const modal = document.getElementById('successModal');
    const closeModalBtn = document.getElementById('closeModal');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const phoneInput = document.getElementById('phone');

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    // Store original time options
    const originalTimeOptions = Array.from(timeSelect.querySelectorAll('option')).map(option => ({
        value: option.value,
        text: option.value
    }));

    // Update available time slots when date changes
    dateInput.addEventListener('change', async function () {
        await updateAvailableTimeSlots();
    });

    async function updateAvailableTimeSlots() {
        const selectedDate = dateInput.value;
        if (!selectedDate) {
            // Reset to all options if no date selected
            resetTimeOptions();
            return;
        }

        const occupiedTimes = await getOccupiedTimesForDate(selectedDate);
        const currentValue = timeSelect.value;

        // Clear all options except placeholder
        timeSelect.innerHTML = '<option value="">Выберите время</option>';

        // Add only available time slots
        originalTimeOptions.forEach(option => {
            if (option.value !== '' && !occupiedTimes.includes(option.value)) {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                timeSelect.appendChild(optionElement);
            }
        });

        // If current selected time is occupied, reset selection
        if (currentValue && occupiedTimes.includes(currentValue)) {
            timeSelect.value = '';
        } else if (currentValue) {
            timeSelect.value = currentValue;
        }
    }

    function resetTimeOptions() {
        timeSelect.innerHTML = '<option value="">Выберите время</option>';
        originalTimeOptions.forEach(option => {
            if (option.value !== '') {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                timeSelect.appendChild(optionElement);
            }
        });
    }

    // Messenger selection handling
    const messengerRadios = document.querySelectorAll('input[name="messenger"]');
    const messengerHandleGroup = document.getElementById('messengerHandleGroup');
    const messengerHandleLabel = document.getElementById('messengerHandleLabel');
    const messengerHandleInput = document.getElementById('messengerHandle');

    const messengerLabels = {
        telegram: 'Ваш Telegram (например: @username)',
        whatsapp: 'Ваш номер WhatsApp',
        viber: 'Ваш номер Viber',
        none: 'Ваш никнейм в мессенджере'
    };

    messengerRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'none') {
                messengerHandleGroup.style.display = 'none';
                messengerHandleInput.removeAttribute('required');
                messengerHandleInput.value = '';
                // Remove asterisk from label
                messengerHandleLabel.innerHTML = messengerLabels[this.value];
            } else {
                messengerHandleGroup.style.display = 'block';
                messengerHandleLabel.innerHTML = messengerLabels[this.value] + ' <span style="color: hsl(0, 70%, 60%);">*</span>';
                messengerHandleInput.setAttribute('required', 'required');

                // Update placeholder
                if (this.value === 'telegram') {
                    messengerHandleInput.placeholder = '@username';
                } else {
                    messengerHandleInput.placeholder = '+7 (___) ___-__-__';
                }
            }
        });
    });

    // Phone number formatting
    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.startsWith('8')) {
            value = '7' + value.substring(1);
        }

        if (value.startsWith('7') && value.length <= 11) {
            let formatted = '+7';
            if (value.length > 1) {
                formatted += ' (' + value.substring(1, 4);
            }
            if (value.length >= 5) {
                formatted += ') ' + value.substring(4, 7);
            }
            if (value.length >= 8) {
                formatted += '-' + value.substring(7, 9);
            }
            if (value.length >= 10) {
                formatted += '-' + value.substring(9, 11);
            }
            e.target.value = formatted;
        } else if (!value.startsWith('7')) {
            e.target.value = '+7 ';
        }
    });

    // Form submission (async for Firebase)
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const selectedDate = dateInput.value;
        const selectedTime = timeSelect.value;

        // Disable submit button during save
        const submitButton = document.getElementById('submitButton');
        const originalButtonText = submitButton.querySelector('.button-text').textContent;
        submitButton.disabled = true;
        submitButton.querySelector('.button-text').textContent = 'Сохранение...';

        try {
            // Bot protection: Check honeypot field
            const honeypot = document.getElementById('website');
            if (honeypot && honeypot.value !== '') {
                console.warn('🤖 Bot detected - honeypot field filled');
                submitButton.disabled = false;
                submitButton.querySelector('.button-text').textContent = originalButtonText;
                return; // Silently reject (don't show error to bot)
            }

            // Check if time slot is occupied (async)
            const isOccupied = await isTimeSlotOccupied(selectedDate, selectedTime);
            if (isOccupied) {
                showErrorModal('Это время уже занято!', 'Пожалуйста, выберите другое время для консультации.');
                submitButton.disabled = false;
                submitButton.querySelector('.button-text').textContent = originalButtonText;
                return;
            }

            // Collect form data
            const formData = {
                date: selectedDate,
                time: selectedTime,
                category: document.querySelector('input[name="category"]:checked').value,
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                messenger: document.querySelector('input[name="messenger"]:checked').value,
                messengerHandle: document.getElementById('messengerHandle').value || '',
                questions: document.getElementById('questions').value
            };

            // Save booking to Firebase
            const bookingId = await saveBooking(selectedDate, selectedTime, formData);

            console.log('✅ Booking submitted successfully:', bookingId);

            // Show success modal with booking data
            showModal(formData);

            // Reset form
            form.reset();

            // Update available slots after booking
            await updateAvailableTimeSlots();

        } catch (error) {
            console.error('Error submitting booking:', error);
            showErrorModal('Ошибка сохранения', error.message || 'Не удалось сохранить запись. Попробуйте ещё раз.');
        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.querySelector('.button-text').textContent = originalButtonText;
        }
    });

    // Modal functions
    function showModal(bookingData) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Store booking data for calendar export
        modal.dataset.bookingData = JSON.stringify(bookingData);

        // Add calendar button if not already present
        if (!document.getElementById('addToCalendarBtn')) {
            const calendarBtn = document.createElement('button');
            calendarBtn.id = 'addToCalendarBtn';
            calendarBtn.className = 'modal-button calendar-button';
            calendarBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; margin-right: 8px;">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Добавить в календарь
            `;
            calendarBtn.addEventListener('click', function () {
                const data = JSON.parse(modal.dataset.bookingData);
                downloadICS(data);
            });

            const closeBtn = modal.querySelector('.modal-button');
            closeBtn.parentNode.insertBefore(calendarBtn, closeBtn);
        }
    }

    function hideModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showErrorModal(title, message) {
        // Clone the success modal structure but with error styling
        const errorModal = modal.cloneNode(true);
        errorModal.id = 'errorModal';

        // Update content
        const modalIcon = errorModal.querySelector('.modal-icon');
        modalIcon.classList.remove('success-icon');
        modalIcon.classList.add('error-icon');
        modalIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
        `;

        errorModal.querySelector('.modal-title').textContent = title;
        errorModal.querySelector('.modal-message').textContent = message;

        const errorCloseBtn = errorModal.querySelector('.modal-button');
        errorCloseBtn.textContent = 'Понятно';

        // Remove old error modal if exists
        const oldErrorModal = document.getElementById('errorModal');
        if (oldErrorModal) {
            oldErrorModal.remove();
        }

        // Append to body
        document.body.appendChild(errorModal);

        // Show error modal
        setTimeout(() => {
            errorModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }, 10);

        // Close handlers
        errorCloseBtn.addEventListener('click', () => {
            errorModal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => errorModal.remove(), 300);
        });

        errorModal.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                errorModal.classList.remove('active');
                document.body.style.overflow = '';
                setTimeout(() => errorModal.remove(), 300);
            }
        });
    }

    closeModalBtn.addEventListener('click', hideModal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            hideModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            hideModal();
        }
    });

    // Add smooth animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe form sections
    document.querySelectorAll('.form-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // Add input animation effects
    const inputs = document.querySelectorAll('.form-input, .form-textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            this.parentElement.querySelector('.form-label').style.color = 'var(--color-primary-light)';
        });

        input.addEventListener('blur', function () {
            this.parentElement.querySelector('.form-label').style.color = 'var(--color-text-secondary)';
        });
    });

    // Category card animation
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        const radioInput = card.querySelector('input[type="radio"]');

        card.addEventListener('click', function () {
            categoryCards.forEach(c => {
                c.querySelector('.category-content').style.transform = 'scale(1)';
            });

            if (radioInput.checked) {
                this.querySelector('.category-content').style.transform = 'scale(1.02)';
            }
        });
    });

    // Add floating animation to gradient orbs on mouse move
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX / window.innerWidth;
        mouseY = e.clientY / window.innerHeight;

        const orbs = document.querySelectorAll('.gradient-orb');
        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 20;
            const x = mouseX * speed;
            const y = mouseY * speed;

            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
});

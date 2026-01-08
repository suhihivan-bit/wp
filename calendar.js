// ==========================================
// VISUAL CALENDAR COMPONENT
// ==========================================

class VisualCalendar {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            minDate: new Date(),
            maxDate: null,
            getBookedSlots: null,
            onChange: null,
            ...options
        };

        this.currentDate = new Date();
        this.selectedDate = null;

        this.init();
    }

    init() {
        // Hide original input
        this.input.style.display = 'none';

        // Create calendar wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'calendar-wrapper';
        this.input.parentNode.insertBefore(this.wrapper, this.input.nextSibling);

        // Create display input
        this.displayInput = this.createDisplayInput();
        this.wrapper.appendChild(this.displayInput);

        // Create dropdown and append to body to avoid stacking context issues
        this.dropdown = this.createDropdown();
        document.body.appendChild(this.dropdown);

        // Setup event listeners
        this.setupEventListeners();

        // Render calendar
        this.render();
    }

    createDisplayInput() {
        const div = document.createElement('div');
        div.className = 'calendar-input-display';
        div.innerHTML = `
            <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="calendar-date-text placeholder">Выберите дату консультации</span>
        `;
        return div;
    }

    createDropdown() {
        const div = document.createElement('div');
        div.className = 'calendar-dropdown';
        div.innerHTML = `
            <div class="calendar-header">
                <div class="calendar-month-year"></div>
                <div class="calendar-nav">
                    <button type="button" class="calendar-nav-btn prev-month">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 19L8 12L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button type="button" class="calendar-nav-btn next-month">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">Пн</div>
                <div class="calendar-weekday">Вт</div>
                <div class="calendar-weekday">Ср</div>
                <div class="calendar-weekday">Чт</div>
                <div class="calendar-weekday">Пт</div>
                <div class="calendar-weekday">Сб</div>
                <div class="calendar-weekday">Вс</div>
            </div>
            <div class="calendar-days"></div>
            <div class="calendar-legend">
                <div class="calendar-legend-item">
                    <div class="calendar-legend-dot available"></div>
                    <span>Доступно</span>
                </div>
                <div class="calendar-legend-item">
                    <div class="calendar-legend-dot partial"></div>
                    <span>Частично</span>
                </div>
                <div class="calendar-legend-item">
                    <div class="calendar-legend-dot full"></div>
                    <span>Занято</span>
                </div>
            </div>
        `;
        return div;
    }

    setupEventListeners() {
        // Toggle dropdown
        this.displayInput.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Navigation
        this.dropdown.querySelector('.prev-month').addEventListener('click', (e) => {
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });

        this.dropdown.querySelector('.next-month').addEventListener('click', (e) => {
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.close();
            }
        });

        // Close on scroll for better UX (calendar position becomes invalid)
        let scrollTimeout;
        this.scrollHandler = () => {
            if (this.dropdown.classList.contains('active')) {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.close();
                }, 100);
            }
        };
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Update header
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        this.dropdown.querySelector('.calendar-month-year').textContent =
            `${monthNames[month]} ${year}`;

        // Get days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0

        const daysContainer = this.dropdown.querySelector('.calendar-days');
        daysContainer.innerHTML = '';

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0);
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay.getDate() - i;
            this.createDayElement(daysContainer, day, new Date(year, month - 1, day), true);
        }

        // Current month days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            this.createDayElement(daysContainer, day, date, false);
        }

        // Next month days
        const remainingDays = 42 - daysContainer.children.length; // 6 rows x 7 days
        for (let day = 1; day <= remainingDays; day++) {
            this.createDayElement(daysContainer, day, new Date(year, month + 1, day), true);
        }
    }

    createDayElement(container, dayNumber, date, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = dayNumber;

        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }

        // Check if today
        const today = new Date();
        if (this.isSameDay(date, today)) {
            dayElement.classList.add('today');
        }

        // Check if selected
        if (this.selectedDate && this.isSameDay(date, this.selectedDate)) {
            dayElement.classList.add('selected');
        }

        // Check if disabled (past dates)
        if (date < this.options.minDate) {
            dayElement.classList.add('disabled');
        } else {
            // Check booking status
            const bookingStatus = this.getDateBookingStatus(date);
            if (bookingStatus === 'full') {
                dayElement.classList.add('fully-booked');
            } else if (bookingStatus === 'partial') {
                dayElement.classList.add('partially-booked');
            }

            // Add click handler
            dayElement.addEventListener('click', () => {
                if (!dayElement.classList.contains('disabled') &&
                    !dayElement.classList.contains('fully-booked')) {
                    this.selectDate(date);
                }
            });
        }

        container.appendChild(dayElement);
    }

    getDateBookingStatus(date) {
        if (!this.options.getBookedSlots) return 'available';

        const dateStr = this.formatDateForInput(date);
        const bookedSlots = this.options.getBookedSlots(dateStr);

        // Total slots per day (9:00-17:00 = 9 slots)
        const totalSlots = 9;
        const bookedCount = bookedSlots ? bookedSlots.length : 0;

        if (bookedCount >= totalSlots) return 'full';
        if (bookedCount > 0) return 'partial';
        return 'available';
    }

    selectDate(date) {
        this.selectedDate = date;
        const dateStr = this.formatDateForInput(date);

        // Update input
        this.input.value = dateStr;
        this.input.dispatchEvent(new Event('change', { bubbles: true }));

        // Update display
        const displayText = this.dropdown.querySelector('.calendar-date-text');
        if (displayText) {
            const formatted = this.formatDateForDisplay(date);
            displayText.textContent = formatted;
            displayText.classList.remove('placeholder');
        } else {
            const span = this.displayInput.querySelector('.calendar-date-text');
            span.textContent = this.formatDateForDisplay(date);
            span.classList.remove('placeholder');
        }

        // Call onChange callback
        if (this.options.onChange) {
            this.options.onChange(dateStr);
        }

        // Close dropdown
        this.close();
    }

    toggle() {
        if (this.dropdown.classList.contains('active')) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        // Calculate position with viewport awareness
        const rect = this.displayInput.getBoundingClientRect();
        const dropdownHeight = 400; // Approximate calendar height
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Smart positioning: above or below based on available space
        let top;
        if (spaceBelow >= dropdownHeight + 16) {
            // Enough space below
            top = rect.bottom + 8;
        } else if (spaceAbove >= dropdownHeight + 16) {
            // Not enough below, but enough above
            top = rect.top - dropdownHeight - 8;
        } else {
            // Not enough space either way - show below and scroll into view
            top = rect.bottom + 8;
            setTimeout(() => {
                this.dropdown.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
        }

        this.dropdown.style.top = `${top}px`;
        this.dropdown.style.left = `${rect.left}px`;
        this.dropdown.style.width = `${Math.min(rect.width, 360)}px`;

        this.dropdown.classList.add('active');
        this.displayInput.classList.add('active');
    }

    close() {
        this.dropdown.classList.remove('active');
        this.displayInput.classList.remove('active');
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateForDisplay(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
}

// Initialize calendar on DOM load
document.addEventListener('DOMContentLoaded', function () {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        new VisualCalendar(dateInput, {
            minDate: new Date(),
            getBookedSlots: function (dateStr) {
                // Get occupied times for the date from localStorage
                if (typeof getOccupiedTimesForDate === 'function') {
                    return getOccupiedTimesForDate(dateStr);
                }
                return [];
            },
            onChange: function (dateStr) {
                // Trigger the existing date change handler
                setTimeout(() => {
                    if (typeof updateAvailableTimeSlots === 'function') {
                        updateAvailableTimeSlots();
                    }
                }, 100);
            }
        });
    }
});

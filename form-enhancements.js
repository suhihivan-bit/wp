// ==========================================
// FORM ENHANCEMENTS: VALIDATION, AUTOSAVE, PROGRESS
// ==========================================

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// VALIDATION
// ==========================================

const validators = {
    fullName: (value) => {
        if (!value.trim()) return { valid: false, message: 'ФИО обязательно для заполнения' };
        const words = value.trim().split(/\s+/);
        if (words.length < 2) return { valid: false, message: 'Введите полное ФИО (фамилия и имя)' };
        if (!/^[а-яА-ЯёЁa-zA-Z\s-]+$/.test(value)) return { valid: false, message: 'ФИО может содержать только буквы' };
        return { valid: true };
    },

    email: (value) => {
        if (!value.trim()) return { valid: false, message: 'Email обязателен для заполнения' };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return { valid: false, message: 'Введите корректный email адрес' };
        return { valid: true };
    },

    phone: (value) => {
        if (!value.trim()) return { valid: false, message: 'Телефон обязателен для заполнения' };
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length < 11) return { valid: false, message: 'Введите полный номер телефона' };
        return { valid: true };
    },

    messengerHandle: (value, messenger) => {
        if (messenger === 'none') return { valid: true };
        if (!value.trim()) return { valid: false, message: 'Укажите ваш контакт в мессенджере' };
        if (messenger === 'telegram' && !value.startsWith('@')) {
            return { valid: false, message: 'Telegram должен начинаться с @' };
        }
        return { valid: true };
    }
};

function validateField(fieldId, customValidator) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const parentGroup = field.closest('.form-group');
    const validator = customValidator || validators[fieldId];

    if (!validator) return;

    const messenger = document.querySelector('input[name="messenger"]:checked')?.value;
    const result = fieldId === 'messengerHandle' ? validator(field.value, messenger) : validator(field.value);

    // Remove existing validation elements
    let icon = parentGroup.querySelector('.validation-icon');
    let message = parentGroup.querySelector('.validation-message');

    if (!icon) {
        icon = document.createElement('div');
        icon.className = 'validation-icon';
        parentGroup.classList.add('has-validation-icon');
        field.parentNode.appendChild(icon);
    }

    if (!message) {
        message = document.createElement('div');
        message.className = 'validation-message';
        field.parentNode.appendChild(message);
    }

    // Update validation state
    field.classList.remove('error', 'success');
    icon.className = 'validation-icon';
    message.classList.remove('show');

    if (result.valid) {
        field.classList.add('success');
        icon.className = 'validation-icon success';
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (field.value) { // Only show error if field has been touched
        field.classList.add('error');
        icon.className = 'validation-icon error';
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        message.textContent = result.message;
        message.classList.add('show');
    }

    return result.valid;
}

// ==========================================
// PROGRESS TRACKING
// ==========================================

function updateProgress() {
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const categoryInputs = document.querySelectorAll('input[name="category"]');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    let completed = 0;
    let total = 6; // date, time, category, fullName, email, phone

    // Check date & time
    const dateTimeComplete = dateInput.value && timeSelect.value;
    if (dateTimeComplete) completed += 2;

    // Check category
    const categoryComplete = Array.from(categoryInputs).some(input => input.checked);
    if (categoryComplete) completed += 1;

    // Check personal data
    if (fullNameInput.value && validators.fullName(fullNameInput.value).valid) completed += 1;
    if (emailInput.value && validators.email(emailInput.value).valid) completed += 1;
    if (phoneInput.value && validators.phone(phoneInput.value).valid) completed += 1;

    const percentage = Math.round((completed / total) * 100);

    // Update UI
    const progressBar = document.getElementById('progressBarFill');
    const progressPercentage = document.getElementById('progressPercentage');

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;

    // Update checklist items
    const dateTimeItem = document.getElementById('progressDateTime');
    const categoryItem = document.getElementById('progressCategory');
    const personalItem = document.getElementById('progressPersonal');

    if (dateTimeItem) {
        dateTimeItem.classList.toggle('completed', dateTimeComplete);
    }
    if (categoryItem) {
        categoryItem.classList.toggle('completed', categoryComplete);
    }
    if (personalItem) {
        const personalComplete = fullNameInput.value && emailInput.value && phoneInput.value &&
            validators.fullName(fullNameInput.value).valid &&
            validators.email(emailInput.value).valid &&
            validators.phone(phoneInput.value).valid;
        personalItem.classList.toggle('completed', personalComplete);
    }
}

// ==========================================
// AUTOSAVE
// ==========================================

const AUTOSAVE_KEY = 'bookingFormDraft';
let autosaveTimeout;

function saveFormDraft() {
    const form = document.getElementById('bookingForm');
    const formData = {
        date: document.getElementById('date')?.value || '',
        time: document.getElementById('time')?.value || '',
        category: document.querySelector('input[name="category"]:checked')?.value || '',
        fullName: document.getElementById('fullName')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        messenger: document.querySelector('input[name="messenger"]:checked')?.value || 'none',
        messengerHandle: document.getElementById('messengerHandle')?.value || '',
        questions: document.getElementById('questions')?.value || '',
        savedAt: new Date().toISOString()
    };

    // Only save if at least one field is filled
    const hasData = Object.values(formData).some(v => v && v !== 'none');

    if (hasData) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
        showAutosaveIndicator();
    }
}

const debouncedSave = debounce(saveFormDraft, 500);

function loadFormDraft() {
    const savedData = localStorage.getItem(AUTOSAVE_KEY);
    if (!savedData) return false;

    try {
        const formData = JSON.parse(savedData);

        // Restore form values
        if (formData.date) document.getElementById('date').value = formData.date;
        if (formData.time) document.getElementById('time').value = formData.time;
        if (formData.category) {
            const categoryRadio = document.querySelector(`input[name="category"][value="${formData.category}"]`);
            if (categoryRadio) categoryRadio.checked = true;
        }
        if (formData.fullName) document.getElementById('fullName').value = formData.fullName;
        if (formData.email) document.getElementById('email').value = formData.email;
        if (formData.phone) document.getElementById('phone').value = formData.phone;
        if (formData.messenger) {
            const messengerRadio = document.querySelector(`input[name="messenger"][value="${formData.messenger}"]`);
            if (messengerRadio) {
                messengerRadio.checked = true;
                messengerRadio.dispatchEvent(new Event('change'));
            }
        }
        if (formData.messengerHandle) document.getElementById('messengerHandle').value = formData.messengerHandle;
        if (formData.questions) document.getElementById('questions').value = formData.questions;

        // Trigger date change to update available times
        if (formData.date) {
            document.getElementById('date').dispatchEvent(new Event('change'));
        }

        updateProgress();
        return true;
    } catch (e) {
        console.error('Error loading draft:', e);
        return false;
    }
}

function clearFormDraft() {
    localStorage.removeItem(AUTOSAVE_KEY);
    hideAutosaveIndicator();
}

function showAutosaveIndicator() {
    const indicator = document.getElementById('autosaveIndicator');
    if (indicator) {
        indicator.classList.add('show');
        clearTimeout(autosaveTimeout);
        autosaveTimeout = setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }
}

function hideAutosaveIndicator() {
    const indicator = document.getElementById('autosaveIndicator');
    if (indicator) {
        indicator.classList.remove('show');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function () {
    // Load draft on page load
    const hasDraft = loadFormDraft();
    if (hasDraft) {
        showAutosaveIndicator();
    }

    // Setup validation listeners
    const fieldsToValidate = ['fullName', 'email', 'phone', 'messengerHandle'];
    fieldsToValidate.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => validateField(fieldId));
            field.addEventListener('input', () => {
                if (field.classList.contains('error') || field.classList.contains('success')) {
                    validateField(fieldId);
                }
                updateProgress();
                debouncedSave();
            });
        }
    });

    // Setup autosave for all form inputs
    const form = document.getElementById('bookingForm');
    if (form) {
        form.addEventListener('input', () => {
            updateProgress();
            debouncedSave();
        });

        form.addEventListener('change', () => {
            updateProgress();
            debouncedSave();
        });
    }

    // Clear draft button
    const clearDraftBtn = document.getElementById('clearDraftBtn');
    if (clearDraftBtn) {
        clearDraftBtn.addEventListener('click', () => {
            if (confirm('Очистить сохранённый черновик?')) {
                clearFormDraft();
                form.reset();
                updateProgress();
            }
        });
    }

    // Initial progress update
    updateProgress();
});

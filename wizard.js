// Enhanced Booking Wizard Logic
let currentStep = 1;
const totalSteps = 3;

// Initialize wizard on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeWizard();
    updateWizardProgress();
});

function initializeWizard() {
    // Show first step
    showStep(1);

    // Setup navigation buttons
    document.getElementById('btnBack')?.addEventListener('click', () => previousStep());
    document.getElementById('btnNext')?.addEventListener('click', () => nextStep());
    document.getElementById('btnSubmit')?.addEventListener('click', () => submitForm());
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));

    // Show current step
    document.getElementById(`step${step}`)?.classList.add('active');

    // Update wizard UI
    document.querySelectorAll('.wizard-step').forEach((el, index) => {
        el.classList.remove('active', 'completed');
        if (index + 1 === step) el.classList.add('active');
        if (index + 1 < step) el.classList.add('completed');
    });

    // Update buttons
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const btnSubmit = document.getElementById('btnSubmit');

    if (btnBack) btnBack.style.display = step === 1 ? 'none' : 'block';
    if (btnNext) btnNext.style.display = step === totalSteps ? 'none' : 'block';
    if (btnSubmit) btnSubmit.style.display = step === totalSteps ? 'block' : 'none';

    // Update progress bar
    const progress = ((step - 1) / (totalSteps - 1)) * 100;
    document.documentElement.style.setProperty('--wizard-progress', `${progress}%`);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function validateCurrentStep() {
    // Add validation logic here
    return true;
}

function updateWizardProgress() {
    // Real-time form completion tracking
    const form = document.getElementById('bookingForm');
    if (!form) return;

    const inputs = form.querySelectorAll('input[required], select[required]');
    inputs.forEach(input => {
        input.addEventListener('change', updateProgress);
        input.addEventListener('input', updateProgress);
    });
}

function updateProgress() {
    const form = document.getElementById('bookingForm');
    if (!form) return;

    const required = form.querySelectorAll('[required]');
    const filled = Array.from(required).filter(el => el.value.trim() !== '').length;
    const percent = Math.round((filled / required.length) * 100);

    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressPercentage');

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${percent}%`;
}

async function submitForm() {
    showLoading('Отправка заявки...', 'Пожалуйста, подождите');

    try {
        // Your existing submit logic here
        await saveBooking();

        hideLoading();
        showSuccessScreen();
    } catch (error) {
        hideLoading();
        alert('Ошибка при отправке: ' + error.message);
    }
}

function showLoading(text = 'Загрузка...', subtext = '') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (text) overlay.querySelector('.loading-text').textContent = text;
        if (subtext) overlay.querySelector('.loading-subtext').textContent = subtext;
        overlay.classList.add('active');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

function showSuccessScreen() {
    document.querySelector('.wizard-container')?.style.display = 'none';
    document.getElementById('successScreen')?.classList.add('active');
}

// Export for use in other files
window.wizardManager = {
    nextStep,
    previousStep,
    showStep,
    showLoading,
    hideLoading,
    showSuccessScreen
};

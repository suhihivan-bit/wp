// ==========================================
// FIREBASE AUTHENTICATION MODULE
// ==========================================

import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

// ==========================================
// AUTHENTICATION FUNCTIONS
// ==========================================

/**
 * Login admin with email and password
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<Object>} User object
 */
export async function loginAdmin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Admin logged in:', userCredential.user.email);
        return userCredential.user;
    } catch (error) {
        console.error('❌ Login error:', error);
        throw translateAuthError(error);
    }
}

/**
 * Logout current admin
 * @returns {Promise<void>}
 */
export async function logoutAdmin() {
    try {
        await signOut(auth);
        console.log('✅ Admin logged out');
    } catch (error) {
        console.error('❌ Logout error:', error);
        throw error;
    }
}

/**
 * Check authentication state and call callback with user
 * @param {Function} callback - Called with user object or null
 * @returns {Function} Unsubscribe function
 */
export function checkAuthState(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

/**
 * Get current authenticated user
 * @returns {Object|null} Current user or null
 */
export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
    return auth.currentUser !== null;
}

// ==========================================
// ERROR TRANSLATION
// ==========================================

/**
 * Translate Firebase auth errors to Russian
 * @param {Error} error - Firebase error
 * @returns {Error} Error with translated message
 */
function translateAuthError(error) {
    const errorMessages = {
        'auth/wrong-password': 'Неверный пароль',
        'auth/user-not-found': 'Пользователь с таким email не найден',
        'auth/invalid-email': 'Некорректный формат email',
        'auth/user-disabled': 'Этот аккаунт заблокирован',
        'auth/too-many-requests': 'Слишком много попыток входа. Попробуйте позже',
        'auth/network-request-failed': 'Ошибка сети. Проверьте подключение к интернету',
        'auth/invalid-credential': 'Неверные данные для входа',
        'auth/operation-not-allowed': 'Операция не разрешена',
        'auth/weak-password': 'Слишком простой пароль'
    };

    const translatedMessage = errorMessages[error.code] || 'Ошибка входа. Попробуйте снова';

    const translatedError = new Error(translatedMessage);
    translatedError.code = error.code;
    translatedError.originalError = error;

    return translatedError;
}

// ==========================================
// LOGIN PAGE LOGIC
// ==========================================

// Only run if on login page
if (window.location.pathname.includes('login.html')) {
    console.log('🔐 Initializing login page...');

    // Check if already logged in
    checkAuthState((user) => {
        if (user) {
            console.log('✅ Already logged in, redirecting to admin panel...');
            window.location.href = '/admin.html';
        }
    });

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = document.getElementById('loginButton');
    const emailInput = document.getElementById('email') || document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Hide error
            if (errorMessage) {
                errorMessage.classList.remove('active');
                errorMessage.textContent = '';
            }

            // Disable button
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.textContent = 'Вход...';
            }

            try {
                await loginAdmin(email, password);
                // Redirect will happen automatically via onAuthStateChanged
                window.location.href = '/admin.html';
            } catch (error) {
                // Show error
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.classList.add('active');
                }

                // Re-enable button
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.textContent = 'Войти';
                }

                // Clear password
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }
}

console.log('✅ Auth module loaded');

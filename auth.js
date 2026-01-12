// ==========================================
// AUTHENTICATION MODULE (PostgreSQL API)
// ==========================================

// authAPI is loaded globally from api-client.js

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
        const result = await authAPI.login(email, password);
        console.log('✅ Admin logged in:', result.user.email);
        return result.user;
    } catch (error) {
        console.error('❌ Login error:', error);
        throw new Error(error.message || 'Неверный email или пароль');
    }
}

/**
 * Logout current admin
 * @returns {Promise<void>}
 */
export async function logoutAdmin() {
    try {
        await authAPI.logout();
        console.log('✅ Admin logged out');
    } catch (error) {
        console.error('❌ Logout error:', error);
        throw error;
    }
}

/**
 * Check authentication status
 * @returns {Promise<Object>} Auth status object
 */
export async function checkAuthStatus() {
    try {
        return await authAPI.checkAuth();
    } catch (error) {
        console.error('❌ Auth check error:', error);
        return { authenticated: false };
    }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} Current user or null
 */
export async function getCurrentUser() {
    const status = await checkAuthStatus();
    return status.authenticated ? status.user : null;
}

// ==========================================
// LOGIN PAGE LOGIC (if on login.html)
// ==========================================

if (window.location.pathname.includes('login.html')) {
    // Check if already logged in
    checkAuthStatus().then(status => {
        if (status.authenticated) {
            // Already logged in, redirect to admin
            window.location.href = 'admin.html';
        }
    });

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = document.querySelector('.login-button');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Hide previous errors
            if (errorMessage) {
                errorMessage.classList.remove('visible');
            }

            // Disable submit button
            submitButton.disabled = true;
            submitButton.textContent = 'Вход...';

            try {
                await loginAdmin(email, password);

                // Success - redirect to admin panel
                window.location.href = 'admin.html';

            } catch (error) {
                // Show error message
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.classList.add('visible');
                }

                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.textContent = 'Войти';
            }
        });
    }
}

// ==========================================
// ADMIN PAGE AUTH CHECK (if on admin.html)
// ==========================================

if (window.location.pathname.includes('admin.html')) {
    // Check authentication on page load
    checkAuthStatus().then(status => {
        if (!status.authenticated) {
            // Not logged in, redirect to login page
            window.location.href = 'login.html';
        }
    });

    // Handle logout button
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await logoutAdmin();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout failed:', error);
                // Force redirect anyway
                window.location.href = 'login.html';
            }
        });
    }
}

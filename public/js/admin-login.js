// Admin Login JavaScript
document.addEventListener('DOMContentLoaded', function () {
    initializeAdminLogin();
});

function initializeAdminLogin() {
    setupLoginForm();
    setupKeyboardShortcuts();

    // Clear any existing alerts
    hideAlert();

    // Focus on username field
    document.getElementById('username').focus();
}

function setupLoginForm() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', handleLoginSubmit);

    // Add real-time validation
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (event) {
        // Enter key to submit form
        if (event.key === 'Enter' && event.target.tagName.toLowerCase() !== 'button') {
            const form = document.getElementById('loginForm');
            if (validateForm()) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });
}

async function handleLoginSubmit(event) {
    event.preventDefault();

    // Validate form
    if (!validateForm()) {
        showAlert('Please fill in all required fields.', 'error');
        return;
    }

    // Show loading state
    showLoading(true);
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');

    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    loginText.textContent = 'Signing In...';

    try {
        // Collect login data
        const formData = new FormData(event.target);
        const loginData = {
            username: formData.get('username').trim(),
            password: formData.get('password')
        };

        // Submit to server
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Show success message briefly
            showAlert('Login successful! Redirecting...', 'success');

            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = result.redirectUrl || '/admin/dashboard';
            }, 1000);

        } else {
            throw new Error(result.error || 'Invalid credentials');
        }

    } catch (error) {
        console.error('Login error:', error);

        // Show error message
        if (error.message.includes('credentials')) {
            showAlert('Invalid username or password. Please try again.', 'error');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            showAlert('Connection error. Please check your network and try again.', 'error');
        } else {
            showAlert(error.message || 'Login failed. Please try again.', 'error');
        }

        // Clear password field
        document.getElementById('password').value = '';
        document.getElementById('password').focus();

    } finally {
        showLoading(false);
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        loginText.textContent = 'Sign In';
    }
}

function validateForm() {
    const form = document.getElementById('loginForm');
    const requiredFields = form.querySelectorAll('input[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });

    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;

    // Clear previous error
    clearFieldError(field);

    // Required field validation
    if (field.required && !value) {
        showFieldError(fieldName, 'This field is required');
        return false;
    }

    // Username validation
    if (field.name === 'username' && value) {
        if (value.length < 3) {
            showFieldError(fieldName, 'Username must be at least 3 characters');
            return false;
        }
    }

    // Password validation
    if (field.name === 'password' && value) {
        if (value.length < 6) {
            showFieldError(fieldName, 'Password must be at least 6 characters');
            return false;
        }
    }

    return true;
}

function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(`${fieldName}-error`);

    if (field) {
        field.classList.add('error');
    }

    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearFieldError(field) {
    const fieldName = field.name || field.id;
    const errorElement = document.getElementById(`${fieldName}-error`);

    field.classList.remove('error');

    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertClass = `alert-${type}`;

    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;

    alertContainer.style.display = 'block';

    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            hideAlert();
        }, 3000);
    }
}

function hideAlert() {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.style.display = 'none';
    alertContainer.innerHTML = '';
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Handle browser back button
window.addEventListener('popstate', function (event) {
    // If user came from admin dashboard, redirect to home
    if (document.referrer.includes('/admin')) {
        window.location.href = '/';
    }
});

// Security: Clear form on page unload
window.addEventListener('beforeunload', function () {
    const form = document.getElementById('loginForm');
    if (form) {
        form.reset();
    }
});

// Auto-focus management
document.addEventListener('click', function (event) {
    if (event.target.matches('input')) {
        clearFieldError(event.target);
    }
});

// Prevent form submission on Enter in input fields (handled by keydown listener)
document.addEventListener('keypress', function (event) {
    if (event.key === 'Enter' && event.target.tagName.toLowerCase() === 'input') {
        event.preventDefault();
    }
});

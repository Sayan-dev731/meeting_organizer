// User Panel JavaScript
document.addEventListener('DOMContentLoaded', function () {
    initializeUserPanel();
});

function initializeUserPanel() {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('preferredDate').min = today;

    // Add event listeners
    setupFormValidation();
    setupMeetingTypeToggle();
    setupFormSubmission();
}

function setupFormValidation() {
    const form = document.getElementById('meetingForm');
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');

    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
}

function setupMeetingTypeToggle() {
    const radioOptions = document.querySelectorAll('.radio-option');
    const locationGroup = document.getElementById('locationGroup');
    const locationInput = document.getElementById('location');

    radioOptions.forEach(option => {
        option.addEventListener('click', function () {
            // Clear previous selections
            radioOptions.forEach(opt => opt.classList.remove('selected'));

            // Select current option
            this.classList.add('selected');
            const radioInput = this.querySelector('input[type="radio"]');
            radioInput.checked = true;

            // Show/hide location field
            const value = radioInput.value;
            if (value === 'offline' || value === 'hybrid') {
                locationGroup.style.display = 'block';
                locationInput.required = true;
            } else {
                locationGroup.style.display = 'none';
                locationInput.required = false;
                locationInput.value = '';
            }

            clearFieldError(radioInput);
        });
    });
}

function setupFormSubmission() {
    const form = document.getElementById('meetingForm');
    form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(event) {
    event.preventDefault();

    // Validate form
    if (!validateForm()) {
        showAlert('Please fix the errors below before submitting.', 'error');
        return;
    }

    // Show loading state
    showLoading(true);
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        // Collect form data
        const formData = collectFormData();

        // Submit to server
        const response = await fetch('/api/meeting/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Show success modal
            showSuccessModal(formData, result.requestId);

            // Reset form
            document.getElementById('meetingForm').reset();
            resetFormState();

        } else {
            throw new Error(result.error || 'Failed to submit meeting request');
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showAlert(error.message || 'Failed to submit meeting request. Please try again.', 'error');
    } finally {
        showLoading(false);
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

function collectFormData() {
    const form = document.getElementById('meetingForm');
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        data[key] = value.trim();
    }

    // Add timestamp
    data.timestamp = new Date().toISOString();

    return data;
}

function validateForm() {
    const form = document.getElementById('meetingForm');
    const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });

    // Special validation for meeting type radio buttons
    const meetingTypeInputs = form.querySelectorAll('input[name="meetingType"]');
    const meetingTypeSelected = Array.from(meetingTypeInputs).some(input => input.checked);

    if (!meetingTypeSelected) {
        showFieldError('meetingType', 'Please select a meeting type');
        isValid = false;
    }

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

    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(fieldName, 'Please enter a valid email address');
            return false;
        }
    }

    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[\+]?[(]?[\+]?\d{1,4}[)]?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            showFieldError(fieldName, 'Please enter a valid phone number');
            return false;
        }
    }

    // Date validation
    if (field.type === 'date' && value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showFieldError(fieldName, 'Please select a future date');
            return false;
        }
    }

    return true;
}

function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
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

    // Scroll to alert
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            alertContainer.style.display = 'none';
        }, 5000);
    }
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showSuccessModal(formData, requestId) {
    const modal = document.getElementById('successModal');
    const summaryContent = document.getElementById('summaryContent');

    // Generate summary content
    summaryContent.innerHTML = `
        <div class="summary-item">
            <div class="summary-label">Name:</div>
            <div class="summary-value">${formData.userName}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Email:</div>
            <div class="summary-value">${formData.userEmail}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Phone:</div>
            <div class="summary-value">${formData.userPhone}</div>
        </div>
        ${formData.userCompany ? `
        <div class="summary-item">
            <div class="summary-label">Company:</div>
            <div class="summary-value">${formData.userCompany}</div>
        </div>
        ` : ''}
        <div class="summary-item">
            <div class="summary-label">Purpose:</div>
            <div class="summary-value">${formData.meetingPurpose}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Date & Time:</div>
            <div class="summary-value">${formatDate(formData.preferredDate)} at ${formatTime(formData.preferredTime)}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Duration:</div>
            <div class="summary-value">${formData.estimatedDuration} minutes</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Meeting Type:</div>
            <div class="summary-value">${formatMeetingType(formData.meetingType)}</div>
        </div>
        ${formData.location ? `
        <div class="summary-item">
            <div class="summary-label">Location:</div>
            <div class="summary-value">${formData.location}</div>
        </div>
        ` : ''}
        <div class="summary-item">
            <div class="summary-label">Priority:</div>
            <div class="summary-value">${formatPriority(formData.urgency || 'normal')}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Reference ID:</div>
            <div class="summary-value">${requestId}</div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
}

function resetForm() {
    closeSuccessModal();
    const form = document.getElementById('meetingForm');
    form.reset();
    resetFormState();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormState() {
    // Clear all error states
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => el.style.display = 'none');

    const errorFields = document.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));

    // Reset radio button selections
    const radioOptions = document.querySelectorAll('.radio-option');
    radioOptions.forEach(option => option.classList.remove('selected'));

    // Hide location field
    document.getElementById('locationGroup').style.display = 'none';
    document.getElementById('location').required = false;

    // Hide alerts
    document.getElementById('alertContainer').style.display = 'none';

    // Reset date minimum
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('preferredDate').min = today;
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));

    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatMeetingType(type) {
    const types = {
        'online': '🌐 Online Meeting',
        'offline': '🏢 In-Person Meeting',
        'hybrid': '🔄 Hybrid Meeting'
    };
    return types[type] || type;
}

function formatPriority(priority) {
    const priorities = {
        'low': 'Low',
        'normal': 'Normal',
        'high': 'High',
        'urgent': 'Urgent'
    };
    return priorities[priority] || priority;
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function (event) {
    if (document.getElementById('successModal').style.display === 'flex') {
        closeSuccessModal();
    }
});

// Auto-resize textareas
document.addEventListener('input', function (event) {
    if (event.target.tagName.toLowerCase() === 'textarea') {
        event.target.style.height = 'auto';
        event.target.style.height = event.target.scrollHeight + 'px';
    }
});

// Smooth scroll for anchor links
document.addEventListener('click', function (event) {
    if (event.target.matches('a[href^="#"]')) {
        event.preventDefault();
        const target = document.querySelector(event.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});

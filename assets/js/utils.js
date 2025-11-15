// Utility functions for security and DOM manipulation

/**
 * Safely set text content to prevent XSS attacks
 * @param {HTMLElement} element - The DOM element
 * @param {string} text - The text to set
 */
function setTextSafely(element, text) {
    if (element) {
        element.textContent = text;
    }
}

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} html - The HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Create an element with text content safely
 * @param {string} tagName - The HTML tag name
 * @param {string} text - The text content
 * @param {string} className - Optional class name
 * @returns {HTMLElement} The created element
 */
function createElementWithText(tagName, text, className = '') {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) {
        element.className = className;
    }
    return element;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (North American format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    const digits = phone.replace(/\D/g, '');
    return phoneRegex.test(phone) && digits.length >= 10;
}

/**
 * Validate postal code (Canadian format)
 * @param {string} postalCode - Postal code to validate
 * @returns {boolean} True if valid
 */
function isValidPostalCode(postalCode) {
    const canadianPostal = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
    return canadianPostal.test(postalCode);
}

/**
 * Show error message on form field
 * @param {HTMLElement} input - The input element
 * @param {string} message - Error message
 */
function showFieldError(input, message) {
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = createElementWithText('div', message, 'field-error');
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    input.parentElement.appendChild(errorDiv);
    input.classList.add('error');
}

/**
 * Clear error message from form field
 * @param {HTMLElement} input - The input element
 */
function clearFieldError(input) {
    const errorDiv = input.parentElement.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
    input.classList.remove('error');
}

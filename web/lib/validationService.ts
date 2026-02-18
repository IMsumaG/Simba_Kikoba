/**
 * Input Validation Utilities
 * Centralized validation rules for forms across the app
 */

/**
 * Validation result type
 */
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !email.trim()) {
        return { isValid: false, error: 'Email is required' };
    }

    if (email.length > 254) {
        return { isValid: false, error: 'Email is too long' };
    }

    if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true };
}

/**
 * Password validation
 */
export function validatePassword(password: string): ValidationResult {
    if (!password) {
        return { isValid: false, error: 'Password is required' };
    }

    if (password.length < 6) {
        return { isValid: false, error: 'Password must be at least 6 characters' };
    }

    if (password.length > 128) {
        return { isValid: false, error: 'Password is too long' };
    }

    return { isValid: true };
}

/**
 * Name validation
 */
export function validateName(name: string): ValidationResult {
    if (!name || !name.trim()) {
        return { isValid: false, error: 'Name is required' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters' };
    }

    if (trimmedName.length > 100) {
        return { isValid: false, error: 'Name is too long' };
    }

    if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
        return { isValid: false, error: 'Name contains invalid characters' };
    }

    return { isValid: true };
}

/**
 * Password confirmation validation
 */
export function validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
    if (password !== confirmPassword) {
        return { isValid: false, error: 'Passwords do not match' };
    }

    return { isValid: true };
}

/**
 * Group code validation (basic format check)
 */
export function validateGroupCodeFormat(code: string): ValidationResult {
    if (!code || !code.trim()) {
        return { isValid: false, error: 'Group code is required' };
    }

    const trimmedCode = code.trim().toUpperCase();

    if (trimmedCode.length < 3) {
        return { isValid: false, error: 'Group code must be at least 3 characters' };
    }

    if (trimmedCode.length > 20) {
        return { isValid: false, error: 'Group code is too long' };
    }

    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
        return { isValid: false, error: 'Group code must contain only letters and numbers' };
    }

    return { isValid: true };
}

/**
 * Phone number validation
 */
export function validatePhoneNumber(phone: string): ValidationResult {
    if (!phone || !phone.trim()) {
        return { isValid: false, error: 'Phone number is required' };
    }

    const trimmedPhone = phone.trim();
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');

    if (!/^\d{7,15}$/.test(cleanPhone)) {
        return { isValid: false, error: 'Please enter a valid phone number' };
    }

    return { isValid: true };
}

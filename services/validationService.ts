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
 * RFC 5322 simplified pattern
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
 * Minimum 6 characters (Firebase default)
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
    
    // Check for only letters, spaces, and hyphens
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
 * Actual validation against database happens in groupCodeService
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
    
    // Only alphanumeric characters
    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
        return { isValid: false, error: 'Group code must contain only letters and numbers' };
    }
    
    return { isValid: true };
}

/**
 * Amount validation for transactions
 */
export function validateAmount(amount: string | number): ValidationResult {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
        return { isValid: false, error: 'Please enter a valid amount' };
    }
    
    if (numAmount <= 0) {
        return { isValid: false, error: 'Amount must be greater than 0' };
    }
    
    if (numAmount > 999999999) {
        return { isValid: false, error: 'Amount is too large' };
    }
    
    // Check decimal places (max 2 for currency)
    if (!/^\d+(\.\d{1,2})?$/.test(numAmount.toString())) {
        return { isValid: false, error: 'Amount can have maximum 2 decimal places' };
    }
    
    return { isValid: true };
}

/**
 * Phone number validation (basic)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
    if (!phone || !phone.trim()) {
        return { isValid: false, error: 'Phone number is required' };
    }
    
    const trimmedPhone = phone.trim();
    
    // Remove common separators
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
    
    if (!/^\d{7,15}$/.test(cleanPhone)) {
        return { isValid: false, error: 'Please enter a valid phone number' };
    }
    
    return { isValid: true };
}

/**
 * Validate all fields in an object
 * Useful for form submission
 */
export function validateForm(fields: Record<string, { value: string; validator: (v: string) => ValidationResult }>): {
    isValid: boolean;
    errors: Record<string, string>;
} {
    const errors: Record<string, string> = {};
    
    for (const [fieldName, fieldData] of Object.entries(fields)) {
        const result = fieldData.validator(fieldData.value);
        if (!result.isValid) {
            errors[fieldName] = result.error || 'Invalid input';
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

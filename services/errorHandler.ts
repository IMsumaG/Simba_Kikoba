/**
 * Error Handler Service
 * Provides consistent error handling and logging across the app
 */

/**
 * Custom Error class for app-specific errors
 */
export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public details?: unknown,
        public userMessage?: string
    ) {
        super(message);
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Error codes enum
 */
export enum ErrorCode {
    // Auth Errors
    AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
    AUTH_WRONG_PASSWORD = 'AUTH_WRONG_PASSWORD',
    AUTH_EMAIL_IN_USE = 'AUTH_EMAIL_IN_USE',
    AUTH_WEAK_PASSWORD = 'AUTH_WEAK_PASSWORD',
    AUTH_INVALID_EMAIL = 'AUTH_INVALID_EMAIL',
    AUTH_NETWORK_ERROR = 'AUTH_NETWORK_ERROR',
    AUTH_TOO_MANY_REQUESTS = 'AUTH_TOO_MANY_REQUESTS',

    // Validation Errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',

    // Database Errors
    DB_OPERATION_FAILED = 'DB_OPERATION_FAILED',
    DB_NOT_FOUND = 'DB_NOT_FOUND',
    DB_PERMISSION_DENIED = 'DB_PERMISSION_DENIED',

    // Network Errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',

    // Unknown Errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error Handler Service
 */
export const errorHandler = {
    /**
     * Handle any error and return user-friendly message
     */
    handle(error: unknown): { code: string; message: string; userMessage: string } {
        console.error('Error caught:', error);

        // Handle AppError
        if (error instanceof AppError) {
            return {
                code: error.code,
                message: error.message,
                userMessage: error.userMessage || error.message,
            };
        }

        // Handle Firebase Auth Errors
        if (error instanceof Error && 'code' in error) {
            const err = error as any;

            switch (err.code) {
                case 'auth/user-not-found':
                    return {
                        code: ErrorCode.AUTH_USER_NOT_FOUND,
                        message: 'User not found',
                        userMessage: 'No account found with this email. Please sign up.',
                    };

                case 'auth/wrong-password':
                    return {
                        code: ErrorCode.AUTH_WRONG_PASSWORD,
                        message: 'Wrong password',
                        userMessage: 'Incorrect password. Please try again.',
                    };

                case 'auth/email-already-in-use':
                    return {
                        code: ErrorCode.AUTH_EMAIL_IN_USE,
                        message: 'Email already in use',
                        userMessage: 'An account with this email already exists.',
                    };

                case 'auth/weak-password':
                    return {
                        code: ErrorCode.AUTH_WEAK_PASSWORD,
                        message: 'Password too weak',
                        userMessage: 'Password must be at least 6 characters.',
                    };

                case 'auth/invalid-email':
                    return {
                        code: ErrorCode.AUTH_INVALID_EMAIL,
                        message: 'Invalid email',
                        userMessage: 'Please enter a valid email address.',
                    };

                case 'auth/too-many-requests':
                    return {
                        code: ErrorCode.AUTH_TOO_MANY_REQUESTS,
                        message: 'Too many login attempts',
                        userMessage: 'Too many failed attempts. Please try again later.',
                    };

                case 'auth/network-request-failed':
                    return {
                        code: ErrorCode.AUTH_NETWORK_ERROR,
                        message: 'Network error',
                        userMessage: 'Network connection failed. Please check your internet.',
                    };

                case 'permission-denied':
                    return {
                        code: ErrorCode.DB_PERMISSION_DENIED,
                        message: 'Permission denied',
                        userMessage: 'You do not have permission to perform this action.',
                    };

                case 'not-found':
                    return {
                        code: ErrorCode.DB_NOT_FOUND,
                        message: 'Not found',
                        userMessage: 'The requested item was not found.',
                    };

                default:
                    return {
                        code: ErrorCode.UNKNOWN_ERROR,
                        message: err.message || 'An error occurred',
                        userMessage: 'Something went wrong. Please try again.',
                    };
            }
        }

        // Handle Network Errors
        if (error instanceof TypeError && error.message.includes('network')) {
            return {
                code: ErrorCode.NETWORK_ERROR,
                message: 'Network error',
                userMessage: 'Please check your internet connection.',
            };
        }

        // Handle Timeout
        if (error instanceof Error && error.message.includes('timeout')) {
            return {
                code: ErrorCode.TIMEOUT_ERROR,
                message: 'Request timeout',
                userMessage: 'The request took too long. Please try again.',
            };
        }

        // Generic error
        if (error instanceof Error) {
            return {
                code: ErrorCode.UNKNOWN_ERROR,
                message: error.message,
                userMessage: 'Something went wrong. Please try again.',
            };
        }

        // Unknown error type
        return {
            code: ErrorCode.UNKNOWN_ERROR,
            message: 'An unknown error occurred',
            userMessage: 'Something went wrong. Please try again.',
        };
    },

    /**
     * Log error for debugging/monitoring
     */
    log(error: unknown, context?: string): void {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` [${context}]` : '';

        if (error instanceof Error) {
            console.error(`[${timestamp}]${contextStr} Error:`, {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        } else {
            console.error(`[${timestamp}]${contextStr} Error:`, error);
        }

        // In production, you might send this to a logging service
        // Example: Sentry, LogRocket, etc.
    },

    /**
     * Create an AppError
     */
    create(
        code: ErrorCode,
        message: string,
        userMessage?: string,
        details?: unknown
    ): AppError {
        return new AppError(code, message, details, userMessage);
    },
};

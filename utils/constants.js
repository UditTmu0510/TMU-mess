/**
 * Application-wide constants for TMU Mess Management System
 */

// Meal types as defined in the database schema
const MEAL_TYPES = [
    'breakfast',
    'lunch', 
    'snacks',
    'dinner'
];

// User types as defined in the database schema
const USER_TYPES = [
    'student',
    'employee', 
    'mess_staff',
    'hod'
];

// Booking types for one-time bookings
const BOOKING_TYPES = [
    'employee',
    'guest'
];

// Subscription types
const SUBSCRIPTION_TYPES = [
    'hostel_student',
    'employee_monthly'
];

// Fine types as defined in the database schema
const FINE_TYPES = [
    'no_show',
    'late_cancellation',
    'multiple_offense',
    'subscription_violation'
];

// Payment statuses for bookings and fines
const PAYMENT_STATUS = [
    'pending',
    'paid',
    'failed',
    'refunded',
    'cancelled'
];

// Subscription statuses
const SUBSCRIPTION_STATUS = [
    'active',
    'expired', 
    'suspended'
];

// Employment statuses for employees
const EMPLOYMENT_STATUS = [
    'Active',
    'Inactive',
    'Suspended',
    'Terminated'
];

// Employee types
const EMPLOYEE_TYPES = [
    'TEACH',
    'NON-TEACH',
    'FOURTH',
    'ADMIN'
];

// Gender options
const GENDER_OPTIONS = [
    'Male',
    'Female',
    'Other'
];

// Marital status options
const MARITAL_STATUS = [
    'Single',
    'Married',
    'Divorced',
    'Widowed'
];

// Fine multipliers for different scenarios
const FINE_MULTIPLIERS = {
    NO_SHOW: 1.5,           // 150% of meal cost
    LATE_CANCELLATION: 0.5, // 50% of meal cost
    GUEST_RATE: 1.5,        // 150% of regular rate
    PARENT_RATE: 1.2,       // 120% of regular rate
    MULTIPLE_OFFENSE_BASE: 100, // Base amount for multiple offenses
    EMPLOYEE_RATE: 1.2      // 120% of student rates for employees
};

// Default meal costs (in INR)
const DEFAULT_MEAL_COSTS = {
    breakfast: 25.00,
    lunch: 50.00,
    snacks: 20.00,
    dinner: 60.00
};

// Default subscription costs per month (in INR)
const DEFAULT_SUBSCRIPTION_COSTS = {
    hostel_student: {
        breakfast: 750,  // 25 * 30 days
        lunch: 1500,     // 50 * 30 days
        snacks: 600,     // 20 * 30 days
        dinner: 1800     // 60 * 30 days
    },
    employee_monthly: {
        breakfast: 900,   // 30 * 30 days
        lunch: 1800,      // 60 * 30 days
        snacks: 750,      // 25 * 30 days
        dinner: 2100      // 70 * 30 days
    }
};

// Default meal timings
const DEFAULT_MEAL_TIMINGS = {
    breakfast: {
        start_time: '07:00:00',
        end_time: '09:00:00',
        confirmation_deadline_hours: 12,
        confirmation_deadline_description: 'Confirm by 7 PM previous day'
    },
    lunch: {
        start_time: '12:00:00',
        end_time: '14:00:00',
        confirmation_deadline_hours: 2,
        confirmation_deadline_description: 'Confirm by 10 AM same day'
    },
    snacks: {
        start_time: '16:00:00',
        end_time: '17:30:00',
        confirmation_deadline_hours: 1,
        confirmation_deadline_description: 'Confirm by 3 PM same day'
    },
    dinner: {
        start_time: '19:00:00',
        end_time: '21:00:00',
        confirmation_deadline_hours: 4,
        confirmation_deadline_description: 'Confirm by 3 PM same day'
    }
};

// Validation limits
const VALIDATION_LIMITS = {
    PASSWORD_MIN_LENGTH: 6,
    PASSWORD_MAX_LENGTH: 100,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    TMU_CODE_MIN_LENGTH: 3,
    TMU_CODE_MAX_LENGTH: 20,
    PHONE_MIN_LENGTH: 10,
    PHONE_MAX_LENGTH: 15,
    EMAIL_MAX_LENGTH: 100,
    SEARCH_TERM_MIN_LENGTH: 2,
    MAX_PARENTS_PER_BOOKING: 5,
    MAX_OFFENSE_COUNT_BEFORE_SUSPENSION: 5,
    MAX_EXPORT_RECORDS: 10000,
    MAX_BULK_OPERATIONS: 1000,
    MAX_CONFIRMATION_DAYS_AHEAD: 7,
    MAX_SUBSCRIPTION_MONTHS: 12
};

// Pagination defaults
const PAGINATION_DEFAULTS = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_ADMIN_LIMIT: 50,
    MAX_ADMIN_LIMIT: 200
};

// Date format patterns
const DATE_FORMATS = {
    ISO_DATE: 'YYYY-MM-DD',
    ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    DISPLAY_DATE: 'DD/MM/YYYY',
    DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm',
    TIME_ONLY: 'HH:mm:ss',
    MONTH_YEAR: 'YYYY-MM',
    FILENAME_TIMESTAMP: 'YYYY-MM-DD-HH-mm-ss'
};

// Error messages
const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_FAILED: 'Validation failed',
    DUPLICATE_ENTRY: 'Duplicate entry',
    INVALID_INPUT: 'Invalid input provided',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    INVALID_DATE: 'Invalid date provided',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PHONE: 'Invalid phone number format',
    INVALID_PASSWORD: 'Password does not meet requirements',
    ACCOUNT_DEACTIVATED: 'Account has been deactivated',
    CONFIRMATION_DEADLINE_PASSED: 'Confirmation deadline has passed',
    MEAL_ALREADY_CONFIRMED: 'Meal already confirmed',
    MEAL_ALREADY_ATTENDED: 'Meal already attended',
    CANNOT_CANCEL_PAST_MEAL: 'Cannot cancel past meal',
    SUBSCRIPTION_EXISTS: 'Active subscription already exists',
    FINE_ALREADY_PAID: 'Fine has already been paid',
    FINE_ALREADY_WAIVED: 'Fine has already been waived',
    BOOKING_NOT_CANCELLABLE: 'Booking cannot be cancelled',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action',
    DATABASE_ERROR: 'Database operation failed',
    EXTERNAL_SERVICE_ERROR: 'External service unavailable'
};

// Success messages
const SUCCESS_MESSAGES = {
    USER_REGISTERED: 'User registered successfully',
    LOGIN_SUCCESSFUL: 'Login successful',
    LOGOUT_SUCCESSFUL: 'Logout successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    MEAL_CONFIRMED: 'Meal confirmed successfully',
    MEAL_CANCELLED: 'Meal confirmation cancelled',
    BOOKING_CREATED: 'Booking created successfully',
    BOOKING_CANCELLED: 'Booking cancelled successfully',
    SUBSCRIPTION_CREATED: 'Subscription created successfully',
    SUBSCRIPTION_RENEWED: 'Subscription renewed successfully',
    PAYMENT_SUCCESSFUL: 'Payment processed successfully',
    ATTENDANCE_MARKED: 'Attendance marked successfully',
    FINE_WAIVED: 'Fine waived successfully',
    EXPORT_GENERATED: 'Export file generated successfully',
    NOTIFICATION_SENT: 'Notification sent successfully',
    BULK_OPERATION_COMPLETED: 'Bulk operation completed',
    DATA_IMPORTED: 'Data imported successfully'
};

// Notification types
const NOTIFICATION_TYPES = [
    'meal_reminder',
    'payment_due',
    'fine_notice',
    'subscription_expiry',
    'system_maintenance',
    'general_announcement'
];

// Notification priorities
const NOTIFICATION_PRIORITIES = [
    'low',
    'normal',
    'high',
    'urgent'
];

// File types and limits
const FILE_CONSTRAINTS = {
    PROFILE_IMAGE: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
        MAX_DIMENSION: 1024
    },
    IMPORT_FILE: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    },
    EXPORT_FILE: {
        MAX_RECORDS: 50000,
        DEFAULT_FORMAT: 'csv',
        ALLOWED_FORMATS: ['csv', 'xlsx', 'json']
    }
};

// Rate limiting configurations
const RATE_LIMITS = {
    LOGIN_ATTEMPTS: {
        MAX_ATTEMPTS: 5,
        WINDOW_MINUTES: 15,
        BLOCK_DURATION_MINUTES: 30
    },
    API_REQUESTS: {
        WINDOW_MINUTES: 15,
        MAX_REQUESTS_PER_USER: 100,
        MAX_REQUESTS_PER_IP: 200
    },
    PASSWORD_RESET: {
        MAX_ATTEMPTS: 3,
        WINDOW_HOURS: 24
    }
};

// Cache configurations
const CACHE_SETTINGS = {
    MEAL_TIMINGS: {
        TTL_SECONDS: 3600, // 1 hour
        KEY_PREFIX: 'meal_timings'
    },
    USER_PROFILE: {
        TTL_SECONDS: 1800, // 30 minutes
        KEY_PREFIX: 'user_profile'
    },
    DASHBOARD_DATA: {
        TTL_SECONDS: 300, // 5 minutes
        KEY_PREFIX: 'dashboard'
    }
};

// Database collection names
const COLLECTIONS = {
    USERS: 'users',
    STUDENT_DETAILS: 'student_details',
    EMPLOYEE_DETAILS: 'employee_details',
    MEAL_TIMINGS: 'meal_timings',
    MEAL_CONFIRMATIONS: 'meal_confirmations',
    FINES: 'fines',
    MESS_SUBSCRIPTIONS: 'mess_subscriptions',
    ONE_TIME_BOOKINGS: 'one_time_bookings',
    PARENT_BOOKINGS: 'parent_bookings',
    NOTIFICATIONS: 'notifications',
    AUDIT_LOGS: 'audit_logs',
    SYSTEM_CONFIG: 'system_config'
};

// Environment variables keys
const ENV_VARS = {
    NODE_ENV: 'NODE_ENV',
    PORT: 'PORT',
    MONGODB_URI: 'MONGODB_URI',
    JWT_SECRET: 'JWT_SECRET',
    JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',
    JWT_REFRESH_EXPIRES_IN: 'JWT_REFRESH_EXPIRES_IN',
    FRONTEND_URL: 'FRONTEND_URL',
    EMAIL_SERVICE_API_KEY: 'EMAIL_SERVICE_API_KEY',
    SMS_SERVICE_API_KEY: 'SMS_SERVICE_API_KEY',
    PAYMENT_GATEWAY_API_KEY: 'PAYMENT_GATEWAY_API_KEY',
    CLOUDINARY_API_KEY: 'CLOUDINARY_API_KEY',
    CLOUDINARY_API_SECRET: 'CLOUDINARY_API_SECRET',
    CLOUDINARY_CLOUD_NAME: 'CLOUDINARY_CLOUD_NAME'
};

// Regular expressions for validation
const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[+]?[\d\s\-\(\)]{10,15}$/,
    TMU_CODE: /^[A-Z0-9]{3,20}$/,
    PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    TIME_FORMAT: /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
    DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
    ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
    ALPHABETIC: /^[a-zA-Z\s]+$/,
    NUMERIC: /^\d+$/
};

// HTTP status codes commonly used
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// Application configuration defaults
const APP_CONFIG = {
    DEFAULT_TIMEZONE: 'Asia/Kolkata',
    DEFAULT_CURRENCY: 'INR',
    DEFAULT_LANGUAGE: 'en',
    SESSION_TIMEOUT_MINUTES: 60,
    MAX_LOGIN_SESSIONS: 3,
    BACKUP_RETENTION_DAYS: 30,
    LOG_RETENTION_DAYS: 90,
    MAINTENANCE_WINDOW_HOURS: [2, 4], // 2 AM to 4 AM
    WEEKEND_DAYS: [0, 6] // Sunday and Saturday
};

module.exports = {
    MEAL_TYPES,
    USER_TYPES,
    BOOKING_TYPES,
    SUBSCRIPTION_TYPES,
    FINE_TYPES,
    PAYMENT_STATUS,
    SUBSCRIPTION_STATUS,
    EMPLOYMENT_STATUS,
    EMPLOYEE_TYPES,
    GENDER_OPTIONS,
    MARITAL_STATUS,
    FINE_MULTIPLIERS,
    DEFAULT_MEAL_COSTS,
    DEFAULT_SUBSCRIPTION_COSTS,
    DEFAULT_MEAL_TIMINGS,
    VALIDATION_LIMITS,
    PAGINATION_DEFAULTS,
    DATE_FORMATS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    NOTIFICATION_TYPES,
    NOTIFICATION_PRIORITIES,
    FILE_CONSTRAINTS,
    RATE_LIMITS,
    CACHE_SETTINGS,
    COLLECTIONS,
    ENV_VARS,
    REGEX_PATTERNS,
    HTTP_STATUS,
    APP_CONFIG
};

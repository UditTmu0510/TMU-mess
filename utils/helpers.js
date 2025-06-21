const { ObjectId } = require('mongodb');

/**
 * Date and time utility functions
 */

const convertToIST = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    // IST is UTC+5:30
    const offset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + offset);
    return istDate;
};

const getCurrentISTDate = () => {
    return convertToIST(new Date());
};

// Format date to YYYY-MM-DD string
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    return d.toISOString().split('T')[0];
};

// Format datetime to ISO string
const formatDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    return d.toISOString();
};

// Check if a date is in the past
const isDateInPast = (date) => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    inputDate.setHours(0, 0, 0, 0); // Set to start of day
    
    return inputDate < today;
};

// Add days to a date
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Calculate date range for queries
const calculateDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set start to beginning of day
    start.setHours(0, 0, 0, 0);
    
    // Set end to end of day
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
};

// Format date range for display
const formatDateRange = (startDate, endDate) => {
    return {
        start: formatDate(startDate),
        end: formatDate(endDate),
        duration_days: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
    };
};

// Get start and end of current week
const getCurrentWeekRange = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { start: startOfWeek, end: endOfWeek };
};

// Get start and end of current month
const getCurrentMonthRange = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    return { start: startOfMonth, end: endOfMonth };
};

// Calculate month key for offense tracking (YYYY-MM format)
const calculateMonthKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

/**
 * Validation helper functions
 */

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number format
const isValidPhone = (phone) => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
};

// Validate ObjectId
const isValidObjectId = (id) => {
    return ObjectId.isValid(id);
};

// Sanitize string input
const sanitizeString = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
};

// Validate and sanitize user input
const sanitizeUserInput = (data) => {
    if (typeof data === 'string') {
        return sanitizeString(data);
    } else if (Array.isArray(data)) {
        return data.map(item => sanitizeUserInput(item));
    } else if (data && typeof data === 'object') {
        const sanitized = {};
        Object.keys(data).forEach(key => {
            sanitized[key] = sanitizeUserInput(data[key]);
        });
        return sanitized;
    }
    return data;
};

/**
 * Data formatting and transformation helpers
 */

// Format currency amount
const formatCurrency = (amount, currency = 'INR') => {
    if (typeof amount !== 'number') return '0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
};

// Format percentage
const formatPercentage = (value, decimals = 2) => {
    if (typeof value !== 'number') return '0%';
    return `${value.toFixed(decimals)}%`;
};

// Capitalize first letter of each word
const capitalizeWords = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

// Generate random string
const generateRandomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Generate QR code data string
const generateQRData = (userId, mealDate, mealType) => {
    return `${userId}|${formatDate(mealDate)}|${mealType}`;
};

// Parse QR code data string
const parseQRData = (qrData) => {
    try {
        const parts = qrData.split('|');
        if (parts.length !== 3) {
            throw new Error('Invalid QR data format');
        }
        
        const [userId, mealDate, mealType] = parts;
        
        if (!isValidObjectId(userId)) {
            throw new Error('Invalid user ID in QR data');
        }
        
        return {
            userId,
            mealDate: new Date(mealDate),
            mealType
        };
    } catch (error) {
        throw new Error('Failed to parse QR data: ' + error.message);
    }
};

/**
 * Array and object manipulation helpers
 */

// Remove duplicates from array
const removeDuplicates = (array) => {
    return [...new Set(array)];
};

// Group array of objects by a key
const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
};

// Sort array of objects by a key
const sortBy = (array, key, order = 'asc') => {
    return array.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (order === 'desc') {
            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        } else {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
    });
};

// Deep clone object
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
const isEmpty = (obj) => {
    return Object.keys(obj).length === 0;
};

/**
 * Pagination helpers
 */

// Calculate pagination metadata
const calculatePagination = (page, limit, totalCount) => {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const skip = (currentPage - 1) * itemsPerPage;
    
    return {
        page: currentPage,
        limit: itemsPerPage,
        totalCount,
        totalPages,
        skip,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
        prevPage: currentPage > 1 ? currentPage - 1 : null
    };
};

/**
 * Error handling helpers
 */

// Create standardized error response
const createErrorResponse = (message, details = null, statusCode = 500) => {
    return {
        error: message,
        details,
        statusCode,
        timestamp: new Date().toISOString()
    };
};

// Create standardized success response
const createSuccessResponse = (message, data = null) => {
    return {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    };
};

/**
 * Export/CSV helpers
 */

// Convert array of objects to CSV string
const arrayToCSV = (data, headers = null) => {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    
    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = [
        csvHeaders.join(','),
        ...data.map(row => 
            csvHeaders.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                const escapedValue = String(value).replace(/"/g, '""');
                return escapedValue.includes(',') ? `"${escapedValue}"` : escapedValue;
            }).join(',')
        )
    ];
    
    return csvRows.join('\n');
};

// Generate export filename with timestamp
const generateExportFilename = (prefix, extension = 'csv') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${prefix}-${timestamp}.${extension}`;
};

/**
 * Time-based helpers
 */

// Check if current time is within meal time window
const isWithinMealTime = (mealStartTime, mealEndTime) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
    
    const [startHour, startMin] = mealStartTime.split(':').map(num => parseInt(num));
    const [endHour, endMin] = mealEndTime.split(':').map(num => parseInt(num));
    
    const startTimeMinutes = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;
    
    return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes;
};

// Calculate time difference in hours
const getHoursDifference = (startDate, endDate) => {
    const diff = new Date(endDate) - new Date(startDate);
    return diff / (1000 * 60 * 60); // Convert milliseconds to hours
};

// Format time duration (e.g., "2 hours 30 minutes")
const formatDuration = (minutes) => {
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let result = `${hours} hour${hours === 1 ? '' : 's'}`;
    if (remainingMinutes > 0) {
        result += ` ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
    }
    
    return result;
};

/**
 * Statistical helpers
 */

// Calculate attendance rate
const calculateAttendanceRate = (attended, total) => {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100 * 100) / 100; // Round to 2 decimal places
};

// Calculate average
const calculateAverage = (numbers) => {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + (parseFloat(num) || 0), 0);
    return Math.round((sum / numbers.length) * 100) / 100;
};

// Calculate percentage change
const calculatePercentageChange = (oldValue, newValue) => {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
};

/**
 * Security helpers
 */

// Generate secure random token
const generateSecureToken = (length = 32) => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
};

// Hash string using SHA-256
const hashString = (str) => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str).digest('hex');
};

// Mask sensitive data (e.g., email, phone)
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
};

const maskPhone = (phone) => {
    if (!phone || phone.length < 4) return phone;
    return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
};

module.exports = {
    // Date and time helpers
    formatDate,
    formatDateTime,
    isDateInPast,
    addDays,
    calculateDateRange,
    formatDateRange,
    getCurrentWeekRange,
    getCurrentMonthRange,
    calculateMonthKey,
    
    // Validation helpers
    isValidEmail,
    isValidPhone,
    isValidObjectId,
    sanitizeString,
    sanitizeUserInput,
    
    // Data formatting helpers
    formatCurrency,
    formatPercentage,
    capitalizeWords,
    generateRandomString,
    generateQRData,
    parseQRData,
    
    // Array and object helpers
    removeDuplicates,
    groupBy,
    sortBy,
    deepClone,
    isEmpty,
    
    // Pagination helpers
    calculatePagination,
    
    // Error handling helpers
    createErrorResponse,
    createSuccessResponse,
    
    // Export helpers
    arrayToCSV,
    generateExportFilename,
    
    // Time-based helpers
    isWithinMealTime,
    getHoursDifference,
    formatDuration,
    
    // Statistical helpers
    calculateAttendanceRate,
    calculateAverage,
    calculatePercentageChange,
    
    // Security helpers
    generateSecureToken,
    hashString,
    maskEmail,
    maskPhone,
    convertToIST,
    getCurrentISTDate
};

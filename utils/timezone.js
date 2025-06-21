/**
 * Timezone utilities for IST (Indian Standard Time)
 * Handles all timezone conversions for the TMU Mess Management System
 */

// IST is UTC+5:30
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;
const IST_OFFSET_MS = (IST_OFFSET_HOURS * 60 + IST_OFFSET_MINUTES) * 60 * 1000;

/**
 * Get current IST time as Date object
 */
const getCurrentISTTime = () => {
    const utcTime = new Date();
    const istTime = new Date(utcTime.getTime() + IST_OFFSET_MS);
    return istTime;
};

/**
 * Convert UTC date to IST
 */
const convertUTCToIST = (utcDate) => {
    if (!utcDate) return null;
    const date = new Date(utcDate);
    return new Date(date.getTime() + IST_OFFSET_MS);
};

/**
 * Convert IST date to UTC for database storage
 */
const convertISTToUTC = (istDate) => {
    if (!istDate) return null;
    const date = new Date(istDate);
    return new Date(date.getTime() - IST_OFFSET_MS);
};

/**
 * Get IST date string in YYYY-MM-DD format
 */
const getISTDateString = (date = null) => {
    const istDate = date ? convertUTCToIST(date) : getCurrentISTTime();
    return istDate.toISOString().split('T')[0];
};

/**
 * Get IST time string in HH:MM:SS format
 */
const getISTTimeString = (date = null) => {
    const istDate = date ? convertUTCToIST(date) : getCurrentISTTime();
    return istDate.toTimeString().slice(0, 8);
};

/**
 * Get start of day in IST (00:00:00)
 */
const getISTStartOfDay = (date = null) => {
    const istDate = date ? convertUTCToIST(date) : getCurrentISTTime();
    istDate.setHours(0, 0, 0, 0);
    return convertISTToUTC(istDate);
};

/**
 * Get end of day in IST (23:59:59.999)
 */
const getISTEndOfDay = (date = null) => {
    const istDate = date ? convertUTCToIST(date) : getCurrentISTTime();
    istDate.setHours(23, 59, 59, 999);
    return convertISTToUTC(istDate);
};

/**
 * Check if date is in past (IST comparison)
 */
const isDateInPastIST = (dateToCheck) => {
    const currentIST = getCurrentISTTime();
    const checkDateIST = convertUTCToIST(dateToCheck);
    
    currentIST.setHours(0, 0, 0, 0);
    checkDateIST.setHours(0, 0, 0, 0);
    
    return checkDateIST < currentIST;
};

/**
 * Add hours to IST time
 */
const addHoursToISTTime = (istDate, hours) => {
    const date = new Date(istDate);
    date.setHours(date.getHours() + hours);
    return date;
};

/**
 * Get deadline time based on meal timing and hours before
 */
const calculateMealDeadlineIST = (mealDate, mealStartTime, hoursBeforeMeal) => {
    // Parse meal date and time in IST
    const [hours, minutes, seconds] = mealStartTime.split(':').map(Number);
    
    const mealDateTimeIST = new Date(mealDate);
    mealDateTimeIST.setHours(hours, minutes, seconds || 0, 0);
    
    // Subtract deadline hours
    const deadlineIST = new Date(mealDateTimeIST);
    deadlineIST.setHours(deadlineIST.getHours() - hoursBeforeMeal);
    
    return deadlineIST;
};

/**
 * Format IST date for display
 */
const formatISTDate = (date, format = 'full') => {
    const istDate = convertUTCToIST(date);
    
    switch (format) {
        case 'date':
            return istDate.toLocaleDateString('en-IN');
        case 'time':
            return istDate.toLocaleTimeString('en-IN');
        case 'datetime':
            return istDate.toLocaleString('en-IN');
        case 'full':
        default:
            return istDate.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
    }
};

/**
 * Get time difference in minutes between two IST times
 */
const getTimeDifferenceMinutes = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end - start) / (1000 * 60));
};

module.exports = {
    getCurrentISTTime,
    convertUTCToIST,
    convertISTToUTC,
    getISTDateString,
    getISTTimeString,
    getISTStartOfDay,
    getISTEndOfDay,
    isDateInPastIST,
    addHoursToISTTime,
    calculateMealDeadlineIST,
    formatISTDate,
    getTimeDifferenceMinutes,
    IST_OFFSET_MS
};
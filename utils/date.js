const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz');
const { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isPast } = require('date-fns');

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get the current date and time in a specific timezone.
 * @returns {Date} The current date object.
 */
const getCurrentDate = () => {
    return new Date(); // Returns a Date object, which is inherently in UTC.
};

/**
 * Get the current date and time zoned to IST.
 * This is useful for calculations that need to be aware of the current IST date and time.
 * @returns {Date} A Date object representing the current time in IST.
 */
const getCurrentDateInIST = () => {
    return utcToZonedTime(new Date(), IST_TIMEZONE);
};

/**
 * Converts a Date object (assumed to be in UTC) to a zoned time in IST.
 * @param {Date|string} date - The date to convert.
 * @returns {Date} A new Date object representing the same moment in time, but in the IST timezone.
 */
const convertToIST = (date) => {
    if (!date) return null;
    return utcToZonedTime(new Date(date), IST_TIMEZONE);
};

/**
 * Converts a Date object from IST to UTC.
 * This is crucial for storing dates in the database.
 * @param {Date|string} date - The date in IST to convert to UTC.
 * @returns {Date} A new Date object in UTC.
 */
const convertFromIST = (date) => {
    if (!date) return null;
    return zonedTimeToUtc(new Date(date), IST_TIMEZONE);
};

/**
 * Formats a date for display in the IST timezone.
 * @param {Date|string} date - The date to format.
 * @param {string} formatString - The format string (e.g., 'yyyy-MM-dd HH:mm:ss').
 * @returns {string} The formatted date string.
 */
const formatDateInIST = (date, formatString) => {
    if (!date) return null;
    const zonedDate = utcToZonedTime(new Date(date), IST_TIMEZONE);
    return format(zonedDate, formatString, { timeZone: IST_TIMEZONE });
};

/**
 * Parses a date string that is in IST.
 * @param {string} dateString - The date string to parse.
 * @param {string} formatString - The format of the date string.
 * @returns {Date} A Date object in UTC.
 */
const parseDateInIST = (dateString, formatString) => {
    // This requires more complex parsing logic if the format isn't standard.
    // For ISO-like strings, we can assume it's IST and convert.
    // Example: '2023-10-27T10:00:00' is treated as 10 AM in IST.
    const date = new Date(dateString); // This will be parsed in local time, we need to treat it as IST
    return zonedTimeToUtc(date, IST_TIMEZONE);
};

const isPastDateInIST = (date) => {
    const zonedDate = utcToZonedTime(date, IST_TIMEZONE);
    return isPast(zonedDate);
};


// --- Date Range Functions ---

const getStartOfDayInIST = (date) => {
    const zonedDate = utcToZonedTime(date, IST_TIMEZONE);
    return startOfDay(zonedDate);
};

const getEndOfDayInIST = (date) => {
    const zonedDate = utcToZonedTime(date, IST_TIMEZONE);
    return endOfDay(zonedDate);
};

const getStartOfWeekInIST = (date) => {
    const zonedDate = utcToZonedTime(date, IST_TIMEZONE);
    return startOfWeek(zonedDate, { weekStartsOn: 1 }); // Monday
};

const getEndOfWeekInIST = (date) => {
    const zonedDate = utcToZonedTime(date, IST_TIMEZONE);
    return endOfWeek(zonedDate, { weekStartsOn: 1 }); // Monday
};

const getStartOfMonthInIST = (date) => {
    const zonedDate = utcToZonedTime(date, IST_TIMEZONE);
    return startOfMonth(zonedDate);
};

const getEndOfMonthInIST = (date) => {
    const zonedDate = utcToZonedTime(date, IST_TIMEZONE);
    return endOfMonth(zonedDate);
};


module.exports = {
    IST_TIMEZONE,
    getCurrentDate,
    getCurrentDateInIST,
    convertToIST,
    convertFromIST,
    formatDateInIST,
    parseDateInIST,
    addDays,
    getStartOfDayInIST,
    getEndOfDayInIST,
    getStartOfWeekInIST,
    getEndOfWeekInIST,
    getStartOfMonthInIST,
    getEndOfMonthInIST,
    isPastDateInIST,
};

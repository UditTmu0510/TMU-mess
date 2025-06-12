const { ObjectId } = require('mongodb');

const validateObjectId = (id) => {
    return ObjectId.isValid(id);
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
};

const validateTMUCode = (code) => {
    return code && code.length >= 3;
};

const validateMealType = (mealType) => {
    const validMealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'];
    return validMealTypes.includes(mealType);
};

const validateUserType = (userType) => {
    const validUserTypes = ['student', 'employee', 'mess_staff', 'hod'];
    return validUserTypes.includes(userType);
};

const validateDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return input.trim().replace(/[<>]/g, '');
    }
    return input;
};

const validateRegistrationData = (req, res, next) => {
    const { tmu_code, user_type, name, email, phone, password } = req.body;
    const errors = [];

    if (!validateTMUCode(tmu_code)) {
        errors.push('TMU code is required and must be at least 3 characters');
    }

    if (!validateUserType(user_type)) {
        errors.push('Invalid user type');
    }

    if (!name || !name.first || !name.last) {
        errors.push('First name and last name are required');
    }

    if (!validateEmail(email)) {
        errors.push('Valid email address is required');
    }

    if (!validatePhone(phone)) {
        errors.push('Valid phone number is required');
    }

    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation Failed',
            details: errors
        });
    }

    // Sanitize inputs
    req.body.tmu_code = sanitizeInput(tmu_code);
    req.body.name.first = sanitizeInput(name.first);
    req.body.name.last = sanitizeInput(name.last);
    req.body.email = sanitizeInput(email).toLowerCase();
    req.body.phone = sanitizeInput(phone);

    next();
};

const validateMealConfirmation = (req, res, next) => {
    const { meal_date, meal_type } = req.body;
    const errors = [];

    if (!validateDate(meal_date)) {
        errors.push('Valid meal date is required');
    }

    if (!validateMealType(meal_type)) {
        errors.push('Invalid meal type');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation Failed',
            details: errors
        });
    }

    next();
};

const validateBookingData = (req, res, next) => {
    const { meal_date, meal_type, booking_type } = req.body;
    const errors = [];

    if (!validateDate(meal_date)) {
        errors.push('Valid meal date is required');
    }

    if (!validateMealType(meal_type)) {
        errors.push('Invalid meal type');
    }

    if (!['employee', 'guest'].includes(booking_type)) {
        errors.push('Invalid booking type');
    }

    if (booking_type === 'guest') {
        const { guest_details } = req.body;
        if (!guest_details || !guest_details.name || !guest_details.phone) {
            errors.push('Guest name and phone are required for guest bookings');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation Failed',
            details: errors
        });
    }

    next();
};

module.exports = {
    validateObjectId,
    validateEmail,
    validatePhone,
    validateTMUCode,
    validateMealType,
    validateUserType,
    validateDate,
    sanitizeInput,
    validateRegistrationData,
    validateMealConfirmation,
    validateBookingData
};

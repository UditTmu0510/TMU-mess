const { ObjectId } = require('mongodb');
const OneTimeBooking = require('../models/OneTimeBooking');
const ParentBooking = require('../models/ParentBooking');
const GuestBooking = require('../models/GuestBooking');
const MessSubscription = require('../models/MessSubscription');
const MealTiming = require('../models/MealTiming');
const User = require('../models/User');
const { formatDate, isDateInPast, addDays, convertToIST, getCurrentISTDate } = require('../utils/helpers');
const { MEAL_TYPES, BOOKING_TYPES, SUBSCRIPTION_TYPES } = require('../utils/constants');

const bookingController = {
    createGuestMealBooking: async (req, res) => {
        try {
            const { booking_date, number_of_guests, meal_types } = req.body;
            const { id: booked_by, user_type: booked_by_usertype } = req.user;

            if (!booking_date || !number_of_guests || !meal_types || !Array.isArray(meal_types) || meal_types.length === 0) {
                return res.status(400).json({ error: 'Invalid input', details: 'Missing required fields.' });
            }

            if (isDateInPast(booking_date)) {
                return res.status(400).json({ error: 'Invalid Date', details: 'Cannot book for past dates.' });
            }

            const mealTimings = await MealTiming.getAll();
            let totalAmount = 0;
            for (const mealType of meal_types) {
                const timing = mealTimings.find(t => t.meal_type === mealType);
                if (!timing) {
                    return res.status(400).json({ error: 'Invalid Meal Type', details: `Meal type '${mealType}' not found.` });
                }
                totalAmount += timing.per_meal_cost;
            }

            totalAmount *= number_of_guests;

            const bookingData = {
                booked_by,
                booked_by_usertype,
                booking_date,
                number_of_guests,
                meal_types,
                total_amount: totalAmount
            };

            const booking = await GuestBooking.create(bookingData);

            res.status(201).json({
                message: 'Guest booking created successfully',
                booking: {
                    id: booking._id,
                    booking_date: booking.booking_date,
                    number_of_guests: booking.number_of_guests,
                    meal_types: booking.meal_types,
                    total_amount: booking.total_amount,
                    payment_status: booking.payment.status
                }
            });
        } catch (error) {
            console.error('Create guest meal booking error:', error);
            res.status(500).json({ error: 'Guest Booking Creation Failed', details: error.message });
        }
    },

    getMyGuestBookings: async (req, res) => {
        try {
            const bookings = await GuestBooking.findByBooker(req.user.id);
            res.json({
                message: 'Your guest bookings retrieved successfully',
                bookings: bookings.map(b => ({
                    id: b._id,
                    booking_date: b.booking_date,
                    number_of_guests: b.number_of_guests,
                    meal_types: b.meal_types,
                    total_amount: b.total_amount,
                    payment_status: b.payment.status
                }))
            });
        } catch (error) {
            console.error('Get my guest bookings error:', error);
            res.status(500).json({ error: 'Failed to retrieve guest bookings', details: error.message });
        }
    },

    // Create employee booking
    createEmployeeBooking: async (req, res) => {
        try {
            const { meal_date, meal_type, notes } = req.body;
            const userId = req.user.id;

            // Validate that user is an employee
            if (req.user.user_type !== 'employee') {
                return res.status(403).json({
                    error: 'Access Denied',
                    details: 'Only employees can create employee bookings'
                });
            }

            // Check if meal date is not in the past
            if (isDateInPast(meal_date)) {
                return res.status(400).json({
                    error: 'Invalid Date',
                    details: 'Cannot book meals for past dates'
                });
            }

            // Get meal cost
            const mealTiming = await MealTiming.getByMealType(meal_type);
            if (!mealTiming) {
                return res.status(404).json({
                    error: 'Meal Type Not Found',
                    details: 'Invalid meal type or meal timing not configured'
                });
            }

            // Create employee booking
            const booking = await OneTimeBooking.createEmployeeBooking(
                userId,
                meal_date,
                meal_type,
                mealTiming.per_meal_cost,
                notes
            );

            res.status(201).json({
                message: 'Employee booking created successfully',
                booking: {
                    id: booking._id,
                    meal_date: booking.meal_date,
                    meal_type: booking.meal_type,
                    amount: booking.amount,
                    payment_status: booking.payment.status,
                    created_at: booking.created_at
                }
            });

        } catch (error) {
            console.error('Create employee booking error:', error);
            res.status(500).json({
                error: 'Employee Booking Creation Failed',
                details: error.message
            });
        }
    },

    // Create guest booking
    createGuestBooking: async (req, res) => {
        try {
            const { meal_date, meal_type, guest_details, notes } = req.body;
            const bookedBy = req.user.id;

            // Validate guest details
            if (!guest_details || !guest_details.name || !guest_details.phone) {
                return res.status(400).json({
                    error: 'Invalid Guest Details',
                    details: 'Guest name and phone are required'
                });
            }

            // Check if meal date is not in the past
            if (isDateInPast(meal_date)) {
                return res.status(400).json({
                    error: 'Invalid Date',
                    details: 'Cannot book meals for past dates'
                });
            }

            // Get meal cost (guest rate might be higher)
            const mealTiming = await MealTiming.getByMealType(meal_type);
            if (!mealTiming) {
                return res.status(404).json({
                    error: 'Meal Type Not Found',
                    details: 'Invalid meal type or meal timing not configured'
                });
            }

            // Guest rate is typically 1.5x regular rate
            const guestAmount = mealTiming.per_meal_cost * 1.5;

            // Create guest booking
            const booking = await OneTimeBooking.createGuestBooking(
                guest_details,
                meal_date,
                meal_type,
                guestAmount,
                bookedBy,
                notes
            );

            res.status(201).json({
                message: 'Guest booking created successfully',
                booking: {
                    id: booking._id,
                    meal_date: booking.meal_date,
                    meal_type: booking.meal_type,
                    guest_details: booking.guest_details,
                    amount: booking.amount,
                    payment_status: booking.payment.status,
                    created_at: booking.created_at
                }
            });

        } catch (error) {
            console.error('Create guest booking error:', error);
            res.status(500).json({
                error: 'Guest Booking Creation Failed',
                details: error.message
            });
        }
    },

    // Create parent booking
    createParentBooking: async (req, res) => {
        try {
            const { meal_date, meal_type, parent_details, notes } = req.body;
            const studentId = req.user.id;

            // Validate that user is a student
            if (req.user.user_type !== 'student') {
                return res.status(403).json({
                    error: 'Access Denied',
                    details: 'Only students can create parent bookings'
                });
            }

            // Validate parent details
            const validationErrors = ParentBooking.validateParentDetails(parent_details);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    error: 'Invalid Parent Details',
                    details: validationErrors
                });
            }

            // Check if meal date is not in the past
            if (isDateInPast(meal_date)) {
                return res.status(400).json({
                    error: 'Invalid Date',
                    details: 'Cannot book meals for past dates'
                });
            }

            // Get meal cost
            const mealTiming = await MealTiming.getByMealType(meal_type);
            if (!mealTiming) {
                return res.status(404).json({
                    error: 'Meal Type Not Found',
                    details: 'Invalid meal type or meal timing not configured'
                });
            }

            // Parent rate is typically 1.2x regular rate
            const perParentCost = mealTiming.per_meal_cost * 1.2;

            // Create parent booking
            const booking = await ParentBooking.createParentBooking(
                studentId,
                meal_date,
                meal_type,
                parent_details,
                perParentCost,
                notes
            );

            res.status(201).json({
                message: 'Parent booking created successfully',
                booking: {
                    id: booking._id,
                    meal_date: booking.meal_date,
                    meal_type: booking.meal_type,
                    parent_count: booking.parent_count,
                    parent_details: booking.parent_details,
                    amount: booking.amount,
                    payment_status: booking.payment.status,
                    created_at: booking.created_at
                }
            });

        } catch (error) {
            console.error('Create parent booking error:', error);
            res.status(500).json({
                error: 'Parent Booking Creation Failed',
                details: error.message
            });
        }
    },

    // Get user's bookings
    getUserBookings: async (req, res) => {
        try {
            const { include_completed = true, booking_type } = req.query;
            const userId = req.user.id;

            const includeCompleted = include_completed === 'true';

            // Get one-time bookings
            const oneTimeBookings = await OneTimeBooking.getUserBookings(userId, includeCompleted);

            // Get parent bookings if user is a student
            let parentBookings = [];
            if (req.user.user_type === 'student') {
                parentBookings = await ParentBooking.getStudentBookings(userId, includeCompleted);
            }

            // Filter by booking type if specified
            let filteredOneTime = oneTimeBookings;
            if (booking_type && BOOKING_TYPES.includes(booking_type)) {
                filteredOneTime = oneTimeBookings.filter(b => b.booking_type === booking_type);
            }

            res.json({
                message: 'User bookings retrieved successfully',
                bookings: {
                    one_time: filteredOneTime,
                    parent: parentBookings
                },
                totals: {
                    one_time_count: filteredOneTime.length,
                    parent_count: parentBookings.length
                }
            });

        } catch (error) {
            console.error('Get user bookings error:', error);
            res.status(500).json({
                error: 'User Bookings Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get booking by ID
    getBookingById: async (req, res) => {
        try {
            const { bookingId } = req.params;
            const { booking_type = 'one_time' } = req.query;

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    error: 'Invalid Booking ID',
                    details: 'Please provide a valid booking ID'
                });
            }

            let booking;
            if (booking_type === 'parent') {
                booking = await ParentBooking.findById(bookingId);
            } else {
                booking = await OneTimeBooking.findById(bookingId);
            }

            if (!booking) {
                return res.status(404).json({
                    error: 'Booking Not Found',
                    details: 'Booking with this ID does not exist'
                });
            }

            // Check if user has access to this booking
            const userIdToCheck = booking_type === 'parent' ? booking.student_id : booking.user_id;
            if (userIdToCheck && userIdToCheck.toString() !== req.user.id.toString()) {
                // Allow staff to view any booking
                if (!['mess_staff', 'hod', 'admin'].includes(req.user.user_type)) {
                    return res.status(403).json({
                        error: 'Access Denied',
                        details: 'You can only view your own bookings'
                    });
                }
            }

            res.json({
                message: 'Booking retrieved successfully',
                booking,
                booking_type
            });

        } catch (error) {
            console.error('Get booking by ID error:', error);
            res.status(500).json({
                error: 'Booking Retrieval Failed',
                details: error.message
            });
        }
    },

    // Update booking payment status
    updatePaymentStatus: async (req, res) => {
        try {
            const { bookingId } = req.params;
            const { payment_status, payment_reference, booking_type = 'one_time' } = req.body;

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    error: 'Invalid Booking ID',
                    details: 'Please provide a valid booking ID'
                });
            }

            if (!['pending', 'paid', 'failed', 'refunded'].includes(payment_status)) {
                return res.status(400).json({
                    error: 'Invalid Payment Status',
                    details: 'Payment status must be pending, paid, failed, or refunded'
                });
            }

            let result;
            if (booking_type === 'parent') {
                result = await ParentBooking.updatePaymentStatus(
                    bookingId, 
                    payment_status, 
                    payment_reference
                );
            } else {
                result = await OneTimeBooking.updatePaymentStatus(
                    bookingId, 
                    payment_status, 
                    payment_reference
                );
            }

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Booking Not Found',
                    details: 'Booking with this ID does not exist'
                });
            }

            res.json({
                message: 'Payment status updated successfully',
                payment_status,
                payment_reference
            });

        } catch (error) {
            console.error('Update payment status error:', error);
            res.status(500).json({
                error: 'Payment Status Update Failed',
                details: error.message
            });
        }
    },

    // Cancel booking
    cancelBooking: async (req, res) => {
        try {
            const { bookingId } = req.params;
            const { reason, booking_type = 'one_time' } = req.body;

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    error: 'Invalid Booking ID',
                    details: 'Please provide a valid booking ID'
                });
            }

            let result;
            if (booking_type === 'parent') {
                result = await ParentBooking.cancelBooking(bookingId, reason);
            } else {
                result = await OneTimeBooking.cancelBooking(bookingId, reason);
            }

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Booking Not Found',
                    details: 'Booking with this ID does not exist'
                });
            }

            res.json({
                message: 'Booking cancelled successfully',
                reason: reason || 'Cancelled by user'
            });

        } catch (error) {
            console.error('Cancel booking error:', error);
            res.status(500).json({
                error: 'Booking Cancellation Failed',
                details: error.message
            });
        }
    },

    // Create subscription
    createSubscription: async (req, res) => {
        try {
            const { subscription_type, meal_types, start_date, end_date } = req.body;
            const userId = req.user.id;

            // Validate subscription type
            if (!SUBSCRIPTION_TYPES.includes(subscription_type)) {
                return res.status(400).json({
                    error: 'Invalid Subscription Type',
                    details: 'Subscription type must be hostel_student or employee_monthly'
                });
            }

            // Validate meal types
            if (!Array.isArray(meal_types) || meal_types.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Meal Types',
                    details: 'At least one meal type is required'
                });
            }

            const invalidMealTypes = meal_types.filter(type => !MEAL_TYPES.includes(type));
            if (invalidMealTypes.length > 0) {
                return res.status(400).json({
                    error: 'Invalid Meal Types',
                    details: `Invalid meal types: ${invalidMealTypes.join(', ')}`
                });
            }

            // Validate dates
            if (isDateInPast(start_date)) {
                return res.status(400).json({
                    error: 'Invalid Start Date',
                    details: 'Start date cannot be in the past'
                });
            }

            if (convertToIST(end_date) <= convertToIST(start_date)) {
                return res.status(400).json({
                    error: 'Invalid End Date',
                    details: 'End date must be after start date'
                });
            }

            // Check for existing active subscription
            const existingSubscription = await MessSubscription.findActiveByUserId(userId);
            if (existingSubscription) {
                return res.status(409).json({
                    error: 'Active Subscription Exists',
                    details: 'You already have an active subscription. Please wait for it to expire or contact admin.'
                });
            }

            // Create subscription based on user type
            let subscription;
            if (req.user.user_type === 'student' && subscription_type === 'hostel_student') {
                subscription = await MessSubscription.createHostelStudentSubscription(
                    userId, meal_types, start_date, end_date
                );
            } else if (req.user.user_type === 'employee' && subscription_type === 'employee_monthly') {
                subscription = await MessSubscription.createEmployeeSubscription(
                    userId, meal_types, start_date, end_date
                );
            } else {
                return res.status(400).json({
                    error: 'Subscription Type Mismatch',
                    details: 'Subscription type does not match your user type'
                });
            }

            res.status(201).json({
                message: 'Subscription created successfully',
                subscription: {
                    id: subscription._id,
                    subscription_type: subscription.subscription_type,
                    meal_types: subscription.meal_types,
                    monthly_cost: subscription.monthly_cost,
                    start_date: subscription.start_date,
                    end_date: subscription.end_date,
                    status: subscription.status
                }
            });

        } catch (error) {
            console.error('Create subscription error:', error);
            res.status(500).json({
                error: 'Subscription Creation Failed',
                details: error.message
            });
        }
    },

    // Get user subscriptions
    getUserSubscriptions: async (req, res) => {
        try {
            const { include_expired = false } = req.query;
            const userId = req.user.id;

            const subscriptions = await MessSubscription.getUserSubscriptions(
                userId, 
                include_expired === 'true'
            );

            const activeSubscription = await MessSubscription.findActiveByUserId(userId);

            res.json({
                message: 'User subscriptions retrieved successfully',
                subscriptions,
                active_subscription: activeSubscription,
                total: subscriptions.length
            });

        } catch (error) {
            console.error('Get user subscriptions error:', error);
            res.status(500).json({
                error: 'Subscriptions Retrieval Failed',
                details: error.message
            });
        }
    },

    // Renew subscription
    renewSubscription: async (req, res) => {
        try {
            const { subscriptionId } = req.params;
            const { new_end_date, payment_reference } = req.body;

            if (!ObjectId.isValid(subscriptionId)) {
                return res.status(400).json({
                    error: 'Invalid Subscription ID',
                    details: 'Please provide a valid subscription ID'
                });
            }

            const subscription = await MessSubscription.findById(subscriptionId);
            if (!subscription) {
                return res.status(404).json({
                    error: 'Subscription Not Found',
                    details: 'Subscription with this ID does not exist'
                });
            }

            // Check if user owns this subscription
            if (subscription.user_id.toString() !== req.user.id.toString()) {
                return res.status(403).json({
                    error: 'Access Denied',
                    details: 'You can only renew your own subscriptions'
                });
            }

            // Validate new end date
            if (convertToIST(new_end_date) <= getCurrentISTDate()) {
                return res.status(400).json({
                    error: 'Invalid End Date',
                    details: 'New end date must be in the future'
                });
            }

            const result = await MessSubscription.renewSubscription(
                subscriptionId, 
                new_end_date, 
                payment_reference
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Renewal Failed',
                    details: 'Could not renew subscription'
                });
            }

            res.json({
                message: 'Subscription renewed successfully',
                new_end_date,
                payment_reference
            });

        } catch (error) {
            console.error('Renew subscription error:', error);
            res.status(500).json({
                error: 'Subscription Renewal Failed',
                details: error.message
            });
        }
    },

    // Get daily bookings report (Admin/Staff)
    getDailyBookingsReport: async (req, res) => {
        try {
            const { date } = req.params;

            if (!date) {
                return res.status(400).json({
                    error: 'Missing Date',
                    details: 'Date parameter is required'
                });
            }

            const oneTimeReport = await OneTimeBooking.getDailyBookingReport(date);
            const parentReport = await ParentBooking.getDailyParentBookingReport(date);

            const report = {
                date,
                one_time_bookings: oneTimeReport,
                parent_bookings: parentReport,
                summary: {
                    total_one_time: oneTimeReport.reduce((sum, r) => sum + r.count, 0),
                    total_parent_bookings: parentReport.reduce((sum, r) => sum + r.total_bookings, 0),
                    total_parents: parentReport.reduce((sum, r) => sum + r.total_parents, 0),
                    total_revenue: [
                        ...oneTimeReport.map(r => r.total_amount),
                        ...parentReport.map(r => r.total_amount)
                    ].reduce((sum, amount) => sum + amount, 0)
                }
            };

            res.json({
                message: 'Daily bookings report retrieved successfully',
                report
            });

        } catch (error) {
            console.error('Get daily bookings report error:', error);
            res.status(500).json({
                error: 'Daily Report Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get pending payments (Admin/Staff)
    getPendingPayments: async (req, res) => {
        try {
            const oneTimePending = await OneTimeBooking.getPendingPayments();
            const parentPending = await ParentBooking.getPendingPayments();

            const totalPendingAmount = [
                ...oneTimePending.map(b => b.amount),
                ...parentPending.map(b => b.amount)
            ].reduce((sum, amount) => sum + amount, 0);

            res.json({
                message: 'Pending payments retrieved successfully',
                pending_payments: {
                    one_time_bookings: oneTimePending,
                    parent_bookings: parentPending
                },
                summary: {
                    total_one_time: oneTimePending.length,
                    total_parent: parentPending.length,
                    total_pending_amount: totalPendingAmount
                }
            });

        } catch (error) {
            console.error('Get pending payments error:', error);
            res.status(500).json({
                error: 'Pending Payments Retrieval Failed',
                details: error.message
            });
        }
    },

    // Search bookings (Admin/Staff)
    searchBookings: async (req, res) => {
        try {
            const { q, booking_type, payment_status, start_date, end_date } = req.query;

            const filters = {
                booking_type,
                payment_status,
                start_date,
                end_date
            };

            // Remove undefined filters
            Object.keys(filters).forEach(key => 
                filters[key] === undefined && delete filters[key]
            );

            const oneTimeResults = await OneTimeBooking.searchBookings(q, filters);
            const parentResults = await ParentBooking.searchParentBookings(q, filters);

            res.json({
                message: 'Booking search completed successfully',
                results: {
                    one_time_bookings: oneTimeResults,
                    parent_bookings: parentResults
                },
                search_params: { q, ...filters },
                totals: {
                    one_time_count: oneTimeResults.length,
                    parent_count: parentResults.length
                }
            });

        } catch (error) {
            console.error('Search bookings error:', error);
            res.status(500).json({
                error: 'Booking Search Failed',
                details: error.message
            });
        }
    },

    // Update attendance for booking (Staff)
    updateAttendance: async (req, res) => {
        try {
            const { bookingId } = req.params;
            const { attended, attended_count, booking_type = 'one_time' } = req.body;
            const scannerId = req.user.id;

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    error: 'Invalid Booking ID',
                    details: 'Please provide a valid booking ID'
                });
            }

            let result;
            if (booking_type === 'parent') {
                if (typeof attended_count !== 'number' || attended_count < 0) {
                    return res.status(400).json({
                        error: 'Invalid Attended Count',
                        details: 'Attended count must be a non-negative number'
                    });
                }
                result = await ParentBooking.updateAttendance(bookingId, attended_count, scannerId);
            } else {
                if (typeof attended !== 'boolean') {
                    return res.status(400).json({
                        error: 'Invalid Attendance Status',
                        details: 'Attended must be true or false'
                    });
                }
                result = await OneTimeBooking.updateAttendance(bookingId, attended, scannerId);
            }

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Booking Not Found',
                    details: 'Booking with this ID does not exist'
                });
            }

            res.json({
                message: 'Attendance updated successfully',
                attendance: booking_type === 'parent' ? 
                    { attended_count, scanner: req.user.name } : 
                    { attended, scanner: req.user.name }
            });

        } catch (error) {
            console.error('Update attendance error:', error);
            res.status(500).json({
                error: 'Attendance Update Failed',
                details: error.message
            });
        }
    },

    // Get monthly booking stats (Admin/Staff)
    getMonthlyStats: async (req, res) => {
        try {
            const { year, month } = req.params;

            if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                return res.status(400).json({
                    error: 'Invalid Date Parameters',
                    details: 'Valid year and month (1-12) are required'
                });
            }

            const oneTimeStats = await OneTimeBooking.getMonthlyBookingStats(parseInt(year), parseInt(month));
            const parentStats = await ParentBooking.getMonthlyParentBookingStats(parseInt(year), parseInt(month));

            const stats = {
                year: parseInt(year),
                month: parseInt(month),
                one_time_bookings: oneTimeStats,
                parent_bookings: parentStats,
                summary: {
                    total_one_time_bookings: oneTimeStats.reduce((sum, s) => sum + s.count, 0),
                    total_parent_bookings: parentStats.reduce((sum, s) => sum + s.booking_count, 0),
                    total_revenue: [
                        ...oneTimeStats.map(s => s.total_amount),
                        ...parentStats.map(s => s.total_amount)
                    ].reduce((sum, amount) => sum + amount, 0)
                }
            };

            res.json({
                message: 'Monthly booking stats retrieved successfully',
                stats
            });

        } catch (error) {
            console.error('Get monthly stats error:', error);
            res.status(500).json({
                error: 'Monthly Stats Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get all subscriptions (Admin/Staff)
    getAllSubscriptions: async (req, res) => {
        try {
            const { status, subscription_type, page = 1, limit = 50 } = req.query;

            // For simplicity, we'll return subscription stats
            // In a real implementation, you'd query the subscriptions collection
            const subscriptionStats = await MessSubscription.getSubscriptionStats();

            res.json({
                message: 'All subscriptions retrieved successfully',
                stats: subscriptionStats,
                filters: { status, subscription_type },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Get all subscriptions error:', error);
            res.status(500).json({
                error: 'Subscriptions Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get expiring subscriptions (Admin/Staff)
    getExpiringSubscriptions: async (req, res) => {
        try {
            const { days_ahead = 7 } = req.query;

            const expiringSubscriptions = await MessSubscription.getExpiringSubscriptions(
                parseInt(days_ahead)
            );

            res.json({
                message: 'Expiring subscriptions retrieved successfully',
                expiring_subscriptions: expiringSubscriptions,
                days_ahead: parseInt(days_ahead),
                total: expiringSubscriptions.length
            });

        } catch (error) {
            console.error('Get expiring subscriptions error:', error);
            res.status(500).json({
                error: 'Expiring Subscriptions Retrieval Failed',
                details: error.message
            });
        }
    },

    // Update subscription status (Admin/Staff)
    updateSubscriptionStatus: async (req, res) => {
        try {
            const { subscriptionId } = req.params;
            const { status } = req.body;

            if (!ObjectId.isValid(subscriptionId)) {
                return res.status(400).json({
                    error: 'Invalid Subscription ID',
                    details: 'Please provide a valid subscription ID'
                });
            }

            if (!['active', 'expired', 'suspended'].includes(status)) {
                return res.status(400).json({
                    error: 'Invalid Status',
                    details: 'Status must be active, expired, or suspended'
                });
            }

            const result = await MessSubscription.updateStatus(subscriptionId, status);

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Subscription Not Found',
                    details: 'Subscription with this ID does not exist'
                });
            }

            res.json({
                message: 'Subscription status updated successfully',
                status
            });

        } catch (error) {
            console.error('Update subscription status error:', error);
            res.status(500).json({
                error: 'Subscription Status Update Failed',
                details: error.message
            });
        }
    }
};

module.exports = bookingController;

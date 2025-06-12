const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateBookingData } = require('../middleware/validation');

// One-time bookings
// Create employee booking
router.post('/employee', 
    authenticateToken, 
    authorizeRoles('employee'), 
    validateBookingData,
    bookingController.createEmployeeBooking
);

// Create guest booking
router.post('/guest', 
    authenticateToken, 
    authorizeRoles('employee', 'mess_staff', 'hod'), 
    validateBookingData,
    bookingController.createGuestBooking
);

// Create parent booking
router.post('/parent', 
    authenticateToken, 
    authorizeRoles('student'), 
    bookingController.createParentBooking
);

// Get user's bookings
router.get('/my-bookings', 
    authenticateToken, 
    bookingController.getUserBookings
);

// Get booking by ID
router.get('/:bookingId', 
    authenticateToken, 
    bookingController.getBookingById
);

// Update booking payment status
router.put('/:bookingId/payment', 
    authenticateToken, 
    bookingController.updatePaymentStatus
);

// Cancel booking
router.delete('/:bookingId', 
    authenticateToken, 
    bookingController.cancelBooking
);

// Subscriptions
// Create subscription
router.post('/subscriptions', 
    authenticateToken, 
    bookingController.createSubscription
);

// Get user subscriptions
router.get('/subscriptions/my', 
    authenticateToken, 
    bookingController.getUserSubscriptions
);

// Renew subscription
router.post('/subscriptions/:subscriptionId/renew', 
    authenticateToken, 
    bookingController.renewSubscription
);

// Admin/Staff routes
// Get daily bookings report
router.get('/reports/daily/:date', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    bookingController.getDailyBookingsReport
);

// Get pending payments
router.get('/reports/pending-payments', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    bookingController.getPendingPayments
);

// Search bookings
router.get('/search/all', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    bookingController.searchBookings
);

// Update attendance for booking
router.post('/:bookingId/attendance', 
    authenticateToken, 
    authorizeRoles('mess_staff'), 
    bookingController.updateAttendance
);

// Get monthly booking stats
router.get('/reports/monthly/:year/:month', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    bookingController.getMonthlyStats
);

// Subscription management
router.get('/subscriptions/all', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    bookingController.getAllSubscriptions
);

router.get('/subscriptions/expiring', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    bookingController.getExpiringSubscriptions
);

router.put('/subscriptions/:subscriptionId/status', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    bookingController.updateSubscriptionStatus
);

module.exports = router;

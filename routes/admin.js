const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Dashboard and analytics
router.get('/dashboard', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getDashboard
);

// User management
router.get('/users/statistics', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.getUserStatistics
);

router.post('/users/bulk-import', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.bulkImportUsers
);

router.put('/users/:userId/activate', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.activateUser
);

router.put('/users/:userId/deactivate', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.deactivateUser
);

// Fine management
router.get('/fines/reports/daily/:date', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getDailyFineReport
);

router.get('/fines/reports/monthly/:year/:month', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getMonthlyFineReport
);

router.post('/fines/waive/:fineId', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.waiveFine
);

router.get('/fines/outstanding', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getOutstandingFines
);

// Revenue and financial reports
router.get('/reports/revenue/monthly/:year/:month', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.getMonthlyRevenue
);

router.get('/reports/revenue/daily/:date', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getDailyRevenue
);

// Meal management and reports
router.get('/meals/reports/attendance/:date', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getMealAttendanceReport
);

router.get('/meals/reports/wastage/:date', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getMealWastageReport
);

// System configuration
router.get('/config/meal-timings', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.getMealTimingsConfig
);

router.put('/config/meal-timings/:mealType', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.updateMealTimingConfig
);

// Notification management
router.post('/notifications/send', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.sendNotification
);

router.get('/notifications/history', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    adminController.getNotificationHistory
);

// Backup and data export
router.get('/export/meal-confirmations/:startDate/:endDate', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.exportMealConfirmations
);

router.get('/export/bookings/:startDate/:endDate', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.exportBookings
);

router.get('/export/users', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    adminController.exportUsers
);

// System maintenance
router.post('/maintenance/expire-subscriptions', 
    authenticateToken, 
    authorizeRoles('admin'), 
    adminController.expireOldSubscriptions
);

router.get('/maintenance/system-health', 
    authenticateToken, 
    authorizeRoles('admin'), 
    adminController.getSystemHealth
);

module.exports = router;

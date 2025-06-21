const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateMealConfirmation } = require('../middleware/validation');

// Get meal timings
router.get('/timings', mealController.getMealTimings);

// Get all meal prices
router.get('/prices', mealController.getMealPrices);


// Confirm meal
router.post('/confirm', 
    authenticateToken, 
    mealController.confirmMeal
);

router.get('/meal-status/weekly', 
    authenticateToken,
    mealController.getWeeklyMealConfirmationStatus
);

// Cancel meal confirmation

// Get user's meal confirmations for a date range
router.get('/confirmations', 
    authenticateToken, 
    mealController.getUserConfirmations
);

// Get today's meal confirmations for user
router.get('/today', 
    authenticateToken, 
    mealController.getTodaysMeals
);

// Get weekly meal stats for user
router.get('/weekly-stats', 
    authenticateToken, 
    mealController.getWeeklyStats
);

// Admin/Staff routes
// Get daily confirmation report
router.get('/reports/daily/:date', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    mealController.getDailyReport
);

// Update attendance via QR scan
router.post('/scan-qr', 
    authenticateToken, 
    authorizeRoles('mess_staff'), 
    mealController.scanQRCode
);

// Get no-show users
router.get('/no-shows/:date/:mealType', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    mealController.getNoShowUsers
);

// Mark attendance manually
router.post('/attendance/:confirmationId', 
    authenticateToken, 
    authorizeRoles('mess_staff'), 
    mealController.markAttendance
);

// Admin routes - Meal timing management
router.put('/timings/:mealType', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    mealController.updateMealTiming
);

router.post('/timings', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    mealController.createMealTiming
);

// Generate meal confirmations report
router.get('/reports/confirmations', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    mealController.getConfirmationsReport
);

// Bulk operations
router.post('/bulk-confirm', 
    authenticateToken, 
    authorizeRoles('mess_staff'), 
    mealController.bulkConfirmMeals
);

router.post('/bulk-cancel', 
    authenticateToken, 
    authorizeRoles('mess_staff'), 
    mealController.bulkCancelMeals
);

module.exports = router;

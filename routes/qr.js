const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Generate dynamic QR code for user profile
// Accessible by all authenticated users
router.get('/generate', 
    authenticateToken, 
    qrController.generateUserQRCode
);

// Scan QR code for meal attendance
// Only accessible by mess staff
router.post('/scan-attendance', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    qrController.scanQRForAttendance
);

// Get current meal service status
// Helps mess staff know which meal is currently being served
router.get('/meal-status', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    qrController.getCurrentMealStatus
);

module.exports = router;
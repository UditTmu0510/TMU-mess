const express = require('express');
const router = express.Router();
const parentBookingController = require('../controllers/parentBookingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Create parent booking with QR payment
router.post('/create-with-qr', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    parentBookingController.createParentBookingWithQR
);

// Scan payment QR and confirm payment
router.post('/scan-payment', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    parentBookingController.scanPaymentQR
);

// Get pending payment QRs for mess staff
router.get('/pending-payments', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    parentBookingController.getPendingPayments
);

// Get payment collection history for mess staff
router.get('/payment-history', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    parentBookingController.getPaymentHistory
);

module.exports = router;
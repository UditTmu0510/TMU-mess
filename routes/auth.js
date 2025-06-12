const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistrationData } = require('../middleware/validation');

// User registration
router.post('/register', validateRegistrationData, authController.register);

// User login
router.post('/login', authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Verify token
router.get('/verify-token', authController.verifyToken);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

// Change password (authenticated)
router.post('/change-password', authController.changePassword);

module.exports = router;

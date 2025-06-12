const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get current user profile
router.get('/profile', authenticateToken, userController.getProfile);

// Update user profile
router.put('/profile', authenticateToken, userController.updateProfile);

// Upload profile image
router.post('/profile/image', authenticateToken, userController.uploadProfileImage);

// Get user meal history
router.get('/meal-history', authenticateToken, userController.getMealHistory);

// Get user fines
router.get('/fines', authenticateToken, userController.getUserFines);

// Get user subscriptions
router.get('/subscriptions', authenticateToken, userController.getUserSubscriptions);

// Get user dashboard data
router.get('/dashboard', authenticateToken, userController.getDashboard);

// Admin routes - User management
router.get('/search', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    userController.searchUsers
);

router.get('/list', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    userController.getUserList
);

router.get('/:userId', 
    authenticateToken, 
    authorizeRoles('mess_staff', 'hod', 'admin'), 
    userController.getUserById
);

router.put('/:userId/status', 
    authenticateToken, 
    authorizeRoles('hod', 'admin'), 
    userController.updateUserStatus
);

// Student specific routes
router.get('/students/details', 
    authenticateToken, 
    authorizeRoles('student'), 
    userController.getStudentDetails
);

router.put('/students/details', 
    authenticateToken, 
    authorizeRoles('student'), 
    userController.updateStudentDetails
);

// Employee specific routes
router.get('/employees/details', 
    authenticateToken, 
    authorizeRoles('employee'), 
    userController.getEmployeeDetails
);

router.put('/employees/details', 
    authenticateToken, 
    authorizeRoles('employee'), 
    userController.updateEmployeeDetails
);

module.exports = router;

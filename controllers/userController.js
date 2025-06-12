const { ObjectId } = require('mongodb');
const User = require('../models/User');
const StudentDetail = require('../models/StudentDetail');
const EmployeeDetail = require('../models/EmployeeDetail');
const MealConfirmation = require('../models/MealConfirmation');
const Fine = require('../models/Fine');
const MessSubscription = require('../models/MessSubscription');
const OneTimeBooking = require('../models/OneTimeBooking');
const ParentBooking = require('../models/ParentBooking');
const { formatDateRange, calculateMonthKey } = require('../utils/helpers');

const userController = {
    // Get current user profile
    getProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    error: 'User Not Found',
                    details: 'User profile not found'
                });
            }

            let additionalDetails = null;
            
            // Get additional details based on user type
            if (user.user_type === 'student') {
                additionalDetails = await StudentDetail.findByUserId(req.user.id);
            } else if (user.user_type === 'employee') {
                additionalDetails = await EmployeeDetail.findByUserId(req.user.id);
            }

            const profile = {
                id: user._id,
                tmu_code: user.tmu_code,
                student_code: user.student_code,
                user_type: user.user_type,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profile_image: user.profile_image,
                department: user.department,
                is_active: user.is_active,
                mess_offense: user.mess_offense,
                created_at: user.created_at,
                additional_details: additionalDetails
            };

            res.json({
                message: 'Profile retrieved successfully',
                profile
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                error: 'Profile Retrieval Failed',
                details: error.message
            });
        }
    },

    // Update user profile
    updateProfile: async (req, res) => {
        try {
            const { name, phone, department } = req.body;
            const updateData = {};

            if (name) {
                if (!name.first || !name.last) {
                    return res.status(400).json({
                        error: 'Invalid Name',
                        details: 'Both first name and last name are required'
                    });
                }
                updateData.name = name;
            }

            if (phone) {
                if (!/^[+]?[\d\s\-\(\)]{10,15}$/.test(phone)) {
                    return res.status(400).json({
                        error: 'Invalid Phone',
                        details: 'Please provide a valid phone number'
                    });
                }
                updateData.phone = phone;
            }

            if (department) {
                updateData.department = department;
            }

            const result = await User.updateById(req.user.id, updateData);
            
            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'User Not Found',
                    details: 'User profile not found'
                });
            }

            res.json({
                message: 'Profile updated successfully'
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                error: 'Profile Update Failed',
                details: error.message
            });
        }
    },

    // Upload profile image
    uploadProfileImage: async (req, res) => {
        try {
            const { image_data, image_type } = req.body;

            if (!image_data) {
                return res.status(400).json({
                    error: 'Missing Image',
                    details: 'Image data is required'
                });
            }

            // In a real implementation, you would:
            // 1. Validate image format and size
            // 2. Upload to cloud storage (AWS S3, Cloudinary, etc.)
            // 3. Get the public URL
            // For now, we'll store the base64 data directly (not recommended for production)

            const imageUrl = `data:${image_type || 'image/jpeg'};base64,${image_data}`;
            
            await User.updateById(req.user.id, {
                profile_image: imageUrl
            });

            res.json({
                message: 'Profile image uploaded successfully',
                image_url: imageUrl
            });

        } catch (error) {
            console.error('Upload profile image error:', error);
            res.status(500).json({
                error: 'Image Upload Failed',
                details: error.message
            });
        }
    },

    // Get user meal history
    getMealHistory: async (req, res) => {
        try {
            const { limit = 50, page = 1 } = req.query;
            const skip = (page - 1) * limit;

            const history = await MealConfirmation.getUserMealHistory(req.user.id, parseInt(limit));
            
            res.json({
                message: 'Meal history retrieved successfully',
                history,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: history.length
                }
            });

        } catch (error) {
            console.error('Get meal history error:', error);
            res.status(500).json({
                error: 'Meal History Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get user fines
    getUserFines: async (req, res) => {
        try {
            const { status } = req.query; // 'paid', 'unpaid', 'waived'

            const fines = await Fine.getUserFines(req.user.id, status);
            const outstandingTotal = await Fine.getTotalOutstandingAmount(req.user.id);

            res.json({
                message: 'User fines retrieved successfully',
                fines,
                outstanding_total: outstandingTotal
            });

        } catch (error) {
            console.error('Get user fines error:', error);
            res.status(500).json({
                error: 'Fines Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get user subscriptions
    getUserSubscriptions: async (req, res) => {
        try {
            const { include_expired = false } = req.query;

            const subscriptions = await MessSubscription.getUserSubscriptions(
                req.user.id, 
                include_expired === 'true'
            );

            const activeSubscription = await MessSubscription.findActiveByUserId(req.user.id);

            res.json({
                message: 'User subscriptions retrieved successfully',
                subscriptions,
                active_subscription: activeSubscription
            });

        } catch (error) {
            console.error('Get user subscriptions error:', error);
            res.status(500).json({
                error: 'Subscriptions Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get user dashboard data
    getDashboard: async (req, res) => {
        try {
            const userId = req.user.id;
            const today = new Date();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());

            // Get today's meal confirmations
            const todaysMeals = await MealConfirmation.findByUserAndDate(userId, today);

            // Get weekly stats
            const weeklyStats = await MealConfirmation.getWeeklyStats(userId, weekStart);

            // Get outstanding fines
            const outstandingFines = await Fine.getUserOutstandingFines(userId);

            // Get active subscription
            const activeSubscription = await MessSubscription.findActiveByUserId(userId);

            // Get recent bookings
            const recentBookings = await OneTimeBooking.getUserBookings(userId, false);
            const recentParentBookings = req.user.user_type === 'student' ? 
                await ParentBooking.getStudentBookings(userId, false) : [];

            const dashboardData = {
                user_info: {
                    name: req.user.name,
                    user_type: req.user.user_type,
                    tmu_code: req.user.tmu_code
                },
                todays_meals: todaysMeals,
                weekly_stats: weeklyStats,
                outstanding_fines: {
                    count: outstandingFines.length,
                    total_amount: outstandingFines.reduce((sum, fine) => sum + fine.amount, 0),
                    fines: outstandingFines.slice(0, 5) // Latest 5 fines
                },
                active_subscription: activeSubscription,
                recent_bookings: recentBookings.slice(0, 5),
                recent_parent_bookings: recentParentBookings.slice(0, 5)
            };

            res.json({
                message: 'Dashboard data retrieved successfully',
                dashboard: dashboardData
            });

        } catch (error) {
            console.error('Get dashboard error:', error);
            res.status(500).json({
                error: 'Dashboard Retrieval Failed',
                details: error.message
            });
        }
    },

    // Search users (Admin/Staff only)
    searchUsers: async (req, res) => {
        try {
            const { q, user_type, limit = 20 } = req.query;

            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    error: 'Invalid Search',
                    details: 'Search term must be at least 2 characters'
                });
            }

            const users = await User.searchUsers(q.trim(), user_type);

            res.json({
                message: 'User search completed successfully',
                users: users.slice(0, parseInt(limit)),
                total: users.length
            });

        } catch (error) {
            console.error('Search users error:', error);
            res.status(500).json({
                error: 'User Search Failed',
                details: error.message
            });
        }
    },

    // Get user list (Admin/Staff only)
    getUserList: async (req, res) => {
        try {
            const { user_type, page = 1, limit = 50 } = req.query;

            const filter = {};
            if (user_type) {
                filter.user_type = user_type;
            }

            const users = await User.findActiveUsers(filter);

            // Simple pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + parseInt(limit);
            const paginatedUsers = users.slice(startIndex, endIndex);

            res.json({
                message: 'User list retrieved successfully',
                users: paginatedUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: users.length,
                    pages: Math.ceil(users.length / limit)
                }
            });

        } catch (error) {
            console.error('Get user list error:', error);
            res.status(500).json({
                error: 'User List Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get user by ID (Admin/Staff only)
    getUserById: async (req, res) => {
        try {
            const { userId } = req.params;

            if (!ObjectId.isValid(userId)) {
                return res.status(400).json({
                    error: 'Invalid User ID',
                    details: 'Please provide a valid user ID'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    error: 'User Not Found',
                    details: 'User with this ID does not exist'
                });
            }

            // Get additional details based on user type
            let additionalDetails = null;
            if (user.user_type === 'student') {
                additionalDetails = await StudentDetail.findByUserId(userId);
            } else if (user.user_type === 'employee') {
                additionalDetails = await EmployeeDetail.findByUserId(userId);
            }

            // Get user statistics
            const mealStats = await MealConfirmation.getUserMealHistory(userId, 10);
            const fineStats = await Fine.getUserFines(userId);
            const subscriptions = await MessSubscription.getUserSubscriptions(userId);

            const userDetails = {
                ...user,
                additional_details: additionalDetails,
                statistics: {
                    recent_meals: mealStats,
                    fines_summary: {
                        total_fines: fineStats.length,
                        outstanding_amount: fineStats
                            .filter(f => !f.payment.is_paid && !f.waiver.is_waived)
                            .reduce((sum, f) => sum + f.amount, 0)
                    },
                    active_subscriptions: subscriptions.filter(s => s.status === 'active').length
                }
            };

            res.json({
                message: 'User details retrieved successfully',
                user: userDetails
            });

        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({
                error: 'User Retrieval Failed',
                details: error.message
            });
        }
    },

    // Update user status (Admin/HOD only)
    updateUserStatus: async (req, res) => {
        try {
            const { userId } = req.params;
            const { is_active, reason } = req.body;

            if (!ObjectId.isValid(userId)) {
                return res.status(400).json({
                    error: 'Invalid User ID',
                    details: 'Please provide a valid user ID'
                });
            }

            if (typeof is_active !== 'boolean') {
                return res.status(400).json({
                    error: 'Invalid Status',
                    details: 'Status must be true or false'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    error: 'User Not Found',
                    details: 'User with this ID does not exist'
                });
            }

            await User.updateById(userId, {
                is_active,
                status_updated_by: req.user.id,
                status_updated_at: new Date(),
                status_reason: reason || null
            });

            res.json({
                message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
            });

        } catch (error) {
            console.error('Update user status error:', error);
            res.status(500).json({
                error: 'User Status Update Failed',
                details: error.message
            });
        }
    },

    // Get student details (Student only)
    getStudentDetails: async (req, res) => {
        try {
            if (req.user.user_type !== 'student') {
                return res.status(403).json({
                    error: 'Access Denied',
                    details: 'This endpoint is only for students'
                });
            }

            const studentDetails = await StudentDetail.findByUserId(req.user.id);
            
            if (!studentDetails) {
                return res.status(404).json({
                    error: 'Student Details Not Found',
                    details: 'Student profile details not found. Please contact admin.'
                });
            }

            res.json({
                message: 'Student details retrieved successfully',
                details: studentDetails
            });

        } catch (error) {
            console.error('Get student details error:', error);
            res.status(500).json({
                error: 'Student Details Retrieval Failed',
                details: error.message
            });
        }
    },

    // Update student details (Student only)
    updateStudentDetails: async (req, res) => {
        try {
            if (req.user.user_type !== 'student') {
                return res.status(403).json({
                    error: 'Access Denied',
                    details: 'This endpoint is only for students'
                });
            }

            const updateData = req.body;
            
            // Validate the data
            const errors = StudentDetail.validateStudentData(updateData);
            if (errors.length > 0) {
                return res.status(400).json({
                    error: 'Validation Failed',
                    details: errors
                });
            }

            const result = await StudentDetail.updateByUserId(req.user.id, updateData);
            
            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Student Details Not Found',
                    details: 'Student profile not found'
                });
            }

            res.json({
                message: 'Student details updated successfully'
            });

        } catch (error) {
            console.error('Update student details error:', error);
            res.status(500).json({
                error: 'Student Details Update Failed',
                details: error.message
            });
        }
    },

    // Get employee details (Employee only)
    getEmployeeDetails: async (req, res) => {
        try {
            if (req.user.user_type !== 'employee') {
                return res.status(403).json({
                    error: 'Access Denied',
                    details: 'This endpoint is only for employees'
                });
            }

            const employeeDetails = await EmployeeDetail.findByUserId(req.user.id);
            
            if (!employeeDetails) {
                return res.status(404).json({
                    error: 'Employee Details Not Found',
                    details: 'Employee profile details not found. Please contact admin.'
                });
            }

            res.json({
                message: 'Employee details retrieved successfully',
                details: employeeDetails
            });

        } catch (error) {
            console.error('Get employee details error:', error);
            res.status(500).json({
                error: 'Employee Details Retrieval Failed',
                details: error.message
            });
        }
    },

    // Update employee details (Employee only)
    updateEmployeeDetails: async (req, res) => {
        try {
            if (req.user.user_type !== 'employee') {
                return res.status(403).json({
                    error: 'Access Denied',
                    details: 'This endpoint is only for employees'
                });
            }

            const updateData = req.body;
            
            // Validate the data
            const errors = EmployeeDetail.validateEmployeeData(updateData);
            if (errors.length > 0) {
                return res.status(400).json({
                    error: 'Validation Failed',
                    details: errors
                });
            }

            const result = await EmployeeDetail.updateByUserId(req.user.id, updateData);
            
            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Employee Details Not Found',
                    details: 'Employee profile not found'
                });
            }

            res.json({
                message: 'Employee details updated successfully'
            });

        } catch (error) {
            console.error('Update employee details error:', error);
            res.status(500).json({
                error: 'Employee Details Update Failed',
                details: error.message
            });
        }
    }
};

module.exports = userController;

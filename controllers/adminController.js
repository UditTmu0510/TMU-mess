const { ObjectId } = require('mongodb');
const User = require('../models/User');
const StudentDetail = require('../models/StudentDetail');
const EmployeeDetail = require('../models/EmployeeDetail');
const MealConfirmation = require('../models/MealConfirmation');
const MealTiming = require('../models/MealTiming');
const Fine = require('../models/Fine');
const MessSubscription = require('../models/MessSubscription');
const OneTimeBooking = require('../models/OneTimeBooking');
const ParentBooking = require('../models/ParentBooking');
const { formatDate, calculateDateRange, exportToCSV, convertToIST, getCurrentISTDate } = require('../utils/helpers');
const { getDB } = require('../config/database');

const adminController = {
    // Get admin dashboard data
    getDashboard: async (req, res) => {
        try {
             const today = getCurrentISTDate();
            const now = getCurrentISTDate();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
             const mealTimings = await MealTiming.getAll();

            mealTimings.sort((a, b) => a.start_time.localeCompare(b.start_time));

            const nowInMinutes = now.getHours() * 60 + now.getMinutes();

            let currentMealInfo = null;
            let upcomingMealInfo = null;
            let lastFinishedMeal = null;

                 for (const timing of mealTimings) {
                const [startHours, startMins] = timing.start_time.split(':');
                const mealStartMinutes = parseInt(startHours, 10) * 60 + parseInt(startMins, 10);
                const [endHours, endMins] = timing.end_time.split(':');
                const mealEndMinutes = parseInt(endHours, 10) * 60 + parseInt(endMins, 10);

                console.log(`\nChecking meal: ${timing.meal_type.toUpperCase()}`);
            console.log(`  - Meal runs from ${mealStartMinutes} to ${mealEndMinutes} minutes.`);
            console.log(`  - Is current time (${nowInMinutes}) >= start time (${mealStartMinutes})?`, nowInMinutes >= mealStartMinutes);
            console.log(`  - Is current time (${nowInMinutes}) <= end time (${mealEndMinutes})?`, nowInMinutes <= mealEndMinutes);
            console.log(`  - Is start time (${mealStartMinutes}) > current time (${nowInMinutes})?`, mealStartMinutes > nowInMinutes);
            console.log(`  - Is current time (${nowInMinutes}) > end time (${mealEndMinutes})?`, nowInMinutes > mealEndMinutes);

                if (nowInMinutes >= mealStartMinutes && nowInMinutes <= mealEndMinutes) {
                    currentMealInfo = timing;
                }
                if (mealStartMinutes > nowInMinutes && !upcomingMealInfo) {
                    upcomingMealInfo = timing;
                }
                if (nowInMinutes > mealEndMinutes) {
                    lastFinishedMeal = timing;
                }
            }
            
            if (!upcomingMealInfo && mealTimings.length > 0) {
                upcomingMealInfo = mealTimings[0];
            }
            
            const userStats = await User.findActiveUsers();
            const studentStats = await StudentDetail.getStudentStatistics();
            const employeeStats = await EmployeeDetail.getEmployeeStatistics();

     
            const todaysReport = await MealConfirmation.getDailyConfirmationReport(formatDate(today));


             const formatMealReport = (mealInfo, reports) => {
                if (!mealInfo) return null;
                const reportData = reports.find(r => r._id === mealInfo.meal_type);
                if (reportData) {
                    return {
                        _id: reportData._id,
                        total_confirmations: reportData.total_confirmations,
                        attended: reportData.attended,
                        not_attended: reportData.not_attended,
                        pending: reportData.pending
                    };
                }
                return {
                    _id: mealInfo.meal_type,
                    total_confirmations: 0,
                    attended: 0,
                    not_attended: 0,
                    pending: 0
                };
            };
            
         
            const currentMealStats = formatMealReport(currentMealInfo, todaysReport);
            const lastMealStats = formatMealReport(lastFinishedMeal, todaysReport);
            const upcomingMealStats = formatMealReport(upcomingMealInfo, todaysReport);
            const subscriptionStats = await MessSubscription.getSubscriptionStats();

     
            const db = getDB();
            const outstandingFines = await db.collection('fines').aggregate([
                {
                    $match: {
                        'payment.is_paid': false,
                        'waiver.is_waived': false
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            // Get monthly revenue
            const monthlyRevenue = await MessSubscription.getMonthlyRevenue(
                today.getFullYear(), 
                today.getMonth() + 1
            );

            const dashboardData = {
                overview: {
                    total_users: userStats.length,
                    total_students: studentStats.total_students || 0,
                    total_employees: employeeStats.total_employees || 0,
                    active_subscriptions: subscriptionStats.by_status?.find(s => s._id === 'active')?.count || 0
                },
                todays_stats: {
                    date: formatDate(today),
                    meal_confirmations: todaysReport.reduce((sum, r) => sum + r.total_confirmations, 0),
                    attendance: todaysReport.reduce((sum, r) => sum + r.attended, 0),
                    no_shows: todaysReport.reduce((sum, r) => sum + r.not_attended, 0),
                    pending: todaysReport.reduce((sum, r) => sum + r.pending, 0)
                },live_meal_stats: {
                    current_meal: currentMealStats,
                    last_meal: lastMealStats,
                    upcoming_meal: upcomingMealStats
                },
                financial_summary: {
                    monthly_subscription_revenue: monthlyRevenue.total_revenue || 0,
                    outstanding_fines: outstandingFines[0]?.total_amount || 0,
                    outstanding_fine_count: outstandingFines[0]?.count || 0
                },
                meal_breakdown: todaysReport,
                subscription_breakdown: subscriptionStats
            };

            res.json({
                message: 'Admin dashboard data retrieved successfully',
                dashboard: dashboardData
            });

        } catch (error) {
            console.error('Get admin dashboard error:', error);
            res.status(500).json({
                error: 'Dashboard Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get user statistics
    getUserStatistics: async (req, res) => {
        try {
            const userStats = await User.findActiveUsers();
            const studentStats = await StudentDetail.getStudentStatistics();
            const employeeStats = await EmployeeDetail.getEmployeeStatistics();

            // Get user type distribution
            const userTypeDistribution = userStats.reduce((acc, user) => {
                acc[user.user_type] = (acc[user.user_type] || 0) + 1;
                return acc;
            }, {});

            // Get department distribution
            const departmentDistribution = userStats.reduce((acc, user) => {
                if (user.department) {
                    acc[user.department] = (acc[user.department] || 0) + 1;
                }
                return acc;
            }, {});

            const statistics = {
                user_overview: {
                    total_users: userStats.length,
                    by_type: userTypeDistribution,
                    by_department: departmentDistribution
                },
                student_details: studentStats,
                employee_details: employeeStats,
                recent_registrations: userStats
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 10)
                    .map(user => ({
                        id: user._id,
                        tmu_code: user.tmu_code,
                        name: user.name,
                        user_type: user.user_type,
                        created_at: user.created_at
                    }))
            };

            res.json({
                message: 'User statistics retrieved successfully',
                statistics
            });

        } catch (error) {
            console.error('Get user statistics error:', error);
            res.status(500).json({
                error: 'User Statistics Retrieval Failed',
                details: error.message
            });
        }
    },

    // Bulk import users
    bulkImportUsers: async (req, res) => {
        try {
            const { users } = req.body;

            if (!Array.isArray(users) || users.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Data',
                    details: 'Users array is required and cannot be empty'
                });
            }

            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            for (const userData of users) {
                try {
                    // Validate required fields
                    if (!userData.tmu_code || !userData.user_type || !userData.name || !userData.email) {
                        throw new Error('Missing required fields: tmu_code, user_type, name, email');
                    }

                    // Check if user already exists
                    const existing = await User.findByTMUCode(userData.tmu_code);
                    if (existing) {
                        throw new Error('User with this TMU code already exists');
                    }

                    // Create user
                    const user = await User.create({
                        ...userData,
                        password: userData.password || userData.tmu_code, // Default password
                        is_active: true
                    });

                    results.successful++;

                    // Create additional details based on user type
                    if (userData.user_type === 'student' && userData.student_details) {
                        await StudentDetail.create({
                            ...userData.student_details,
                            user_id: user._id
                        });
                    } else if (userData.user_type === 'employee' && userData.employee_details) {
                        await EmployeeDetail.create({
                            ...userData.employee_details,
                            user_id: user._id
                        });
                    }

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        tmu_code: userData.tmu_code,
                        error: error.message
                    });
                }
            }

            res.json({
                message: 'Bulk import completed',
                results
            });

        } catch (error) {
            console.error('Bulk import users error:', error);
            res.status(500).json({
                error: 'Bulk Import Failed',
                details: error.message
            });
        }
    },

    // Activate user
    activateUser: async (req, res) => {
        try {
            const { userId } = req.params;

            if (!ObjectId.isValid(userId)) {
                return res.status(400).json({
                    error: 'Invalid User ID',
                    details: 'Please provide a valid user ID'
                });
            }

            const result = await User.updateById(userId, {
                is_active: true,
                activated_by: req.user.id,
                activated_at: getCurrentISTDate()
            });

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'User Not Found',
                    details: 'User with this ID does not exist'
                });
            }

            res.json({
                message: 'User activated successfully'
            });

        } catch (error) {
            console.error('Activate user error:', error);
            res.status(500).json({
                error: 'User Activation Failed',
                details: error.message
            });
        }
    },

    // Deactivate user
    deactivateUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            if (!ObjectId.isValid(userId)) {
                return res.status(400).json({
                    error: 'Invalid User ID',
                    details: 'Please provide a valid user ID'
                });
            }

            const result = await User.updateById(userId, {
                is_active: false,
                deactivated_by: req.user.id,
                deactivated_at: getCurrentISTDate(),
                deactivation_reason: reason || null
            });

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'User Not Found',
                    details: 'User with this ID does not exist'
                });
            }

            res.json({
                message: 'User deactivated successfully',
                reason: reason || null
            });

        } catch (error) {
            console.error('Deactivate user error:', error);
            res.status(500).json({
                error: 'User Deactivation Failed',
                details: error.message
            });
        }
    },

    // Get daily fine report
    getDailyFineReport: async (req, res) => {
        try {
            const { date } = req.params;

            if (!date) {
                return res.status(400).json({
                    error: 'Missing Date',
                    details: 'Date parameter is required'
                });
            }

            const report = await Fine.getDailyFineReport(date);

            res.json({
                message: 'Daily fine report retrieved successfully',
                date,
                report
            });

        } catch (error) {
            console.error('Get daily fine report error:', error);
            res.status(500).json({
                error: 'Daily Fine Report Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get monthly fine report
    getMonthlyFineReport: async (req, res) => {
        try {
            const { year, month } = req.params;

            if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                return res.status(400).json({
                    error: 'Invalid Date Parameters',
                    details: 'Valid year and month (1-12) are required'
                });
            }

            const report = await Fine.getMonthlyFineStats(parseInt(year), parseInt(month));

            res.json({
                message: 'Monthly fine report retrieved successfully',
                year: parseInt(year),
                month: parseInt(month),
                report
            });

        } catch (error) {
            console.error('Get monthly fine report error:', error);
            res.status(500).json({
                error: 'Monthly Fine Report Retrieval Failed',
                details: error.message
            });
        }
    },

    // Waive fine
    waiveFine: async (req, res) => {
        try {
            const { fineId } = req.params;
            const { reason } = req.body;

            if (!ObjectId.isValid(fineId)) {
                return res.status(400).json({
                    error: 'Invalid Fine ID',
                    details: 'Please provide a valid fine ID'
                });
            }

            if (!reason || reason.trim().length < 5) {
                return res.status(400).json({
                    error: 'Invalid Reason',
                    details: 'Waiver reason must be at least 5 characters long'
                });
            }

            const fine = await Fine.findById(fineId);
            if (!fine) {
                return res.status(404).json({
                    error: 'Fine Not Found',
                    details: 'Fine with this ID does not exist'
                });
            }

            if (fine.payment.is_paid) {
                return res.status(400).json({
                    error: 'Fine Already Paid',
                    details: 'Cannot waive a fine that has already been paid'
                });
            }

            if (fine.waiver.is_waived) {
                return res.status(400).json({
                    error: 'Fine Already Waived',
                    details: 'This fine has already been waived'
                });
            }

            const result = await Fine.waiveFine(fineId, req.user.id, reason);

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Fine Waiver Failed',
                    details: 'Could not waive the fine'
                });
            }

            res.json({
                message: 'Fine waived successfully',
                fine_id: fineId,
                waived_by: req.user.name,
                reason
            });

        } catch (error) {
            console.error('Waive fine error:', error);
            res.status(500).json({
                error: 'Fine Waiver Failed',
                details: error.message
            });
        }
    },

    // Get outstanding fines
    getOutstandingFines: async (req, res) => {
        try {
            const { user_type, limit = 100 } = req.query;

            const db = getDB();
            const pipeline = [
                {
                    $match: {
                        'payment.is_paid': false,
                        'waiver.is_waived': false
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: '$user'
                }
            ];

            // Add user type filter if specified
            if (user_type) {
                pipeline.push({
                    $match: { 'user.user_type': user_type }
                });
            }

            pipeline.push(
                {
                    $project: {
                        user_id: 1,
                        fine_type: 1,
                        amount: 1,
                        reason: 1,
                        created_at: 1,
                        user: {
                            tmu_code: 1,
                            name: 1,
                            user_type: 1,
                            email: 1
                        }
                    }
                },
                {
                    $sort: { created_at: -1 }
                },
                {
                    $limit: parseInt(limit)
                }
            );

            const outstandingFines = await db.collection('fines').aggregate(pipeline).toArray();

            // Calculate summary
            const summary = outstandingFines.reduce((acc, fine) => {
                acc.total_amount += fine.amount;
                acc.count += 1;
                acc.by_type[fine.fine_type] = (acc.by_type[fine.fine_type] || 0) + 1;
                return acc;
            }, { total_amount: 0, count: 0, by_type: {} });

            res.json({
                message: 'Outstanding fines retrieved successfully',
                outstanding_fines: outstandingFines,
                summary,
                filters: { user_type, limit: parseInt(limit) }
            });

        } catch (error) {
            console.error('Get outstanding fines error:', error);
            res.status(500).json({
                error: 'Outstanding Fines Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get monthly revenue
    getMonthlyRevenue: async (req, res) => {
        try {
            const { year, month } = req.params;

            if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                return res.status(400).json({
                    error: 'Invalid Date Parameters',
                    details: 'Valid year and month (1-12) are required'
                });
            }

            const subscriptionRevenue = await MessSubscription.getMonthlyRevenue(
                parseInt(year), 
                parseInt(month)
            );

            // Get booking revenue for the month
            const startDate = convertToIST(new Date(year, month - 1, 1));
            const endDate = convertToIST(new Date(year, month, 1));

            const db = getDB();
            const bookingRevenue = await db.collection('one_time_bookings').aggregate([
                {
                    $match: {
                        meal_date: { $gte: startDate, $lt: endDate },
                        'payment.status': 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const parentBookingRevenue = await db.collection('parent_bookings').aggregate([
                {
                    $match: {
                        meal_date: { $gte: startDate, $lt: endDate },
                        'payment.status': 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const revenue = {
                year: parseInt(year),
                month: parseInt(month),
                subscription_revenue: subscriptionRevenue.total_revenue || 0,
                one_time_booking_revenue: bookingRevenue[0]?.total_amount || 0,
                parent_booking_revenue: parentBookingRevenue[0]?.total_amount || 0,
                total_revenue: (subscriptionRevenue.total_revenue || 0) + 
                              (bookingRevenue[0]?.total_amount || 0) + 
                              (parentBookingRevenue[0]?.total_amount || 0),
                breakdown: {
                    subscriptions: {
                        revenue: subscriptionRevenue.total_revenue || 0,
                        count: subscriptionRevenue.subscription_count || 0
                    },
                    one_time_bookings: {
                        revenue: bookingRevenue[0]?.total_amount || 0,
                        count: bookingRevenue[0]?.count || 0
                    },
                    parent_bookings: {
                        revenue: parentBookingRevenue[0]?.total_amount || 0,
                        count: parentBookingRevenue[0]?.count || 0
                    }
                }
            };

            res.json({
                message: 'Monthly revenue retrieved successfully',
                revenue
            });

        } catch (error) {
            console.error('Get monthly revenue error:', error);
            res.status(500).json({
                error: 'Monthly Revenue Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get daily revenue
    getDailyRevenue: async (req, res) => {
        try {
            const { date } = req.params;

            if (!date) {
                return res.status(400).json({
                    error: 'Missing Date',
                    details: 'Date parameter is required'
                });
            }

            const targetDate = convertToIST(date);
            const nextDate = new Date(targetDate);
            nextDate.setDate(nextDate.getDate() + 1);

            const db = getDB();

            // Get booking revenue for the day
            const oneTimeRevenue = await db.collection('one_time_bookings').aggregate([
                {
                    $match: {
                        meal_date: targetDate,
                        'payment.status': 'paid'
                    }
                },
                {
                    $group: {
                        _id: '$meal_type',
                        total_amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const parentRevenue = await db.collection('parent_bookings').aggregate([
                {
                    $match: {
                        meal_date: targetDate,
                        'payment.status': 'paid'
                    }
                },
                {
                    $group: {
                        _id: '$meal_type',
                        total_amount: { $sum: '$amount' },
                        parent_count: { $sum: '$parent_count' },
                        booking_count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const totalRevenue = [
                ...oneTimeRevenue.map(r => r.total_amount),
                ...parentRevenue.map(r => r.total_amount)
            ].reduce((sum, amount) => sum + amount, 0);

            const dailyRevenue = {
                date,
                one_time_bookings: oneTimeRevenue,
                parent_bookings: parentRevenue,
                total_revenue: totalRevenue,
                summary: {
                    total_one_time_bookings: oneTimeRevenue.reduce((sum, r) => sum + r.count, 0),
                    total_parent_bookings: parentRevenue.reduce((sum, r) => sum + r.booking_count, 0),
                    total_parents: parentRevenue.reduce((sum, r) => sum + r.parent_count, 0)
                }
            };

            res.json({
                message: 'Daily revenue retrieved successfully',
                revenue: dailyRevenue
            });

        } catch (error) {
            console.error('Get daily revenue error:', error);
            res.status(500).json({
                error: 'Daily Revenue Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get meal attendance report
    getMealAttendanceReport: async (req, res) => {
        try {
            const { date } = req.params;

            if (!date) {
                return res.status(400).json({
                    error: 'Missing Date',
                    details: 'Date parameter is required'
                });
            }

            const report = await MealConfirmation.getDailyConfirmationReport(date);

            res.json({
                message: 'Meal attendance report retrieved successfully',
                date,
                attendance_report: report
            });

        } catch (error) {
            console.error('Get meal attendance report error:', error);
            res.status(500).json({
                error: 'Attendance Report Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get meal wastage report
    getMealWastageReport: async (req, res) => {
        try {
            const { date } = req.params;

            if (!date) {
                return res.status(400).json({
                    error: 'Missing Date',
                    details: 'Date parameter is required'
                });
            }

            const attendanceReport = await MealConfirmation.getDailyConfirmationReport(date);
            
            // Calculate wastage based on confirmations vs attendance
            const wastageReport = attendanceReport.map(meal => {
                const wastageCount = meal.total_confirmations - meal.attended;
                const wastagePercentage = meal.total_confirmations > 0 ? 
                    (wastageCount / meal.total_confirmations * 100).toFixed(2) : 0;

                return {
                    meal_type: meal._id,
                    confirmed_meals: meal.total_confirmations,
                    attended_meals: meal.attended,
                    wasted_meals: wastageCount,
                    wastage_percentage: parseFloat(wastagePercentage)
                };
            });

            res.json({
                message: 'Meal wastage report retrieved successfully',
                date,
                wastage_report: wastageReport,
                summary: {
                    total_confirmed: wastageReport.reduce((sum, r) => sum + r.confirmed_meals, 0),
                    total_attended: wastageReport.reduce((sum, r) => sum + r.attended_meals, 0),
                    total_wasted: wastageReport.reduce((sum, r) => sum + r.wasted_meals, 0)
                }
            });

        } catch (error) {
            console.error('Get meal wastage report error:', error);
            res.status(500).json({
                error: 'Wastage Report Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get meal timings configuration
    getMealTimingsConfig: async (req, res) => {
        try {
            const mealTimings = await MealTiming.getAll();

            res.json({
                message: 'Meal timings configuration retrieved successfully',
                meal_timings: mealTimings
            });

        } catch (error) {
            console.error('Get meal timings config error:', error);
            res.status(500).json({
                error: 'Meal Timings Config Retrieval Failed',
                details: error.message
            });
        }
    },

    // Update meal timing configuration
    updateMealTimingConfig: async (req, res) => {
        try {
            const { mealType } = req.params;
            const updateData = req.body;

            const result = await MealTiming.update(mealType, updateData, req.user.id);

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Meal Timing Not Found',
                    details: 'Meal timing configuration not found'
                });
            }

            res.json({
                message: 'Meal timing configuration updated successfully'
            });

        } catch (error) {
            console.error('Update meal timing config error:', error);
            res.status(500).json({
                error: 'Meal Timing Config Update Failed',
                details: error.message
            });
        }
    },

    // Send notification
    sendNotification: async (req, res) => {
        try {
            const { message, recipient_type, recipients, priority = 'normal' } = req.body;

            if (!message || message.trim().length < 10) {
                return res.status(400).json({
                    error: 'Invalid Message',
                    details: 'Notification message must be at least 10 characters long'
                });
            }

            // In a real implementation, you would:
            // 1. Store notification in database
            // 2. Send via push notification service
            // 3. Send via email/SMS if configured
            // 4. Create notification queue for processing

            // For now, we'll simulate the notification sending
            const notification = {
                id: new ObjectId(),
                message,
                recipient_type,
                recipients: recipients || [],
                priority,
                sent_by: req.user.id,
                sent_at: getCurrentISTDate(),
                status: 'sent'
            };

            res.json({
                message: 'Notification sent successfully',
                notification
            });

        } catch (error) {
            console.error('Send notification error:', error);
            res.status(500).json({
                error: 'Notification Send Failed',
                details: error.message
            });
        }
    },

    // Get notification history
    getNotificationHistory: async (req, res) => {
        try {
            const { limit = 50, page = 1 } = req.query;

            // In a real implementation, you would query the notifications collection
            // For now, return a placeholder response
            const notifications = [];

            res.json({
                message: 'Notification history retrieved successfully',
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: notifications.length
                }
            });

        } catch (error) {
            console.error('Get notification history error:', error);
            res.status(500).json({
                error: 'Notification History Retrieval Failed',
                details: error.message
            });
        }
    },

    // Export meal confirmations
    exportMealConfirmations: async (req, res) => {
        try {
            const { startDate, endDate } = req.params;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    error: 'Missing Date Range',
                    details: 'Both start date and end date are required'
                });
            }

            // In a real implementation, you would:
            // 1. Query meal confirmations for the date range
            // 2. Generate CSV/Excel file
            // 3. Return file download link or stream

            const exportData = {
                date_range: { startDate, endDate },
                export_type: 'meal_confirmations',
                generated_at: getCurrentISTDate(),
                generated_by: req.user.name,
                download_url: '/exports/meal-confirmations-' + Date.now() + '.csv'
            };

            res.json({
                message: 'Meal confirmations export prepared successfully',
                export: exportData
            });

        } catch (error) {
            console.error('Export meal confirmations error:', error);
            res.status(500).json({
                error: 'Export Failed',
                details: error.message
            });
        }
    },

    // Export bookings
    exportBookings: async (req, res) => {
        try {
            const { startDate, endDate } = req.params;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    error: 'Missing Date Range',
                    details: 'Both start date and end date are required'
                });
            }

            const exportData = {
                date_range: { startDate, endDate },
                export_type: 'bookings',
                generated_at: getCurrentISTDate(),
                generated_by: req.user.name,
                download_url: '/exports/bookings-' + Date.now() + '.csv'
            };

            res.json({
                message: 'Bookings export prepared successfully',
                export: exportData
            });

        } catch (error) {
            console.error('Export bookings error:', error);
            res.status(500).json({
                error: 'Export Failed',
                details: error.message
            });
        }
    },

    // Export users
    exportUsers: async (req, res) => {
        try {
            const exportData = {
                export_type: 'users',
                generated_at: getCurrentISTDate(),
                generated_by: req.user.name,
                download_url: '/exports/users-' + Date.now() + '.csv'
            };

            res.json({
                message: 'Users export prepared successfully',
                export: exportData
            });

        } catch (error) {
            console.error('Export users error:', error);
            res.status(500).json({
                error: 'Export Failed',
                details: error.message
            });
        }
    },

    // Expire old subscriptions
    expireOldSubscriptions: async (req, res) => {
        try {
            const result = await MessSubscription.expireOldSubscriptions();

            res.json({
                message: 'Old subscriptions expired successfully',
                expired_count: result.modifiedCount
            });

        } catch (error) {
            console.error('Expire old subscriptions error:', error);
            res.status(500).json({
                error: 'Subscription Expiry Failed',
                details: error.message
            });
        }
    },

    // Get system health
    getSystemHealth: async (req, res) => {
        try {
            const db = getDB();

            // Check database connection
            const dbStats = await db.stats();

            // Get collection counts
            const collections = await Promise.all([
                db.collection('users').countDocuments(),
                db.collection('meal_confirmations').countDocuments(),
                db.collection('fines').countDocuments(),
                db.collection('mess_subscriptions').countDocuments(),
                db.collection('one_time_bookings').countDocuments()
            ]);

            const systemHealth = {
                database: {
                    status: 'healthy',
                    collections: dbStats.collections,
                    data_size: dbStats.dataSize,
                    storage_size: dbStats.storageSize
                },
                collections: {
                    users: collections[0],
                    meal_confirmations: collections[1],
                    fines: collections[2],
                    subscriptions: collections[3],
                    bookings: collections[4]
                },
                server: {
                    uptime: process.uptime(),
                    memory_usage: process.memoryUsage(),
                    node_version: process.version
                },
                timestamp: getCurrentISTDate()
            };

            res.json({
                message: 'System health retrieved successfully',
                health: systemHealth
            });

        } catch (error) {
            console.error('Get system health error:', error);
            res.status(500).json({
                error: 'System Health Check Failed',
                details: error.message
            });
        }
    }
};

module.exports = adminController;

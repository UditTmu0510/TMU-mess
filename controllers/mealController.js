const { ObjectId } = require('mongodb');
const MealTiming = require('../models/MealTiming');
const MealConfirmation = require('../models/MealConfirmation');
const MessSubscription = require('../models/MessSubscription');
const Fine = require('../models/Fine');
const User = require('../models/User');
const { formatDate, isDateInPast, calculateMonthKey } = require('../utils/helpers');
const { MEAL_TYPES, FINE_MULTIPLIERS } = require('../utils/constants');

const mealController = {
    // Get meal timings
    getMealTimings: async (req, res) => {
        try {
            const mealTimings = await MealTiming.getAll();
            
            res.json({
                message: 'Meal timings retrieved successfully',
                meal_timings: mealTimings
            });

        } catch (error) {
            console.error('Get meal timings error:', error);
            res.status(500).json({
                error: 'Meal Timings Retrieval Failed',
                details: error.message
            });
        }
    },

    // Confirm meal
    // confirmMeal: async (req, res) => {
    //     try {
    //         const { meal_date, meal_type, notes } = req.body;
    //         const userId = req.user.id;

    //         // Check if meal date is not in the past
    //         if (isDateInPast(meal_date)) {
    //             return res.status(400).json({
    //                 error: 'Invalid Date',
    //                 details: 'Cannot confirm meals for past dates'
    //             });
    //         }

    //         // Check if confirmation already exists
    //         const existingConfirmation = await MealConfirmation.findByUserAndDate(
    //             userId, meal_date, meal_type
    //         );

    //         if (existingConfirmation) {
    //             return res.status(409).json({
    //                 error: 'Already Confirmed',
    //                 details: 'Meal already confirmed for this date and type'
    //             });
    //         }

    //         // Check confirmation deadline
    //         const deadlineCheck = await MealTiming.checkConfirmationDeadline(meal_type, meal_date);
            
    //         if (!deadlineCheck.canConfirm) {
    //             return res.status(400).json({
    //                 error: 'Confirmation Deadline Passed',
    //                 details: `Confirmation deadline was ${deadlineCheck.deadline.toLocaleString()}`
    //             });
    //         }

    //         // Check if user has subscription or needs to pay per meal
    //         const subscriptionStatus = await MessSubscription.checkUserSubscriptionStatus(
    //             userId, meal_type, meal_date
    //         );

    //         let mealCost = 0;
    //         if (!subscriptionStatus.hasSubscription) {
    //             // Get meal cost for one-time confirmation
    //             const mealTiming = await MealTiming.getByMealType(meal_type);
    //             mealCost = mealTiming ? mealTiming.per_meal_cost : 0;
    //         }

    //         // Create meal confirmation
    //         const confirmationData = {
    //             user_id: userId,
    //             meal_date,
    //             meal_type,
    //             notes: notes || '',
    //             meal_cost: mealCost
    //         };

    //         const confirmation = await MealConfirmation.create(confirmationData);

    //         res.status(201).json({
    //             message: 'Meal confirmed successfully',
    //             confirmation: {
    //                 id: confirmation._id,
    //                 meal_date: confirmation.meal_date,
    //                 meal_type: confirmation.meal_type,
    //                 confirmed_at: confirmation.confirmed_at,
    //                 meal_cost: mealCost,
    //                 subscription_covered: subscriptionStatus.hasSubscription
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Confirm meal error:', error);
    //         res.status(500).json({
    //             error: 'Meal Confirmation Failed',
    //             details: error.message
    //         });
    //     }
    // },



// Remove MEAL_TYPE_SHORT_TO_FULL map, it's no longer needed
// const MEAL_TYPE_SHORT_TO_FULL = { ... };

// Import MEAL_TYPES from your constants
 // Assuming this path

// mealController.js

// ... (your existing imports, including MEAL_TYPES from constants, isDateInPast) ...

confirmMeal: async (req, res) => {
    try {
        const { weeklyConfirmations } = req.body; // Expecting weekly confirmations data
        const userId = req.user.id;
        
        if (!weeklyConfirmations || !Array.isArray(weeklyConfirmations)) {
            return res.status(400).json({
                error: 'Invalid Request Body',
                details: 'Expected weeklyConfirmations array with meal confirmation data.'
            });
        }

        const results = {
            created: [],
            updated: [],
            deleted: [],
            frozen: [],
            errors: []
        };

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Process each day's confirmations
        for (const dayData of weeklyConfirmations) {
            const { date, ...mealTypeSelections } = dayData;
            
            if (!date) {
                results.errors.push({
                    error: 'Missing date for confirmation data',
                    data: dayData
                });
                continue;
            }

            // Parse the date - assuming format like "December 19" from getWeeklyMealConfirmationStatus
            const currentYear = today.getFullYear();
            // Correctly parse the date as UTC to avoid timezone shifts.
            // new Date('December 21, 2024') creates a local time date.
            // Appending ' UTC' treats the date as UTC from the start.
            const parsedDate = new Date(`${date}, ${currentYear} UTC`);

            // Skip if date is in the past
            if (parsedDate < today) {
                results.errors.push({
                    error: 'Cannot modify confirmations for past dates',
                    date: date
                });
                continue;
            }

            // Process each meal type for this date
            for (const mealType of MEAL_TYPES) {
                const isSelected = mealTypeSelections[mealType];
                const isFrozen = mealTypeSelections[`is_freeze_${mealType}`];
                
                // Skip frozen meals - they cannot be modified
                if (isFrozen) {
                    continue;
                }

                try {
                    // Check if confirmation already exists
                    const existingConfirmation = await MealConfirmation.findByUserAndDate(
                        userId, parsedDate, mealType
                    );

                    if (isSelected) {
                        // User wants to confirm this meal
                        if (existingConfirmation) {
                            // Update existing confirmation (re-confirm)
                            const updateFields = {
                                confirmed_at: new Date(),
                                notes: '' // Reset notes on re-confirmation
                            };

                            await MealConfirmation.updateConfirmationById(
                                existingConfirmation._id,
                                updateFields
                            );

                            results.updated.push({
                                date: date,
                                meal_type: mealType,
                                id: existingConfirmation._id
                            });
                        } else {
                            // Create new confirmation
                            // Check confirmation deadline
                            const deadlineCheck = await MealTiming.checkConfirmationDeadline(mealType, parsedDate);
                            if (!deadlineCheck.canConfirm) {
                                results.errors.push({
                                    error: `Confirmation deadline passed for ${mealType} on ${date}`,
                                    date: date,
                                    meal_type: mealType,
                                    deadline: deadlineCheck.deadline
                                });
                                continue;
                            }

                            // Check subscription status for cost calculation
                            const subscriptionStatus = await MessSubscription.checkUserSubscriptionStatus(
                                userId, mealType, parsedDate
                            );

                            let mealCost = 0;
                            if (!subscriptionStatus.hasSubscription) {
                                const mealTiming = await MealTiming.getByMealType(mealType);
                                mealCost = mealTiming ? mealTiming.per_meal_cost : 0;
                            }

                            // Create new confirmation
                            const confirmationData = {
                                user_id: userId,
                                meal_date: parsedDate,
                                meal_type: mealType,
                                notes: '',
                                meal_cost: mealCost,
                                is_freeze: false
                            };

                            const newConfirmation = await MealConfirmation.create(confirmationData);
                            
                            results.created.push({
                                date: date,
                                meal_type: mealType,
                                id: newConfirmation._id,
                                meal_cost: mealCost,
                                subscription_covered: subscriptionStatus.hasSubscription
                            });
                        }
                    } else {
                        // User wants to unconfirm this meal
                        // console.log(existingConfirmation);
                        if (existingConfirmation && !existingConfirmation.is_freeze) {
                            // Delete the confirmation only if not frozen
                            await MealConfirmation.deleteConfirmation(existingConfirmation._id);
                            
                            results.deleted.push({
                                date: date,
                                meal_type: mealType,
                                id: existingConfirmation._id
                            });
                        }
                    }
                } catch (error) {
                    results.errors.push({
                        error: `Failed to process ${mealType} for ${date}: ${error.message}`,
                        date: date,
                        meal_type: mealType
                    });
                }
            }
        }

        // Return comprehensive results
        const totalProcessed = results.created.length + results.updated.length + results.deleted.length;
        
        if (results.errors.length > 0 && totalProcessed === 0) {
            return res.status(400).json({
                error: 'Meal Confirmation Failed',
                details: 'No confirmations could be processed successfully.',
                errors: results.errors
            });
        }

        res.status(200).json({
            message: `Meal confirmations processed successfully. ${totalProcessed} operations completed.`,
            summary: {
                created: results.created.length,
                updated: results.updated.length,
                deleted: results.deleted.length,
                errors: results.errors.length
            },
            details: results
        });

    } catch (error) {
        console.error('Weekly meal confirmation error:', error);
        res.status(500).json({
            error: 'Meal Confirmation Failed',
            details: error.message
        });
    }
},



// mealController.js

// ... (your existing imports, including MEAL_TYPES from constants) ...

/**
 * Fetches the meal confirmation status for the next 7 days for the authenticated user,
 * including confirmation and is_freeze status for each meal.
 */
getWeeklyMealConfirmationStatus: async (req, res) => {
    try {
        const userId = req.user.id;

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Normalize to the start of today in UTC

        const weeklyStatus = [];

        // 1. Initialize the structure for the next 7 days, including is_freeze fields
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);

            const formattedDate = currentDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
            });

            const dailyEntry = {
                date: formattedDate
            };

            // Initialize all meal types and their corresponding is_freeze status
            MEAL_TYPES.forEach(mealType => {
                dailyEntry[mealType] = false; // Default: not confirmed
                // Add the is_freeze field, defaulting to false if not set in DB initially
                dailyEntry[`is_freeze_${mealType}`] = false; // Default: not frozen
            });

            weeklyStatus.push(dailyEntry);
        }

        // 2. Define the date range for fetching confirmed meals
        const startDate = new Date(today);
        startDate.setUTCHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 6);
        endDate.setUTCHours(23, 59, 59, 999);

        // 3. Fetch all confirmed meals for the user within this 7-day range
        // Ensure your MealConfirmation.getUserConfirmationsForDateRange fetches 'is_freeze' field.
        const confirmedMeals = await MealConfirmation.getUserConfirmationsForDateRange(
            userId, startDate, endDate
        );

        // 4. Populate the weekly status with actual confirmed meals and their freeze status
        confirmedMeals.forEach(meal => {
            const mealDate = new Date(meal.meal_date);
            mealDate.setUTCHours(0,0,0,0); // Normalize meal date from DB

            const dayIndex = Math.floor((mealDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (dayIndex >= 0 && dayIndex < 7) {
                const mealTypeKey = meal.meal_type;
                if (MEAL_TYPES.includes(mealTypeKey)) {
                    // Set confirmation status
                    weeklyStatus[dayIndex][mealTypeKey] = true;

                    // Set is_freeze status for this specific meal type
                    // Check if meal.is_freeze exists and is a boolean, otherwise default to false
                    weeklyStatus[dayIndex][`is_freeze_${mealTypeKey}`] =
                        (typeof meal.is_freeze === 'boolean') ? meal.is_freeze : false;
                }
            }
        });

        // 5. Send the formatted data in the response
        res.status(200).json({
            message: 'Weekly meal confirmation status retrieved successfully',
            data: weeklyStatus
        });

    } catch (error) {
        console.error('Get weekly meal confirmation status error:', error);
        res.status(500).json({
            error: 'Failed to retrieve weekly meal confirmation status',
            details: error.message
        });
    }
},

    // Get user's meal confirmations for a date range
    getUserConfirmations: async (req, res) => {
        try {
            const { start_date, end_date } = req.query;
            const userId = req.user.id;

            if (!start_date || !end_date) {
                return res.status(400).json({
                    error: 'Missing Date Range',
                    details: 'Both start_date and end_date are required'
                });
            }

            const confirmations = await MealConfirmation.getUserConfirmationsForDateRange(
                userId, start_date, end_date
            );

            res.json({
                message: 'Meal confirmations retrieved successfully',
                confirmations,
                date_range: { start_date, end_date },
                total: confirmations.length
            });

        } catch (error) {
            console.error('Get user confirmations error:', error);
            res.status(500).json({
                error: 'Confirmations Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get today's meal confirmations for user
    getTodaysMeals: async (req, res) => {
        try {
            const userId = req.user.id;
            const today = formatDate(new Date());

            const todaysMeals = await MealConfirmation.findByUserAndDate(userId, today);
            const mealTimings = await MealTiming.getAll();

            // Create a comprehensive view of today's meals
            const mealStatus = {};
            
            mealTimings.forEach(timing => {
                const confirmation = Array.isArray(todaysMeals) ? 
                    todaysMeals.find(m => m.meal_type === timing._id) : 
                    (todaysMeals && todaysMeals.meal_type === timing._id ? todaysMeals : null);

                const deadlineCheck = MealTiming.checkConfirmationDeadline(timing._id, today);
                
                mealStatus[timing._id] = {
                    meal_type: timing._id,
                    timing: timing,
                    confirmation: confirmation,
                    can_confirm: !confirmation && deadlineCheck.canConfirm,
                    deadline_passed: !deadlineCheck.canConfirm,
                    deadline: deadlineCheck.deadline
                };
            });

            res.json({
                message: 'Today\'s meals retrieved successfully',
                date: today,
                meals: mealStatus
            });

        } catch (error) {
            console.error('Get today\'s meals error:', error);
            res.status(500).json({
                error: 'Today\'s Meals Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get weekly meal stats for user
    getWeeklyStats: async (req, res) => {
        try {
            const userId = req.user.id;
            const { week_start } = req.query;
            
            const startDate = week_start ? new Date(week_start) : (() => {
                const today = new Date();
                const start = new Date(today);
                start.setDate(today.getDate() - today.getDay()); // Start of current week
                return start;
            })();

            const stats = await MealConfirmation.getWeeklyStats(userId, startDate);

            res.json({
                message: 'Weekly stats retrieved successfully',
                week_start: startDate,
                stats
            });

        } catch (error) {
            console.error('Get weekly stats error:', error);
            res.status(500).json({
                error: 'Weekly Stats Retrieval Failed',
                details: error.message
            });
        }
    },

    // Get daily confirmation report (Admin/Staff)
    getDailyReport: async (req, res) => {
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
                message: 'Daily report retrieved successfully',
                date,
                report
            });

        } catch (error) {
            console.error('Get daily report error:', error);
            res.status(500).json({
                error: 'Daily Report Retrieval Failed',
                details: error.message
            });
        }
    },

    // Scan QR code for attendance (Staff only)
    scanQRCode: async (req, res) => {
        try {
            const { confirmation_id, qr_data, meal_type, meal_date } = req.body;
            const scannerId = req.user.id;

            let confirmation;

            if (confirmation_id) {
                // Scan existing confirmation
                if (!ObjectId.isValid(confirmation_id)) {
                    return res.status(400).json({
                        error: 'Invalid Confirmation ID',
                        details: 'Please provide a valid confirmation ID'
                    });
                }

                confirmation = await MealConfirmation.findById(confirmation_id);
            } else if (qr_data) {
                // Parse QR data to find confirmation
                // QR data format could be: "USER_ID|MEAL_DATE|MEAL_TYPE"
                const [userId, date, type] = qr_data.split('|');
                confirmation = await MealConfirmation.findByUserAndDate(userId, date, type);
            } else {
                return res.status(400).json({
                    error: 'Missing QR Data',
                    details: 'Either confirmation_id or qr_data is required'
                });
            }

            if (!confirmation) {
                return res.status(404).json({
                    error: 'Confirmation Not Found',
                    details: 'No meal confirmation found for this QR code'
                });
            }

            // Check if already scanned
            if (confirmation.qr_scanned_at) {
                return res.status(400).json({
                    error: 'Already Scanned',
                    details: 'This meal has already been scanned',
                    scanned_at: confirmation.qr_scanned_at
                });
            }

            // Update attendance
            const attendanceData = {
                attended: true,
                qr_scanned_at: new Date(),
                qr_scanner_id: scannerId
            };

            await MealConfirmation.updateAttendance(confirmation._id, attendanceData);

            // Get user details for response
            const user = await User.findById(confirmation.user_id);

            res.json({
                message: 'QR code scanned successfully',
                attendance: {
                    confirmation_id: confirmation._id,
                    user: {
                        name: user.name,
                        tmu_code: user.tmu_code,
                        user_type: user.user_type
                    },
                    meal_type: confirmation.meal_type,
                    meal_date: confirmation.meal_date,
                    scanned_at: attendanceData.qr_scanned_at,
                    scanner: req.user.name
                }
            });

        } catch (error) {
            console.error('Scan QR code error:', error);
            res.status(500).json({
                error: 'QR Scan Failed',
                details: error.message
            });
        }
    },

    // Get no-show users (Admin/Staff)
    getNoShowUsers: async (req, res) => {
        try {
            const { date, mealType } = req.params;

            if (!date || !mealType) {
                return res.status(400).json({
                    error: 'Missing Parameters',
                    details: 'Date and meal type are required'
                });
            }

            const noShowUsers = await MealConfirmation.getNoShowUsers(date, mealType);

            res.json({
                message: 'No-show users retrieved successfully',
                date,
                meal_type: mealType,
                no_shows: noShowUsers,
                total: noShowUsers.length
            });

        } catch (error) {
            console.error('Get no-show users error:', error);
            res.status(500).json({
                error: 'No-Show Users Retrieval Failed',
                details: error.message
            });
        }
    },

    // Mark attendance manually (Staff only)
    markAttendance: async (req, res) => {
        try {
            const { confirmationId } = req.params;
            const { attended, notes, fine_amount } = req.body;
            const staffId = req.user.id;

            if (!ObjectId.isValid(confirmationId)) {
                return res.status(400).json({
                    error: 'Invalid Confirmation ID',
                    details: 'Please provide a valid confirmation ID'
                });
            }

            const confirmation = await MealConfirmation.findById(confirmationId);
            
            if (!confirmation) {
                return res.status(404).json({
                    error: 'Confirmation Not Found',
                    details: 'Meal confirmation not found'
                });
            }

            // Update attendance
            const attendanceData = {
                attended: attended,
                qr_scanned_at: new Date(),
                qr_scanner_id: staffId,
                notes: notes || ''
            };

            if (fine_amount && fine_amount > 0) {
                attendanceData.fine_applied = fine_amount;
                
                // Create fine record
                await Fine.create({
                    user_id: confirmation.user_id,
                    fine_type: 'no_show',
                    amount: fine_amount,
                    reason: `No-show fine for ${confirmation.meal_type} meal on ${formatDate(confirmation.meal_date)}`,
                    related_confirmation_id: confirmationId
                });
            }

            await MealConfirmation.updateAttendance(confirmationId, attendanceData);

            // Update user's mess offense count if no-show
            if (!attended) {
                const monthKey = calculateMonthKey(confirmation.meal_date);
                const offenseCount = await User.updateMessOffense(confirmation.user_id, monthKey);
                
                // Apply additional fine for multiple offenses
                if (offenseCount >= 3) {
                    await Fine.createMultipleOffenseFine(confirmation.user_id, offenseCount);
                }
            }

            res.json({
                message: 'Attendance marked successfully',
                attendance: {
                    confirmation_id: confirmationId,
                    attended: attended,
                    marked_by: req.user.name,
                    marked_at: attendanceData.qr_scanned_at,
                    fine_applied: fine_amount || 0
                }
            });

        } catch (error) {
            console.error('Mark attendance error:', error);
            res.status(500).json({
                error: 'Attendance Marking Failed',
                details: error.message
            });
        }
    },

    // Update meal timing (Admin/HOD)
    updateMealTiming: async (req, res) => {
        try {
            const { mealType } = req.params;
            const updateData = req.body;

            if (!MEAL_TYPES.includes(mealType)) {
                return res.status(400).json({
                    error: 'Invalid Meal Type',
                    details: 'Please provide a valid meal type'
                });
            }

            const result = await MealTiming.update(mealType, updateData, req.user.id);
            
            if (result.matchedCount === 0) {
                return res.status(404).json({
                    error: 'Meal Timing Not Found',
                    details: 'Meal timing configuration not found'
                });
            }

            res.json({
                message: 'Meal timing updated successfully'
            });

        } catch (error) {
            console.error('Update meal timing error:', error);
            res.status(500).json({
                error: 'Meal Timing Update Failed',
                details: error.message
            });
        }
    },

    // Create meal timing (Admin/HOD)
    createMealTiming: async (req, res) => {
        try {
            const mealTimingData = {
                ...req.body,
                updated_by: req.user.id
            };

            const mealTiming = await MealTiming.create(mealTimingData);

            res.status(201).json({
                message: 'Meal timing created successfully',
                meal_timing: mealTiming
            });

        } catch (error) {
            console.error('Create meal timing error:', error);
            res.status(500).json({
                error: 'Meal Timing Creation Failed',
                details: error.message
            });
        }
    },

    // Generate meal confirmations report (Admin/Staff)
    getConfirmationsReport: async (req, res) => {
        try {
            const { start_date, end_date, meal_type, user_type } = req.query;

            if (!start_date || !end_date) {
                return res.status(400).json({
                    error: 'Missing Date Range',
                    details: 'Both start_date and end_date are required'
                });
            }

            // This would require a complex aggregation query
            // For now, return a basic structure
            const report = {
                date_range: { start_date, end_date },
                filters: { meal_type, user_type },
                summary: {
                    total_confirmations: 0,
                    total_attendance: 0,
                    attendance_rate: 0,
                    total_fines: 0
                },
                daily_breakdown: [],
                meal_type_breakdown: []
            };

            res.json({
                message: 'Confirmations report generated successfully',
                report
            });

        } catch (error) {
            console.error('Get confirmations report error:', error);
            res.status(500).json({
                error: 'Report Generation Failed',
                details: error.message
            });
        }
    },

    // Bulk confirm meals (Staff only)
    bulkConfirmMeals: async (req, res) => {
        try {
            const { confirmations } = req.body;

            if (!Array.isArray(confirmations) || confirmations.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Data',
                    details: 'Confirmations array is required and cannot be empty'
                });
            }

            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            for (const confirmation of confirmations) {
                try {
                    await MealConfirmation.create({
                        user_id: confirmation.user_id,
                        meal_date: confirmation.meal_date,
                        meal_type: confirmation.meal_type,
                        notes: 'Bulk confirmation by staff'
                    });
                    results.successful++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        user_id: confirmation.user_id,
                        error: error.message
                    });
                }
            }

            res.json({
                message: 'Bulk confirmation completed',
                results
            });

        } catch (error) {
            console.error('Bulk confirm meals error:', error);
            res.status(500).json({
                error: 'Bulk Confirmation Failed',
                details: error.message
            });
        }
    },

    // Bulk cancel meals (Staff only)
    bulkCancelMeals: async (req, res) => {
        try {
            const { confirmation_ids, reason } = req.body;

            if (!Array.isArray(confirmation_ids) || confirmation_ids.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Data',
                    details: 'Confirmation IDs array is required and cannot be empty'
                });
            }

            const results = {
                successful: 0,
                failed: 0,
                errors: []
            };

            for (const confirmationId of confirmation_ids) {
                try {
                    await MealConfirmation.deleteConfirmation(confirmationId);
                    results.successful++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        confirmation_id: confirmationId,
                        error: error.message
                    });
                }
            }

            res.json({
                message: 'Bulk cancellation completed',
                results,
                reason: reason || 'Bulk cancellation by staff'
            });

        } catch (error) {
            console.error('Bulk cancel meals error:', error);
            res.status(500).json({
                error: 'Bulk Cancellation Failed',
                details: error.message
            });
        }
    }
};

module.exports = mealController;

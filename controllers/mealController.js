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
        const confirmations = req.body; // Expecting an array of objects
        const userId = req.user.id;
        const errors = []; // Collect errors, but for decision-making, not direct return

        if (!Array.isArray(confirmations) || confirmations.length === 0) {
            return res.status(400).json({
                error: 'Invalid Request Body',
                details: 'Expected an array of meal confirmations.'
            });
        }

        const confirmationPromises = confirmations.flatMap(confirmation => {
            const { meal_date, meal_types, notes } = confirmation;

            // --- Initial Input Validation for each confirmation object ---
            if (!meal_date || typeof meal_date !== 'string' || !meal_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                errors.push({
                    item: confirmation,
                    error: 'Validation Failed',
                    details: 'Valid meal date (YYYY-MM-DD) is required for this entry.'
                });
                return [];
            }

            if (!Array.isArray(meal_types) || meal_types.length === 0) {
                errors.push({
                    item: confirmation,
                    error: 'Validation Failed',
                    details: 'At least one meal type is required for this entry.'
                });
                return [];
            }

            const currentMealDate = new Date(meal_date);
            currentMealDate.setUTCHours(0, 0, 0, 0);

            if (isDateInPast(currentMealDate)) {
                errors.push({
                    item: confirmation,
                    error: 'Invalid Date',
                    details: `Cannot confirm meals for past date: ${meal_date}`
                });
                return [];
            }
            // --- End Initial Input Validation ---

            return meal_types.map(async (mealType) => {
                if (!MEAL_TYPES.includes(mealType)) {
                    throw new Error(`Unrecognized meal type: ${mealType}. Expected one of: ${MEAL_TYPES.join(', ')}`);
                }

                // Check confirmation deadline first, as it applies to both new confirmations and updates
                const deadlineCheck = await MealTiming.checkConfirmationDeadline(mealType, currentMealDate);
                if (!deadlineCheck.canConfirm) {
                    throw new Error(`Confirmation deadline for ${mealType} on ${meal_date} was ${deadlineCheck.deadline.toLocaleString()}`);
                }

                // Check if confirmation already exists for this user, date, and meal type
                const existingConfirmation = await MealConfirmation.findByUserAndDate(
                    userId, currentMealDate, mealType
                );

                if (existingConfirmation) {
                    // --- EXISTING CONFIRMATION LOGIC ---
                    if (existingConfirmation.is_freeze) {
                        // If is_freeze is true, do NOT update. Treat as a successful but non-actionable update.
                        // You might want to return a specific status or message here if the frontend needs to know
                        // that it was "frozen" rather than genuinely updated. For now, we'll treat it as successful
                        // but not resulting in database modification.
                        return {
                            id: existingConfirmation._id,
                            meal_date: existingConfirmation.meal_date,
                            meal_type: existingConfirmation.meal_type,
                            confirmed_at: existingConfirmation.confirmed_at, // Keep original
                            meal_cost: existingConfirmation.meal_cost,
                            subscription_covered: true, // Assuming frozen means covered
                            status: 'frozen', // Custom status for the client
                            message: `Meal ${mealType} for ${meal_date} is frozen and cannot be updated.`
                        };
                    } else {
                        // If is_freeze is false, update the existing record.
                        // You'll need an update method in your MealConfirmation model.
                        // This update will implicitly update 'updatedAt' if you have timestamps enabled,
                        // and we will explicitly update 'confirmed_at' as per requirement.

                        const updateFields = {
                            // Only update these fields, keep others like meal_cost as is if not changed
                            confirmed_at: new Date(), // Update confirmed_at
                            notes: notes || existingConfirmation.notes || '', // Update notes or keep existing
                            // If you have an 'updated_at' field in your schema/model and it's managed manually:
                            // updated_at: new Date(),
                        };

                        // Assuming you have a method like MealConfirmation.updateConfirmationById in your model
                        const updateResult = await MealConfirmation.updateConfirmationById(
                            existingConfirmation._id,
                            updateFields
                        );

                        if (updateResult.modifiedCount === 0) {
                             // This might happen if no fields actually changed, or if there's an issue.
                             // For this logic, we'll still treat it as a success as it was found and not frozen.
                             return {
                                id: existingConfirmation._id,
                                meal_date: existingConfirmation.meal_date,
                                meal_type: existingConfirmation.meal_type,
                                confirmed_at: existingConfirmation.confirmed_at, // Use original if no change, or updated if you query it back
                                meal_cost: existingConfirmation.meal_cost,
                                subscription_covered: true, // Assuming subscription covered for existing
                                status: 'unchanged', // Custom status for the client
                                message: `Meal ${mealType} for ${meal_date} was already confirmed and no changes were required.`
                            };
                        }

                        // Re-fetch the updated confirmation to return the latest state
                        const updatedConfirmation = await MealConfirmation.findById(existingConfirmation._id);

                        return {
                            id: updatedConfirmation._id,
                            meal_date: updatedConfirmation.meal_date,
                            meal_type: updatedConfirmation.meal_type,
                            confirmed_at: updatedConfirmation.confirmed_at, // This should be the new date
                            meal_cost: updatedConfirmation.meal_cost,
                            subscription_covered: true, // Assuming subscription covered for existing
                            status: 'updated', // Custom status for the client
                            message: `Meal ${mealType} for ${meal_date} updated successfully.`
                        };
                    }
                } else {
                    // --- NEW CONFIRMATION LOGIC ---
                    // Check if user has subscription or needs to pay per meal
                    const subscriptionStatus = await MessSubscription.checkUserSubscriptionStatus(
                        userId, mealType, currentMealDate
                    );

                    let mealCost = 0;
                    if (!subscriptionStatus.hasSubscription) {
                        const mealTiming = await MealTiming.getByMealType(mealType);
                        mealCost = mealTiming ? mealTiming.per_meal_cost : 0;
                    }

                    // Create meal confirmation
                    const confirmationData = {
                        user_id: userId,
                        meal_date: currentMealDate,
                        meal_type: mealType,
                        notes: notes || '',
                        meal_cost: mealCost,
                        is_freeze: false, // New confirmations are not frozen by default
                    };

                    const newConfirmation = await MealConfirmation.create(confirmationData);
                    
                    return {
                        id: newConfirmation._id,
                        meal_date: newConfirmation.meal_date,
                        meal_type: newConfirmation.meal_type,
                        confirmed_at: newConfirmation.confirmed_at,
                        meal_cost: mealCost,
                        subscription_covered: subscriptionStatus.hasSubscription,
                        status: 'created', // Custom status for the client
                        message: `Meal ${mealType} for ${meal_date} confirmed successfully.`
                    };
                }
            });
        });

        // If there were initial validation errors, return them immediately
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Meal Confirmation Failed',
                details: 'Some initial validation errors occurred.',
                validationErrors: errors
            });
        }
        
        const results = await Promise.allSettled(confirmationPromises);

        const failedOperations = [];
        const successfulOperations = []; // To collect results from successful/updated/frozen operations

        results.forEach((result) => {
            if (result.status === 'rejected') {
                failedOperations.push(result.reason.message);
            } else {
                successfulOperations.push(result.value); // Collect all successful, updated, or frozen responses
            }
        });

        if (failedOperations.length > 0) {
            return res.status(400).json({
                error: 'Meal Confirmation Failed',
                details: 'One or more meal confirmations could not be processed successfully.',
                failed_reasons: failedOperations,
                // Optionally, you can still return successfully processed items if client needs them
                // processed_meals: successfulOperations
            });
        } else {
            return res.status(200).json({
                message: 'All specified meal operations completed successfully.',
                processed_meals_count: successfulOperations.length
                // Optionally, return a summary of all processed meals:
                // processed_meals_summary: successfulOperations.map(op => ({
                //     date: op.meal_date.toISOString().split('T')[0],
                //     mealType: op.meal_type,
                //     status: op.status,
                //     message: op.message
                // }))
            });
        }

    } catch (error) {
        console.error('Bulk confirm meal error:', error);
        res.status(500).json({
            error: 'Meal Confirmation Failed',
            details: error.message || 'An unexpected error occurred during bulk meal confirmation.'
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

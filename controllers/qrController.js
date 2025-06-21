const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const User = require("../models/User");
const StudentDetail = require("../models/StudentDetail");
const EmployeeDetail = require("../models/EmployeeDetail");
const MealConfirmation = require("../models/MealConfirmation");
const MessSubscription = require("../models/MessSubscription");
const MealTiming = require("../models/MealTiming");
const HostelMaster = require("../models/HostelMaster");
const PaymentQR = require("../models/PaymentQR");
const { MEAL_TYPES } = require("../utils/constants");
const { getCurrentISTTime, getISTTimeString, convertUTCToIST } = require("../utils/timezone");

/**
 * QR Code Controller for Dynamic QR Generation and Attendance Marking
 */
const qrController = {
    /**
     * Generate dynamic QR code data for user profile
     * QR code changes every 5 seconds based on timestamp
     */
    generateUserQRCode: async (req, res) => {
        try {
            const userId = req.user.id;
            const currentTime = Date.now();

            // Create 5-second time window
            const timeWindow = Math.floor(currentTime / 5000) * 5000;

            // Generate unique QR data combining user ID and time window
            const qrData = {
                userId: userId,
                timestamp: timeWindow,
                type: "meal_attendance",
            };

            // Create secure hash for QR code
            const qrString = JSON.stringify(qrData);
            const qrHash = crypto
                .createHmac(
                    "sha256",
                    process.env.JWT_SECRET || "default-secret",
                )
                .update(qrString)
                .digest("hex");

            // Final QR code payload
            const qrPayload = {
                data: Buffer.from(qrString).toString("base64"),
                hash: qrHash,
                expires: timeWindow + 5000, // 5 seconds from time window
            };

            res.json({
                message: "QR code generated successfully",
                qr_code: qrPayload,
                refresh_interval: 5000, // 5 seconds
                user_id: userId,
            });
        } catch (error) {
            console.error("Generate QR code error:", error);
            res.status(500).json({
                error: "QR Code Generation Failed",
                details: error.message,
            });
        }
    },

    /**
     * Scan QR code and mark meal attendance
     * Only accessible by mess staff
     */
    scanQRForAttendance: async (req, res) => {
        try {
            const { qr_data, qr_hash } = req.body;
            const scannerId = req.user.id;

            if (!qr_data || !qr_hash) {
                return res.status(400).json({
                    error: "Invalid QR Code",
                    details: "QR code data and hash are required",
                });
            }

            // Decode and verify QR data
            let decodedData;
            try {
                const decodedString = Buffer.from(qr_data, "base64").toString(
                    "utf8",
                );
                decodedData = JSON.parse(decodedString);
            } catch (decodeError) {
                return res.status(400).json({
                    error: "Invalid QR Code Format",
                    details: "Unable to decode QR code data",
                });
            }

            // Verify QR code hash
            const expectedHash = crypto
                .createHmac(
                    "sha256",
                    process.env.JWT_SECRET || "default-secret",
                )
                .update(JSON.stringify(decodedData))
                .digest("hex");

            if (expectedHash !== qr_hash) {
                return res.status(400).json({
                    error: "Invalid QR Code",
                    details: "QR code verification failed",
                });
            }

            // Check if QR code is expired (5 second window + 30 second grace period)
            const currentTime = Date.now();
            if (currentTime > decodedData.timestamp + 35000) {
                return res.status(400).json({
                    error: "Expired QR Code",
                    details: "QR code has expired, please refresh",
                });
            }

            const { userId, type } = decodedData;

            if (type !== "meal_attendance") {
                return res.status(400).json({
                    error: "Invalid QR Type",
                    details: "QR code is not for meal attendance",
                });
            }

            // Get user details
            const user = await User.findById(userId);

            if (!user || !user.is_active) {
                return res.status(404).json({
                    error: "User Not Found",
                    details: "User not found or inactive",
                });
            }

            // Determine current meal type based on time
            const now = new Date();
            const currentTime24 = now.toTimeString().slice(0, 8); // HH:MM:SS format

            const mealTimings = await MealTiming.getAll();
            let currentMealType = null;

            for (const timing of mealTimings) {
                if (
                    currentTime24 >= timing.start_time &&
                    currentTime24 <= timing.end_time
                ) {
                    currentMealType = timing.meal_type;
                    break;
                }
            }

            if (!currentMealType) {
                return res.status(400).json({
                    error: "No Active Meal Time",
                    details:
                        "Current time is not within any meal service hours",
                });
            }

            // Check if user has active subscription for this meal type
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const subscriptionStatus =
                await MessSubscription.checkUserSubscriptionStatus(
                    userId,
                    currentMealType,
                    today,
                );

            if (!subscriptionStatus.hasSubscription) {
                return res.status(400).json({
                    error: "No Active Subscription",
                    details: `User does not have active subscription for ${currentMealType}`,
                });
            }

            // Check if meal was confirmed for today
            const mealConfirmation = await MealConfirmation.findByUserAndDate(
                userId,
                today,
                currentMealType,
            );

            let attendanceResult;

            // Declare variables outside the if blocks to make them accessible later

            if (mealConfirmation) {
                // Update existing confirmation with attendance
                if (mealConfirmation.attended) {
                    return res.status(409).json({
                        error: "Already Attended",
                        details: `User has already attended ${currentMealType} today`,
                    });
                }

                const attendanceData = {
                    attended: true,
                    attended_at: new Date(),
                    scanner_id: scannerId,
                    scan_method: "qr_code",
                };

                await MealConfirmation.updateAttendance(
                    mealConfirmation._id,
                    attendanceData,
                );

                attendanceResult = {
                    confirmation_id: mealConfirmation._id,
                    meal_type: currentMealType,
                    meal_date: today,
                    status: "attendance_marked",
                    was_confirmed: true,
                };
            } else {
                // Create new confirmation with attendance (walk-in with subscription)
                const confirmationData = {
                    user_id: userId,
                    meal_date: today,
                    meal_type: currentMealType,
                    notes: "Walk-in attendance via QR scan",
                    meal_cost: 0, // Covered by subscription
                    attended: true,
                    attended_at: new Date(),
                    scanner_id: scannerId,
                    scan_method: "qr_code",
                    is_freeze: false,
                };

                const newConfirmation =
                    await MealConfirmation.create(confirmationData);

                attendanceResult = {
                    confirmation_id: newConfirmation._id,
                    meal_type: currentMealType,
                    meal_date: today,
                    status: "walk_in_attendance",
                    was_confirmed: false,
                };
            }

            let college_name = null;
            let course_name = null;
            let hostel_name = null;
            let semester_year = null;
            let designation = null;
            let employee_type = null;

            const user_type = user.user_type;
            const tmu_code = user.tmu_code;

            // Conditionally fetch details based on user_type by calling the static model methods
            if (user_type === "student") {
                // UPDATED: Using the static findByUserId method from the student_details model
                const studentDetails = await student_details.findByUserId(
                    user._id,
                );

                if (studentDetails) {
                    college_name = studentDetails.college_name;
                    course_name = studentDetails.course_name;
                    // Safely access nested properties using optional chaining (?.)
                    hostel_name =
                        studentDetails.hostel_details?.hostel_name || null;
                    semester_year =
                        studentDetails.academic_details?.semester || null;
                }
            }

            if (user_type === "employee") {
                // UPDATED: Using the static findByUserId method from the employee_details model
                const employeeDetails = await employee_details.findByUserId(
                    user._id,
                );

                if (employeeDetails) {
                    designation = employeeDetails.designation;
                    employee_type = employeeDetails.employee_type;
                }
            }

            // --- 2. Build the Dynamic User Object for the Response (No changes here) ---

            // Start with a base user object containing common fields
            const userResponse = {
                id: user._id,
                name: user.name,
                tmu_code: tmu_code,
                user_type: user_type,
                user_department: user.department || null,
            };

            // Add fields conditionally based on the user_type
            if (user_type === "student") {
                userResponse.college_name = college_name;
                userResponse.course_name = course_name;
                userResponse.hostel_name = hostel_name;
                userResponse.semester_year = semester_year;
            }

            if (user_type === "employee") {
                userResponse.designation = designation;
                userResponse.employee_type = employee_type;
            }

            // --- 3. Send the Final JSON Response (No changes here) ---

            // --- 3. Send the Final JSON Response ---

            res.status(200).json({
                message: `Attendance marked successfully for ${currentMealType}`,
                user: userResponse, // Use the dynamically constructed user object
                attendance: attendanceResult,
                scanned_by: scannerId,
                scanned_at: new Date(),
            });
        } catch (error) {
            console.error("QR scan error:", error);
            res.status(500).json({
                error: "QR Scan Failed",
                details: error.message,
            });
        }
    },

    /**
     * Get current meal service status and timings
     * Helps mess staff know which meal is currently being served
     */
    getCurrentMealStatus: async (req, res) => {
        try {
            const now = getCurrentISTTime();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeMinutes = currentHour * 60 + currentMinute;

            const mealTimings = await MealTiming.getAll();
            let activeMeal = null;
            let upcomingMeal = null;

            // Helper function to convert time object to minutes
            const timeToMinutes = (timeObj) => {
                return timeObj.hours * 60 + timeObj.minutes;
            };

            // Helper function to format time object to string
            const formatTime = (timeObj) => {
                return `${String(timeObj.hours).padStart(2, '0')}:${String(timeObj.minutes).padStart(2, '0')}`;
            };

            // Find active meal
            for (const timing of mealTimings) {
                const startMinutes = timeToMinutes(timing.start_time);
                const endMinutes = timeToMinutes(timing.end_time);
                
                if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
                    const remainingMinutes = endMinutes - currentTimeMinutes;
                    activeMeal = {
                        meal_type: timing.meal_type,
                        start_time: formatTime(timing.start_time),
                        end_time: formatTime(timing.end_time),
                        time_remaining: `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`,
                        cost_per_meal: timing.cost_per_meal
                    };
                    break;
                }
            }

            // Find next upcoming meal if no active meal
            if (!activeMeal) {
                const sortedTimings = mealTimings.sort((a, b) =>
                    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
                );

                for (const timing of sortedTimings) {
                    const startMinutes = timeToMinutes(timing.start_time);
                    if (currentTimeMinutes < startMinutes) {
                        const minutesUntilStart = startMinutes - currentTimeMinutes;
                        upcomingMeal = {
                            meal_type: timing.meal_type,
                            start_time: formatTime(timing.start_time),
                            end_time: formatTime(timing.end_time),
                            time_until_start: `${Math.floor(minutesUntilStart / 60)}h ${minutesUntilStart % 60}m`,
                            cost_per_meal: timing.cost_per_meal
                        };
                        break;
                    }
                }
            }

            res.json({
                message: "Meal status retrieved successfully",
                current_time: currentTime24,
                active_meal: activeMeal,
                upcoming_meal: upcomingMeal,
                all_meal_timings: mealTimings,
            });
        } catch (error) {
            console.error("Get meal status error:", error);
            res.status(500).json({
                error: "Failed to retrieve meal status",
                details: error.message,
            });
        }
    },

    // Helper method to calculate time remaining
    calculateTimeRemaining: (currentTime, endTime) => {
        const [currentHour, currentMin, currentSec] = currentTime
            .split(":")
            .map(Number);
        const [endHour, endMin, endSec] = endTime.split(":").map(Number);

        const currentSeconds =
            currentHour * 3600 + currentMin * 60 + currentSec;
        const endSeconds = endHour * 3600 + endMin * 60 + endSec;

        const remainingSeconds = endSeconds - currentSeconds;

        if (remainingSeconds <= 0) return "0 minutes";

        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
        } else {
            return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        }
    },

    // Helper method to calculate time until start
    calculateTimeUntil: (currentTime, startTime) => {
        const [currentHour, currentMin, currentSec] = currentTime
            .split(":")
            .map(Number);
        const [startHour, startMin, startSec] = startTime
            .split(":")
            .map(Number);

        const currentSeconds =
            currentHour * 3600 + currentMin * 60 + currentSec;
        const startSeconds = startHour * 3600 + startMin * 60 + startSec;

        let untilSeconds = startSeconds - currentSeconds;

        // Handle next day case
        if (untilSeconds < 0) {
            untilSeconds += 24 * 3600;
        }

        const hours = Math.floor(untilSeconds / 3600);
        const minutes = Math.floor((untilSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
        } else {
            return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        }
    },
};

module.exports = qrController;

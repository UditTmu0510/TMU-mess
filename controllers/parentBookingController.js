const { ObjectId } = require('mongodb');
const ParentBooking = require('../models/ParentBooking');
const PaymentQR = require('../models/PaymentQR');
const StudentDetail = require('../models/StudentDetail');
const HostelMaster = require('../models/HostelMaster');
const EmployeeDetail = require('../models/EmployeeDetail');
const MealTiming = require('../models/MealTiming');
const { getCurrentISTTime, getISTDateString } = require('../utils/timezone');

/**
 * Parent Booking Controller with QR Payment System
 */
const parentBookingController = {
    
    /**
     * Create parent booking with QR payment
     */
    createParentBookingWithQR: async (req, res) => {
        try {
            const { student_id, meal_date, meal_type, parent_details, notes } = req.body;
            const bookedBy = req.user.id;
            
            // Validate required fields
            if (!student_id || !meal_date || !meal_type || !parent_details) {
                return res.status(400).json({
                    error: 'Missing Required Fields',
                    details: 'Student ID, meal date, meal type, and parent details are required'
                });
            }

            // Get student details
            const studentDetail = await StudentDetail.findByUserId(student_id);
            if (!studentDetail) {
                return res.status(404).json({
                    error: 'Student Not Found',
                    details: 'Student details not found'
                });
            }

            // Validate booking staff has access to student's mess
            let staffMessName = null;
            if (req.user.user_type === 'mess_staff') {
                const staffDetail = await EmployeeDetail.findByUserId(req.user.id);
                if (!staffDetail || !staffDetail.mess_name) {
                    return res.status(400).json({
                        error: 'Staff Mess Not Configured',
                        details: 'Mess staff must be assigned to a mess'
                    });
                }
                staffMessName = staffDetail.mess_name;

                // Check if student belongs to this mess
                if (studentDetail.hostel_details && studentDetail.hostel_details.hostel_name) {
                    const studentMessName = await HostelMaster.getMessForHostel(studentDetail.hostel_details.hostel_name);
                    
                    if (studentMessName !== staffMessName) {
                        return res.status(403).json({
                            error: 'Access Denied',
                            details: 'Student is not of your mess. Student belongs to ' + studentMessName
                        });
                    }
                }
            }

            // Get meal timing and calculate cost
            const mealTiming = await MealTiming.getByMealType(meal_type);
            if (!mealTiming) {
                return res.status(404).json({
                    error: 'Meal Timing Not Found',
                    details: `Meal timing for ${meal_type} not configured`
                });
            }

            // Calculate total cost (parents count * per person cost with parent rate)
            const parentCount = parent_details.length;
            const perPersonCost = mealTiming.per_meal_cost * 1.2; // 20% markup for parents
            const totalAmount = parentCount * perPersonCost;

            // Create parent booking
            const bookingData = {
                student_id: student_id,
                meal_date: new Date(meal_date),
                meal_type: meal_type,
                parent_details: parent_details,
                per_person_cost: perPersonCost,
                total_amount: totalAmount,
                payment_status: 'pending',
                booked_by: bookedBy,
                mess_name: staffMessName,
                notes: notes || ''
            };

            const booking = await ParentBooking.create(bookingData);

            // Generate payment QR code
            const paymentQR = await PaymentQR.generatePaymentQR(
                booking._id.toString(),
                totalAmount,
                staffMessName,
                15 // 15 minutes expiry
            );

            res.status(201).json({
                message: 'Parent booking created successfully. Please complete payment via QR code.',
                booking: {
                    id: booking._id,
                    student_name: studentDetail.student_name,
                    meal_date: booking.meal_date,
                    meal_type: booking.meal_type,
                    parent_count: parentCount,
                    per_person_cost: perPersonCost,
                    total_amount: totalAmount,
                    mess_name: staffMessName
                },
                payment_qr: {
                    qr_data: paymentQR.qr_data,
                    qr_hash: paymentQR.qr_hash,
                    amount: paymentQR.amount,
                    expires_at: paymentQR.expires_at,
                    expires_in_minutes: 15
                }
            });

        } catch (error) {
            console.error('Create parent booking error:', error);
            res.status(500).json({
                error: 'Parent Booking Creation Failed',
                details: error.message
            });
        }
    },

    /**
     * Scan payment QR and confirm payment
     */
    scanPaymentQR: async (req, res) => {
        try {
            const { qr_data, qr_hash, payment_confirmed } = req.body;
            const messStaffId = req.user.id;

            if (!qr_data || !qr_hash || payment_confirmed === undefined) {
                return res.status(400).json({
                    error: 'Invalid Request',
                    details: 'QR data, hash, and payment confirmation status are required'
                });
            }

            // Validate staff has mess assignment
            const staffDetail = await EmployeeDetail.findByUserId(messStaffId);
            if (!staffDetail || !staffDetail.mess_name) {
                return res.status(400).json({
                    error: 'Staff Mess Not Configured',
                    details: 'Mess staff must be assigned to a mess'
                });
            }

            // Process payment QR scan
            const paymentResult = await PaymentQR.processPaymentScan(
                qr_data, 
                qr_hash, 
                messStaffId, 
                payment_confirmed
            );

            // Update parent booking based on payment result
            const updateData = {
                payment_status: paymentResult.payment_status,
                payment_confirmed_by: messStaffId,
                payment_confirmed_at: paymentResult.confirmed_at
            };

            if (payment_confirmed) {
                updateData.amount_collected_by = messStaffId;
                updateData.collection_timestamp = new Date();
            }

            await ParentBooking.updatePaymentStatus(
                paymentResult.booking_id, 
                paymentResult.payment_status,
                paymentResult.booking_id // payment reference
            );

            // Get booking details for response
            const booking = await ParentBooking.findById(paymentResult.booking_id);

            res.json({
                message: payment_confirmed ? 
                    'Payment confirmed and booking completed successfully' : 
                    'Payment rejected. Booking cancelled.',
                booking_id: paymentResult.booking_id,
                amount: paymentResult.amount,
                payment_status: paymentResult.payment_status,
                staff_details: {
                    staff_id: messStaffId,
                    staff_name: req.user.name,
                    mess_name: staffDetail.mess_name
                },
                booking_details: booking ? {
                    student_name: booking.student_details?.name,
                    meal_date: booking.meal_date,
                    meal_type: booking.meal_type,
                    parent_count: booking.parent_details?.length
                } : null
            });

        } catch (error) {
            console.error('Payment QR scan error:', error);
            res.status(500).json({
                error: 'Payment Processing Failed',
                details: error.message
            });
        }
    },

    /**
     * Get pending payment QRs for mess staff
     */
    getPendingPayments: async (req, res) => {
        try {
            const messStaffId = req.user.id;

            // Get staff mess assignment
            const staffDetail = await EmployeeDetail.findByUserId(messStaffId);
            if (!staffDetail || !staffDetail.mess_name) {
                return res.status(400).json({
                    error: 'Staff Mess Not Configured',
                    details: 'Mess staff must be assigned to a mess'
                });
            }

            // Get pending payments for this mess
            const pendingPayments = await PaymentQR.getPendingPaymentsForMess(staffDetail.mess_name);

            // Enrich with booking details
            const enrichedPayments = [];
            for (const payment of pendingPayments) {
                const booking = await ParentBooking.findById(payment.booking_id);
                if (booking) {
                    enrichedPayments.push({
                        payment_qr_id: payment._id,
                        booking_id: payment.booking_id,
                        amount: payment.amount,
                        expires_at: payment.expires_at,
                        booking_details: {
                            student_name: booking.student_details?.name,
                            meal_date: booking.meal_date,
                            meal_type: booking.meal_type,
                            parent_count: booking.parent_details?.length,
                            created_at: booking.created_at
                        }
                    });
                }
            }

            res.json({
                message: 'Pending payments retrieved successfully',
                mess_name: staffDetail.mess_name,
                pending_count: enrichedPayments.length,
                pending_payments: enrichedPayments
            });

        } catch (error) {
            console.error('Get pending payments error:', error);
            res.status(500).json({
                error: 'Failed to retrieve pending payments',
                details: error.message
            });
        }
    },

    /**
     * Get payment collection history for mess staff
     */
    getPaymentHistory: async (req, res) => {
        try {
            const messStaffId = req.user.id;
            const { limit = 50 } = req.query;

            const paymentHistory = await PaymentQR.getPaymentHistoryForStaff(messStaffId, parseInt(limit));

            // Enrich with booking details
            const enrichedHistory = [];
            for (const payment of paymentHistory) {
                const booking = await ParentBooking.findById(payment.booking_id);
                if (booking) {
                    enrichedHistory.push({
                        payment_date: payment.confirmed_at,
                        booking_id: payment.booking_id,
                        amount: payment.amount,
                        payment_status: payment.payment_status,
                        booking_details: {
                            student_name: booking.student_details?.name,
                            meal_date: booking.meal_date,
                            meal_type: booking.meal_type,
                            parent_count: booking.parent_details?.length
                        }
                    });
                }
            }

            res.json({
                message: 'Payment history retrieved successfully',
                staff_id: messStaffId,
                total_records: enrichedHistory.length,
                payment_history: enrichedHistory
            });

        } catch (error) {
            console.error('Get payment history error:', error);
            res.status(500).json({
                error: 'Failed to retrieve payment history',
                details: error.message
            });
        }
    }
};

module.exports = parentBookingController;
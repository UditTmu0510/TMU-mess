const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { convertToIST, getCurrentISTDate } = require('../utils/helpers');

class ParentBooking {
    constructor(data) {
        this.student_id = new ObjectId(data.student_id);
        this.meal_date = convertToIST(data.meal_date);
        this.meal_type = data.meal_type;
        this.parent_count = data.parent_count;
        this.parent_details = data.parent_details;
        this.amount = data.amount;
        this.payment = {
            status: data.payment?.status || 'pending',
            reference: data.payment?.reference || null
        };
        this.attendance = {
            attended_count: null,
            scanned_at: null,
            scanner_id: null
        };
        this.booking_notes = data.booking_notes || '';
        this.created_at = getCurrentISTDate();
    }

    static async create(data) {
        const db = getDB();
        const booking = new ParentBooking(data);
        
        const result = await db.collection('parent_bookings').insertOne(booking);
        return { ...booking, _id: result.insertedId };
    }

    static async findById(bookingId) {
        const db = getDB();
        return await db.collection('parent_bookings').findOne({
            _id: new ObjectId(bookingId)
        });
    }

    static async getStudentBookings(studentId, includeCompleted = true) {
        const db = getDB();
        const query = { student_id: new ObjectId(studentId) };
        
        if (!includeCompleted) {
            query.meal_date = { $gte: getCurrentISTDate() };
        }

        return await db.collection('parent_bookings').find(query)
            .sort({ meal_date: -1, created_at: -1 })
            .toArray();
    }

    static async getBookingsByDate(date, mealType = null) {
        const db = getDB();
        const query = { meal_date: convertToIST(date) };
        
        if (mealType) {
            query.meal_type = mealType;
        }

        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'student_details',
                    localField: 'student_id',
                    foreignField: 'user_id',
                    as: 'student_detail'
                }
            },
            {
                $addFields: {
                    student_info: { $arrayElemAt: ['$student', 0] },
                    student_detail_info: { $arrayElemAt: ['$student_detail', 0] }
                }
            },
            {
                $sort: { meal_type: 1, created_at: 1 }
            }
        ];

        return await db.collection('parent_bookings').aggregate(pipeline).toArray();
    }

    static async updatePaymentStatus(bookingId, paymentStatus, paymentReference = null) {
        const db = getDB();
        const updateData = {
            'payment.status': paymentStatus
        };

        if (paymentReference) {
            updateData['payment.reference'] = paymentReference;
        }

        const result = await db.collection('parent_bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: updateData }
        );

        return result;
    }

    static async updateAttendance(bookingId, attendedCount, scannerId = null) {
        const db = getDB();
        const updateData = {
            'attendance.attended_count': attendedCount,
            'attendance.scanned_at': getCurrentISTDate()
        };

        if (scannerId) {
            updateData['attendance.scanner_id'] = new ObjectId(scannerId);
        }

        const result = await db.collection('parent_bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: updateData }
        );

        return result;
    }

    static async createParentBooking(studentId, mealDate, mealType, parentDetails, perPersonCost, notes = '') {
        const parentCount = parentDetails.length;
        const totalAmount = parentCount * perPersonCost;

        return await this.create({
            student_id: studentId,
            meal_date: mealDate,
            meal_type: mealType,
            parent_count: parentCount,
            parent_details: parentDetails,
            amount: totalAmount,
            booking_notes: notes
        });
    }

    static async getDailyParentBookingReport(date) {
        const db = getDB();
        const targetDate = convertToIST(date);

        const pipeline = [
            {
                $match: { meal_date: targetDate }
            },
            {
                $group: {
                    _id: '$meal_type',
                    total_bookings: { $sum: 1 },
                    total_parents: { $sum: '$parent_count' },
                    total_amount: { $sum: '$amount' },
                    paid_bookings: {
                        $sum: {
                            $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0]
                        }
                    },
                    attended_bookings: {
                        $sum: {
                            $cond: [{ $ne: ['$attendance.attended_count', null] }, 1, 0]
                        }
                    },
                    total_attended_parents: {
                        $sum: {
                            $cond: [
                                { $ne: ['$attendance.attended_count', null] },
                                '$attendance.attended_count',
                                0
                            ]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ];

        return await db.collection('parent_bookings').aggregate(pipeline).toArray();
    }

    static async getPendingPayments() {
        const db = getDB();
        const pipeline = [
            {
                $match: {
                    'payment.status': 'pending',
                    meal_date: { $gte: getCurrentISTDate() }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'student_details',
                    localField: 'student_id',
                    foreignField: 'user_id',
                    as: 'student_detail'
                }
            },
            {
                $addFields: {
                    student_info: { $arrayElemAt: ['$student', 0] },
                    student_detail_info: { $arrayElemAt: ['$student_detail', 0] }
                }
            },
            {
                $sort: { meal_date: 1 }
            }
        ];

        return await db.collection('parent_bookings').aggregate(pipeline).toArray();
    }

    static async getNoShowBookings(date, mealType) {
        const db = getDB();
        const cutoffTime = getCurrentISTDate();
        cutoffTime.setHours(cutoffTime.getHours() - 2); // 2 hours after meal time

        const pipeline = [
            {
                $match: {
                    meal_date: convertToIST(date),
                    meal_type: mealType,
                    'payment.status': 'paid',
                    'attendance.attended_count': null,
                    created_at: { $lt: cutoffTime }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $addFields: {
                    student_info: { $arrayElemAt: ['$student', 0] }
                }
            }
        ];

        return await db.collection('parent_bookings').aggregate(pipeline).toArray();
    }

    static async getStudentParentBookingHistory(studentId, limit = 20) {
        const db = getDB();
        return await db.collection('parent_bookings').find({
            student_id: new ObjectId(studentId)
        })
        .sort({ meal_date: -1, created_at: -1 })
        .limit(limit)
        .toArray();
    }

    static async getMonthlyParentBookingStats(year, month) {
        const db = getDB();
        const startDate = convertToIST(new Date(year, month - 1, 1));
        const endDate = convertToIST(new Date(year, month, 1));

        const pipeline = [
            {
                $match: {
                    meal_date: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: '$meal_date' },
                        meal_type: '$meal_type'
                    },
                    booking_count: { $sum: 1 },
                    parent_count: { $sum: '$parent_count' },
                    total_amount: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.day': 1, '_id.meal_type': 1 }
            }
        ];

        return await db.collection('parent_bookings').aggregate(pipeline).toArray();
    }

    static async searchParentBookings(searchTerm, filters = {}) {
        const db = getDB();
        const matchQuery = {};

        // Date range filter
        if (filters.start_date && filters.end_date) {
            matchQuery.meal_date = {
                $gte: convertToIST(filters.start_date),
                $lte: convertToIST(filters.end_date)
            };
        }

        // Meal type filter
        if (filters.meal_type) {
            matchQuery.meal_type = filters.meal_type;
        }

        // Payment status filter
        if (filters.payment_status) {
            matchQuery['payment.status'] = filters.payment_status;
        }

        const pipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'student_details',
                    localField: 'student_id',
                    foreignField: 'user_id',
                    as: 'student_detail'
                }
            },
            {
                $addFields: {
                    student_info: { $arrayElemAt: ['$student', 0] },
                    student_detail_info: { $arrayElemAt: ['$student_detail', 0] }
                }
            }
        ];

        // Add search term matching
        if (searchTerm) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'student_info.name.first': { $regex: searchTerm, $options: 'i' } },
                        { 'student_info.name.last': { $regex: searchTerm, $options: 'i' } },
                        { 'student_info.tmu_code': { $regex: searchTerm, $options: 'i' } },
                        { 'student_detail_info.student_code': { $regex: searchTerm, $options: 'i' } },
                        { 'student_detail_info.enrollment_number': { $regex: searchTerm, $options: 'i' } },
                        { 'parent_details.name': { $regex: searchTerm, $options: 'i' } },
                        { 'parent_details.phone': { $regex: searchTerm, $options: 'i' } },
                        { 'payment.reference': { $regex: searchTerm, $options: 'i' } }
                    ]
                }
            });
        }

        pipeline.push({ $sort: { meal_date: -1, created_at: -1 } });
        pipeline.push({ $limit: 50 });

        return await db.collection('parent_bookings').aggregate(pipeline).toArray();
    }

    static async cancelBooking(bookingId, reason = '') {
        const db = getDB();
        const booking = await this.findById(bookingId);
        
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.meal_date <= getCurrentISTDate()) {
            throw new Error('Cannot cancel past bookings');
        }

        const result = await db.collection('parent_bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            {
                $set: {
                    'payment.status': booking.payment.status === 'paid' ? 'refunded' : 'cancelled',
                    cancelled_at: getCurrentISTDate(),
                    cancellation_reason: reason
                }
            }
        );

        return result;
    }

    static async validateParentDetails(parentDetails) {
        const errors = [];

        if (!Array.isArray(parentDetails) || parentDetails.length === 0) {
            errors.push('At least one parent detail is required');
            return errors;
        }

        if (parentDetails.length > 5) {
            errors.push('Maximum 5 parents allowed per booking');
        }

        parentDetails.forEach((parent, index) => {
            if (!parent.name || parent.name.trim().length < 2) {
                errors.push(`Parent ${index + 1}: Name is required and must be at least 2 characters`);
            }

            if (!parent.phone || !/^[+]?[\d\s\-\(\)]{10,15}$/.test(parent.phone)) {
                errors.push(`Parent ${index + 1}: Valid phone number is required`);
            }

            if (!parent.relation || parent.relation.trim().length < 2) {
                errors.push(`Parent ${index + 1}: Relation is required`);
            }
        });

        return errors;
    }
}

module.exports = ParentBooking;

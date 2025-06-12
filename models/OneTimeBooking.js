const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

class OneTimeBooking {
    constructor(data) {
        this.user_id = data.user_id ? new ObjectId(data.user_id) : null;
        this.booking_type = data.booking_type;
        this.meal_date = new Date(data.meal_date);
        this.meal_type = data.meal_type;
        this.guest_details = data.guest_details || null;
        this.amount = data.amount;
        this.payment = {
            status: data.payment?.status || 'pending',
            reference: data.payment?.reference || null
        };
        this.attendance = {
            attended: null,
            scanned_at: null,
            scanner_id: null
        };
        this.booking_notes = data.booking_notes || '';
        this.created_at = new Date();
    }

    static async create(data) {
        const db = getDB();
        const booking = new OneTimeBooking(data);
        
        const result = await db.collection('one_time_bookings').insertOne(booking);
        return { ...booking, _id: result.insertedId };
    }

    static async findById(bookingId) {
        const db = getDB();
        return await db.collection('one_time_bookings').findOne({
            _id: new ObjectId(bookingId)
        });
    }

    static async getUserBookings(userId, includeCompleted = true) {
        const db = getDB();
        const query = { user_id: new ObjectId(userId) };
        
        if (!includeCompleted) {
            query.meal_date = { $gte: new Date() };
        }

        return await db.collection('one_time_bookings').find(query)
            .sort({ meal_date: -1, created_at: -1 })
            .toArray();
    }

    static async getBookingsByDate(date, mealType = null) {
        const db = getDB();
        const query = { meal_date: new Date(date) };
        
        if (mealType) {
            query.meal_type = mealType;
        }

        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $addFields: {
                    user_info: { $arrayElemAt: ['$user', 0] }
                }
            },
            {
                $sort: { meal_type: 1, created_at: 1 }
            }
        ];

        return await db.collection('one_time_bookings').aggregate(pipeline).toArray();
    }

    static async updatePaymentStatus(bookingId, paymentStatus, paymentReference = null) {
        const db = getDB();
        const updateData = {
            'payment.status': paymentStatus
        };

        if (paymentReference) {
            updateData['payment.reference'] = paymentReference;
        }

        const result = await db.collection('one_time_bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: updateData }
        );

        return result;
    }

    static async updateAttendance(bookingId, attended, scannerId = null) {
        const db = getDB();
        const updateData = {
            'attendance.attended': attended,
            'attendance.scanned_at': new Date()
        };

        if (scannerId) {
            updateData['attendance.scanner_id'] = new ObjectId(scannerId);
        }

        const result = await db.collection('one_time_bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: updateData }
        );

        return result;
    }

    static async createEmployeeBooking(userId, mealDate, mealType, amount, notes = '') {
        return await this.create({
            user_id: userId,
            booking_type: 'employee',
            meal_date: mealDate,
            meal_type: mealType,
            amount: amount,
            booking_notes: notes
        });
    }

    static async createGuestBooking(guestDetails, mealDate, mealType, amount, bookedBy = null, notes = '') {
        return await this.create({
            user_id: bookedBy,
            booking_type: 'guest',
            meal_date: mealDate,
            meal_type: mealType,
            guest_details: guestDetails,
            amount: amount,
            booking_notes: notes
        });
    }

    static async getDailyBookingReport(date) {
        const db = getDB();
        const targetDate = new Date(date);

        const pipeline = [
            {
                $match: { meal_date: targetDate }
            },
            {
                $group: {
                    _id: {
                        meal_type: '$meal_type',
                        booking_type: '$booking_type'
                    },
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' },
                    paid_bookings: {
                        $sum: {
                            $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0]
                        }
                    },
                    attended_bookings: {
                        $sum: {
                            $cond: [{ $eq: ['$attendance.attended', true] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { '_id.meal_type': 1, '_id.booking_type': 1 }
            }
        ];

        return await db.collection('one_time_bookings').aggregate(pipeline).toArray();
    }

    static async getPendingPayments() {
        const db = getDB();
        return await db.collection('one_time_bookings').find({
            'payment.status': 'pending',
            meal_date: { $gte: new Date() }
        }).sort({ meal_date: 1 }).toArray();
    }

    static async getNoShowBookings(date, mealType) {
        const db = getDB();
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - 2); // 2 hours after meal time

        return await db.collection('one_time_bookings').find({
            meal_date: new Date(date),
            meal_type: mealType,
            'payment.status': 'paid',
            'attendance.attended': null,
            created_at: { $lt: cutoffTime }
        }).toArray();
    }

    static async getMonthlyBookingStats(year, month) {
        const db = getDB();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

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
                        booking_type: '$booking_type'
                    },
                    count: { $sum: 1 },
                    total_amount: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.day': 1 }
            }
        ];

        return await db.collection('one_time_bookings').aggregate(pipeline).toArray();
    }

    static async searchBookings(searchTerm, filters = {}) {
        const db = getDB();
        const query = {};

        // Date range filter
        if (filters.start_date && filters.end_date) {
            query.meal_date = {
                $gte: new Date(filters.start_date),
                $lte: new Date(filters.end_date)
            };
        }

        // Booking type filter
        if (filters.booking_type) {
            query.booking_type = filters.booking_type;
        }

        // Payment status filter
        if (filters.payment_status) {
            query['payment.status'] = filters.payment_status;
        }

        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $addFields: {
                    user_info: { $arrayElemAt: ['$user', 0] }
                }
            }
        ];

        // Add search term matching
        if (searchTerm) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'guest_details.name': { $regex: searchTerm, $options: 'i' } },
                        { 'guest_details.phone': { $regex: searchTerm, $options: 'i' } },
                        { 'user_info.name.first': { $regex: searchTerm, $options: 'i' } },
                        { 'user_info.name.last': { $regex: searchTerm, $options: 'i' } },
                        { 'user_info.tmu_code': { $regex: searchTerm, $options: 'i' } },
                        { 'payment.reference': { $regex: searchTerm, $options: 'i' } }
                    ]
                }
            });
        }

        pipeline.push({ $sort: { meal_date: -1, created_at: -1 } });
        pipeline.push({ $limit: 50 });

        return await db.collection('one_time_bookings').aggregate(pipeline).toArray();
    }

    static async cancelBooking(bookingId, reason = '') {
        const db = getDB();
        const booking = await this.findById(bookingId);
        
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.meal_date <= new Date()) {
            throw new Error('Cannot cancel past bookings');
        }

        const result = await db.collection('one_time_bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            {
                $set: {
                    'payment.status': booking.payment.status === 'paid' ? 'refunded' : 'cancelled',
                    cancelled_at: new Date(),
                    cancellation_reason: reason
                }
            }
        );

        return result;
    }
}

module.exports = OneTimeBooking;

const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { convertToIST, getCurrentISTDate } = require('../utils/helpers');

class Fine {
    constructor(data) {
        this.user_id = new ObjectId(data.user_id);
        this.fine_type = data.fine_type;
        this.amount = data.amount;
        this.reason = data.reason;
        this.related_confirmation_id = data.related_confirmation_id ? new ObjectId(data.related_confirmation_id) : null;
        this.payment = {
            is_paid: false,
            reference: null,
            paid_at: null
        };
        this.waiver = {
            is_waived: false,
            waived_by: null,
            reason: null
        };
        this.created_at = getCurrentISTDate();
    }

    static async create(data) {
        const db = getDB();
        const fine = new Fine(data);
        
        const result = await db.collection('fines').insertOne(fine);
        return { ...fine, _id: result.insertedId };
    }

    static async findById(fineId) {
        const db = getDB();
        return await db.collection('fines').findOne({ _id: new ObjectId(fineId) });
    }

    static async getUserFines(userId, status = null) {
        const db = getDB();
        const query = { user_id: new ObjectId(userId) };
        
        if (status === 'paid') {
            query['payment.is_paid'] = true;
        } else if (status === 'unpaid') {
            query['payment.is_paid'] = false;
            query['waiver.is_waived'] = false;
        } else if (status === 'waived') {
            query['waiver.is_waived'] = true;
        }

        return await db.collection('fines').find(query)
            .sort({ created_at: -1 })
            .toArray();
    }

    static async markAsPaid(fineId, paymentReference, paidBy = null) {
        const db = getDB();
        const updateData = {
            'payment.is_paid': true,
            'payment.reference': paymentReference,
            'payment.paid_at': getCurrentISTDate()
        };

        if (paidBy) {
            updateData['payment.paid_by'] = new ObjectId(paidBy);
        }

        const result = await db.collection('fines').updateOne(
            { _id: new ObjectId(fineId) },
            { $set: updateData }
        );

        return result;
    }

    static async waiveFine(fineId, waivedBy, reason) {
        const db = getDB();
        const result = await db.collection('fines').updateOne(
            { _id: new ObjectId(fineId) },
            {
                $set: {
                    'waiver.is_waived': true,
                    'waiver.waived_by': new ObjectId(waivedBy),
                    'waiver.reason': reason,
                    'waiver.waived_at': getCurrentISTDate()
                }
            }
        );

        return result;
    }

    static async getUserOutstandingFines(userId) {
        const db = getDB();
        return await db.collection('fines').find({
            user_id: new ObjectId(userId),
            'payment.is_paid': false,
            'waiver.is_waived': false
        }).toArray();
    }

    static async getTotalOutstandingAmount(userId) {
        const db = getDB();
        const pipeline = [
            {
                $match: {
                    user_id: new ObjectId(userId),
                    'payment.is_paid': false,
                    'waiver.is_waived': false
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ];

        const result = await db.collection('fines').aggregate(pipeline).toArray();
        return result.length > 0 ? result[0] : { totalAmount: 0, count: 0 };
    }

    static async createNoShowFine(userId, confirmationId, mealType, baseAmount) {
        const fineAmount = baseAmount * 1.5; // 50% penalty for no-show
        
        return await this.create({
            user_id: userId,
            fine_type: 'no_show',
            amount: fineAmount,
            reason: `No-show for ${mealType} meal`,
            related_confirmation_id: confirmationId
        });
    }

    static async createLateCancellationFine(userId, confirmationId, mealType, baseAmount) {
        const fineAmount = baseAmount * 0.5; // 50% penalty for late cancellation
        
        return await this.create({
            user_id: userId,
            fine_type: 'late_cancellation',
            amount: fineAmount,
            reason: `Late cancellation for ${mealType} meal`,
            related_confirmation_id: confirmationId
        });
    }

    static async createMultipleOffenseFine(userId, offenseCount, baseAmount = 100) {
        const fineAmount = baseAmount * offenseCount; // Escalating fine
        
        return await this.create({
            user_id: userId,
            fine_type: 'multiple_offense',
            amount: fineAmount,
            reason: `Multiple meal offenses (${offenseCount} this month)`
        });
    }

    static async getDailyFineReport(date) {
        const db = getDB();
        const startDate = convertToIST(date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const pipeline = [
            {
                $match: {
                    created_at: {
                        $gte: startDate,
                        $lt: endDate
                    }
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
            },
            {
                $group: {
                    _id: '$fine_type',
                    total_amount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    paid_count: {
                        $sum: {
                            $cond: ['$payment.is_paid', 1, 0]
                        }
                    },
                    waived_count: {
                        $sum: {
                            $cond: ['$waiver.is_waived', 1, 0]
                        }
                    }
                }
            }
        ];

        return await db.collection('fines').aggregate(pipeline).toArray();
    }

    static async getMonthlyFineStats(year, month) {
        const db = getDB();
        const startDate = convertToIST(new Date(year, month - 1, 1));
        const endDate = convertToIST(new Date(year, month, 1));

        const pipeline = [
            {
                $match: {
                    created_at: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: '$created_at' },
                        fine_type: '$fine_type'
                    },
                    total_amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.day': 1 }
            }
        ];

        return await db.collection('fines').aggregate(pipeline).toArray();
    }
}

module.exports = Fine;

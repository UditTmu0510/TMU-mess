const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

class MealConfirmation {
    constructor(data) {
        this.user_id = new ObjectId(data.user_id);
        this.meal_date = new Date(data.meal_date);
        this.meal_type = data.meal_type;
        this.confirmed_at = new Date();
        this.attended = data.attended || null;
        this.qr_scanned_at = data.qr_scanned_at || null;
        this.qr_scanner_id = data.qr_scanner_id ? new ObjectId(data.qr_scanner_id) : null;
        this.fine_applied = data.fine_applied || 0;
        this.notes = data.notes || '';
        this.created_at = new Date();
    }

    static async create(data) {
        const db = getDB();
        const confirmation = new MealConfirmation(data);
        
        const result = await db.collection('meal_confirmations').insertOne(confirmation);
        return { ...confirmation, _id: result.insertedId };
    }

    static async findByUserAndDate(userId, mealDate, mealType = null) {
        const db = getDB();
        const query = {
            user_id: new ObjectId(userId),
            meal_date: new Date(mealDate)
        };

        if (mealType) {
            query.meal_type = mealType;
        }

        if (mealType) {
            return await db.collection('meal_confirmations').findOne(query);
        } else {
            return await db.collection('meal_confirmations').find(query).toArray();
        }
    }

    static async findById(confirmationId) {
        const db = getDB();
        return await db.collection('meal_confirmations').findOne({
            _id: new ObjectId(confirmationId)
        });
    }

    static async updateAttendance(confirmationId, attendanceData) {
        const db = getDB();
        const updateData = {
            attended: attendanceData.attended,
            qr_scanned_at: attendanceData.qr_scanned_at ? new Date(attendanceData.qr_scanned_at) : null,
            qr_scanner_id: attendanceData.qr_scanner_id ? new ObjectId(attendanceData.qr_scanner_id) : null
        };

        if (attendanceData.fine_applied) {
            updateData.fine_applied = attendanceData.fine_applied;
        }

        if (attendanceData.notes) {
            updateData.notes = attendanceData.notes;
        }

        const result = await db.collection('meal_confirmations').updateOne(
            { _id: new ObjectId(confirmationId) },
            { $set: updateData }
        );

        return result;
    }

    static async getUserConfirmationsForDateRange(userId, startDate, endDate) {
        const db = getDB();
        return await db.collection('meal_confirmations').find({
            user_id: new ObjectId(userId),
            meal_date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).sort({ meal_date: 1, meal_type: 1 }).toArray();
    }

    static async getDailyConfirmationReport(date) {
        const db = getDB();
        const targetDate = new Date(date);
        
        const pipeline = [
            {
                $match: {
                    meal_date: targetDate
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
                    _id: '$meal_type',
                    total_confirmations: { $sum: 1 },
                    attended: {
                        $sum: {
                            $cond: [{ $eq: ['$attended', true] }, 1, 0]
                        }
                    },
                    not_attended: {
                        $sum: {
                            $cond: [{ $eq: ['$attended', false] }, 1, 0]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ['$attended', null] }, 1, 0]
                        }
                    },
                    total_fines: {
                        $sum: '$fine_applied'
                    },
                    confirmations: {
                        $push: {
                            user_id: '$user_id',
                            tmu_code: '$user.tmu_code',
                            name: '$user.name',
                            attended: '$attended',
                            qr_scanned_at: '$qr_scanned_at',
                            fine_applied: '$fine_applied'
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ];

        return await db.collection('meal_confirmations').aggregate(pipeline).toArray();
    }

    static async getNoShowUsers(date, mealType) {
        const db = getDB();
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - 2); // 2 hours after meal time
        
        return await db.collection('meal_confirmations').find({
            meal_date: new Date(date),
            meal_type: mealType,
            attended: null,
            confirmed_at: { $lt: cutoffTime }
        }).toArray();
    }

    static async getUserMealHistory(userId, limit = 50) {
        const db = getDB();
        return await db.collection('meal_confirmations').find({
            user_id: new ObjectId(userId)
        })
        .sort({ meal_date: -1, confirmed_at: -1 })
        .limit(limit)
        .toArray();
    }

    static async deleteConfirmation(confirmationId) {
        const db = getDB();
        return await db.collection('meal_confirmations').deleteOne({
            _id: new ObjectId(confirmationId)
        });
    }

    static async getWeeklyStats(userId, startDate) {
        const db = getDB();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);

        const pipeline = [
            {
                $match: {
                    user_id: new ObjectId(userId),
                    meal_date: {
                        $gte: new Date(startDate),
                        $lt: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        meal_type: '$meal_type',
                        attended: '$attended'
                    },
                    count: { $sum: 1 },
                    total_fines: { $sum: '$fine_applied' }
                }
            },
            {
                $group: {
                    _id: '$_id.meal_type',
                    stats: {
                        $push: {
                            status: '$_id.attended',
                            count: '$count',
                            fines: '$total_fines'
                        }
                    }
                }
            }
        ];

        return await db.collection('meal_confirmations').aggregate(pipeline).toArray();
    }
}

module.exports = MealConfirmation;

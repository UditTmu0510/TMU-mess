const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { convertToIST, getCurrentISTDate } = require('../utils/helpers');

class MealConfirmation {

    
    constructor(data) {
        this.user_id = new ObjectId(data.user_id);
        this.meal_date = convertToIST(data.meal_date);
        this.meal_type = data.meal_type;
        this.confirmed_at = getCurrentISTDate();
        this.attended = data.attended || null;
        this.qr_scanned_at = data.qr_scanned_at ? convertToIST(data.qr_scanned_at) : null;
        this.qr_scanner_id = data.qr_scanner_id ? new ObjectId(data.qr_scanner_id) : null;
        this.fine_applied = data.fine_applied || 0;
        this.notes = data.notes || '';
        this.created_at = getCurrentISTDate();
    }

    static async create(data) {
        const db = getDB();
        const confirmation = new MealConfirmation(data);
        
        const result = await db.collection('meal_confirmations').insertOne(confirmation);
        return { ...confirmation, _id: result.insertedId };
    }

    // static async findByUserAndDate(userId, mealDate, mealType = null) {
    //     const db = getDB();
    //     const query = {
    //         user_id: new ObjectId(userId),
    //         meal_date: new Date(mealDate)
    //     };

    //     if (mealType) {
    //         query.meal_type = mealType;
    //     }

    //     if (mealType) {
    //         return await db.collection('meal_confirmations').findOne(query);
    //     } else {
    //         return await db.collection('meal_confirmations').find(query).toArray();
    //     }
    // }


    // Inside your MealConfirmation Model (e.g., mealConfirmation.model.js)


static async findByUserAndDate(userId, mealDate, mealType = null) {
    const db = getDB();

    const inputDate = convertToIST(mealDate);
    const startOfDay = new Date(inputDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(inputDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query = {
        user_id: new ObjectId(userId),
        meal_date: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    };

    if (mealType) {
        query.meal_type = mealType;
    }

    const mealTimings = await db.collection('meal_timings').find({}).sort({ start_time: 1 }).toArray();

    const confirmations = await db.collection('meal_confirmations').find(query).toArray();
    const confirmationsMap = new Map(confirmations.map(c => [c.meal_type, c]));

    const now = convertToIST(new Date());

    let stopAttendedCheck = false;

    const modifiedMeals = mealTimings.map(timing => {
        const confirmation = confirmationsMap.get(timing.meal_type);
        let meal_status = confirmation ? (confirmation.is_freeze ? 'Frozen' : 'Confirmed') : 'Not Confirmed';

        const [endHour, endMinute] = timing.end_time.split(':').map(Number);
        const mealEndTime = new Date(inputDate);
        mealEndTime.setHours(endHour, endMinute, 0, 0);

        if (!stopAttendedCheck) {
            if (now > mealEndTime) {
          
                if (confirmation) {
                    if (confirmation.attended) {
                        meal_status = 'Attended';
                    } else {
                        meal_status = 'Unattended';
                    }
                }
            } else {
              
                stopAttendedCheck = true;
            }
        }

        return {
            ...timing,
            ...confirmation,
            meal_status: meal_status
        };
    });

    if (mealType) {
        return modifiedMeals.find(m => m.meal_type === mealType) || null;
    }

    return modifiedMeals;
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
            qr_scanned_at: attendanceData.qr_scanned_at ? convertToIST(attendanceData.qr_scanned_at) : null,
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
                $gte: convertToIST(startDate),
                $lte: convertToIST(endDate)
            }
        }).sort({ meal_date: 1, meal_type: 1 }).toArray();
    }

     static async updateConfirmationById(confirmationId, updateFields) {
        const db = getDB();
        
        // Convert confirmationId to ObjectId if it's a string
        const objConfirmationId = typeof confirmationId === 'string' ? new ObjectId(confirmationId) : confirmationId;

        // Prepare the fields to set in the document
        const $set = {};

        // Explicitly map allowed update fields based on your schema
        // and ensure correct data types where necessary
        if (updateFields.confirmed_at !== undefined) {
            $set.confirmed_at = convertToIST(updateFields.confirmed_at);
        }
        if (updateFields.notes !== undefined) {
            $set.notes = updateFields.notes;
        }
        if (updateFields.is_freeze !== undefined) {
            $set.is_freeze = Boolean(updateFields.is_freeze);
        }
        // Fields related to attendance (if updated separately from initial confirmation)
        if (updateFields.attended !== undefined) {
            $set.attended = Boolean(updateFields.attended);
        }
        if (updateFields.qr_scanned_at !== undefined) {
            $set.qr_scanned_at = updateFields.qr_scanned_at ? convertToIST(updateFields.qr_scanned_at) : null;
        }
        if (updateFields.qr_scanner_id !== undefined) {
            $set.qr_scanner_id = updateFields.qr_scanner_id ? new ObjectId(updateFields.qr_scanner_id) : null;
        }
        if (updateFields.fine_applied !== undefined) {
            $set.fine_applied = Number(updateFields.fine_applied);
        }

        // Add or update 'updated_at' if it's a field you manage manually and want it updated on any change
        // If your schema uses Mongoose `timestamps: true`, it handles `updatedAt` automatically and you can omit this.
        // Based on your schema, it doesn't explicitly show a separate 'updated_at' field besides 'created_at' and 'confirmed_at'.
        // If 'confirmed_at' serves as your last update timestamp for confirmation, then the controller's logic updating `confirmed_at` is sufficient.
        // If you truly have a separate 'updated_at', you would add:
        // $set.updated_at = new Date(); // Or if updateFields.updated_at is provided

        const result = await db.collection('meal_confirmations').updateOne(
            { _id: objConfirmationId },
            { $set: $set }
        );

        return result; // Returns { acknowledged: true, matchedCount: 1, modifiedCount: 1, ... }
    }

    static async getDailyConfirmationReport(date) { 
    const db = getDB();
    const targetDate = new Date(date);

    const pipeline = [
        {
            $match: {
                meal_date: targetDate // Now this will correctly find the records
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
        const cutoffTime = getCurrentISTDate();
        cutoffTime.setHours(cutoffTime.getHours() - 2); // 2 hours after meal time
        
        return await db.collection('meal_confirmations').find({
            meal_date: convertToIST(date),
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
                        $gte: convertToIST(startDate),
                        $lt: convertToIST(endDate)
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

    static async findAllConfirmationsByDateAndMeal(date, mealType) {
        const db = getDB();
        const targetDate = convertToIST(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const query = {
            meal_date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            meal_type: mealType
        };

        return await db.collection('meal_confirmations').find(query).toArray();
    }
}

module.exports = MealConfirmation;

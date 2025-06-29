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


static async findByUserAndDate(userId, mealDate, mealType = null, returnConfirmationsOnly = false) {
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
    
  if (returnConfirmationsOnly) {
   if (mealType) {
        query.meal_type = mealType;
        // When mealType is provided, we expect a single confirmation, so findOne is appropriate
        return await db.collection('meal_confirmations').findOne(query);
    } else {
        // When mealType is not provided, we want all confirmations for the user on that date
        return await db.collection('meal_confirmations').find(query).toArray();
    }

}


    if (mealType) {
        query.meal_type = mealType;
    }

    // First, get the confirmations since they might be all we need.
    const confirmations = await db.collection('meal_confirmations').find(query).toArray();
  
    // **NEW LOGIC**: If the flag is true, return confirmations immediately.
    // This is efficient because it skips all the subsequent processing.
  

    // The rest of the function remains the same for the default behavior.
    const mealTimings = await db.collection('meal_timings').find({}).sort({ start_time: 1 }).toArray();
    const confirmationsMap = new Map(confirmations.map(c => [c.meal_type, c]));
    const now = convertToIST(new Date());
    const now_new = new Date(now);

    const modifiedMeals = mealTimings.map(timing => {
        const confirmation = confirmationsMap.get(timing.meal_type);
        let meal_status = confirmation ? 'Confirmed' : 'Not Confirmed';

        const mealEndTime = new Date(now_new); 
        const [hours, minutes, seconds] = timing.end_time.split(':');
        mealEndTime.setUTCHours(hours, minutes, seconds, 0);

        if (now_new > mealEndTime) {
            if (confirmation) {
                meal_status = confirmation.attended ? 'Attended' : 'Unattended';
            } else {
                meal_status = 'Not Confirmed';
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
        const now = new Date();

        // 1. Fetch meal schedule to determine the day's meal order and timings.
        const mealTimings = await db.collection('meal_timings').find({ is_active: true }).sort({ start_time: 1 }).toArray();
        if (mealTimings.length === 0) {
            return []; // Return empty if no schedule is found
        }
        
        const lastMeal = mealTimings[mealTimings.length - 1];
        const lastMealStartTime = parseInt(lastMeal.start_time.split(':')[0]) * 60 + parseInt(lastMeal.start_time.split(':')[1]);
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // 2. Check if the condition is met: is the current time after the start of the day's last meal?
        const isAfterLastMeal = currentTime >= lastMealStartTime;

        let finalReport = [];

        if (isAfterLastMeal) {
            // --- CONDITION MET: Run special logic with two separate queries ---

            // Query 1: Get all meals EXCEPT breakfast for the requested date.
            const todayMeals = mealTimings.slice(1).map(meal => meal.meal_type); // Get all meal types except the first one (breakfast)
            const startDate = new Date(`${date}T00:00:00.000Z`);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1);

            const nonBreakfastPipeline = this.buildPipeline({ $gte: startDate, $lt: endDate }, todayMeals);
            const nonBreakfastReport = await db.collection('meal_confirmations').aggregate(nonBreakfastPipeline).toArray();

            // Query 2: Get ONLY breakfast for the NEXT day.
            const nextDay = new Date(startDate);
            nextDay.setDate(startDate.getDate() + 1);
            const nextDayEndDate = new Date(nextDay);
            nextDayEndDate.setDate(nextDay.getDate() + 1);
            
            const breakfastPipeline = this.buildPipeline({ $gte: nextDay, $lt: nextDayEndDate }, ["breakfast"]);
            const breakfastReport = await db.collection('meal_confirmations').aggregate(breakfastPipeline).toArray();

            // Combine the results
            finalReport = [...nonBreakfastReport, ...breakfastReport].sort((a, b) => {
                const order = mealTimings.map(m => m.meal_type);
                return order.indexOf(a._id) - order.indexOf(b._id);
            });

        } else {
            // --- CONDITION NOT MET: Run normal logic for the entire requested day ---
            const startDate = new Date(`${date}T00:00:00.000Z`);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1);

            const fullDayPipeline = this.buildPipeline({ $gte: startDate, $lt: endDate });
            finalReport = await db.collection('meal_confirmations').aggregate(fullDayPipeline).toArray();
        }

        return finalReport;
    }


     static buildPipeline(dateRange, mealTypes = null) {
        const matchStage = {
            meal_date: dateRange
        };

        if (mealTypes) {
            matchStage.meal_type = { $in: mealTypes };
        }

        return [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $group: {
                    _id: '$meal_type',
                    total_confirmations: { $sum: 1 },
                    attended: { $sum: { $cond: [{ $eq: ['$attended', true] }, 1, 0] } },
                    not_attended: { $sum: { $cond: [{ $eq: ['$attended', false] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$attended', null] }, 1, 0] } },
                    total_fines: { $sum: '$fine_applied' },
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
            { $sort: { _id: 1 } }
        ];
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

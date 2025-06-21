const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { convertToIST, getCurrentISTDate } = require('../utils/helpers');

class MealTiming {
    constructor(data) {
        // If an _id is provided (e.g., when retrieving from DB), use it.
        // Otherwise, MongoDB will generate a new ObjectId on insert.
        if (data._id) {
            this._id = new ObjectId(data._id);
        }
        
        // meal_type is now a distinct field, consistent with your JSON data
        this.meal_type = data.meal_type; 
        this.start_time = data.start_time;
        this.end_time = data.end_time;
        this.confirmation_deadline_hours = data.confirmation_deadline_hours;
        this.confirmation_deadline_description = data.confirmation_deadline_description;
        this.per_meal_cost = data.per_meal_cost;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.updated_at = getCurrentISTDate();
        this.updated_by = data.updated_by ? new ObjectId(data.updated_by) : null;
    }

    static async getAll() {
        const db = getDB();
        return await db.collection('meal_timings').find({ is_active: true }).toArray();
    }

    static async getByMealType(mealType) {
        const db = getDB();
        // CORRECTED: Query by 'meal_type' field, not '_id'
        return await db.collection('meal_timings').findOne({ meal_type: mealType, is_active: true });
    }

    static async create(data) {
        const db = getDB();
        const mealTiming = new MealTiming(data);
        
        // MongoDB will automatically add an _id if one isn't explicitly set in the constructor/data
        const result = await db.collection('meal_timings').insertOne(mealTiming);
        return { ...mealTiming, _id: result.insertedId }; // Return with the newly generated _id
    }

    static async update(mealType, updateData, updatedBy) {
        const db = getDB();
        updateData.updated_at = getCurrentISTDate();
        updateData.updated_by = new ObjectId(updatedBy);
        
        // CORRECTED: Query by 'meal_type' field to find the document to update
        const result = await db.collection('meal_timings').updateOne(
            { meal_type: mealType }, // Find by meal_type
            { $set: updateData }
        );
        return result;
    }

    static async checkConfirmationDeadline(mealType, targetDate) {
        // This method was already passing 'mealType' correctly.
        // The fix is in getByMealType method above.
        const mealTiming = await this.getByMealType(mealType);
        if (!mealTiming) {
            throw new Error('Meal timing not found');
        }

        const now = getCurrentISTDate();
        const mealDateTime = convertToIST(targetDate);
        
        // Parse meal start time and set it on the meal date
        const [hours, minutes, seconds] = mealTiming.start_time.split(':');
        mealDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
        
        // Calculate deadline
        const deadlineDateTime = new Date(mealDateTime.getTime() - 
            (mealTiming.confirmation_deadline_hours * 60 * 60 * 1000));
        
        return {
            canConfirm: now <= deadlineDateTime,
            deadline: deadlineDateTime,
            mealTime: mealDateTime,
            hoursBeforeMeal: mealTiming.confirmation_deadline_hours
        };
    }

    static async getActiveMealTypesWithCosts() {
        const db = getDB();
        const mealTimings = await db.collection('meal_timings')
            .find({ is_active: true })
            // CORRECTED: Project 'meal_type' as _id in the result for consistency if you iterate by _id later
            .project({ _id: 0, meal_type: "$meal_type", per_meal_cost: 1, start_time: 1, end_time: 1 })
            .toArray();
        
        // The reduce function should now correctly use meal.meal_type as the key
        return mealTimings.reduce((acc, meal) => {
            acc[meal.meal_type] = { // Use meal.meal_type here
                cost: meal.per_meal_cost,
                start_time: meal.start_time,
                end_time: meal.end_time
            };
            return acc;
        }, {});
    }

    static async initializeDefaultMealTimings() {
        const db = getDB();
        const existingCount = await db.collection('meal_timings').countDocuments();
        
        if (existingCount === 0) {
            const defaultMealTimings = [
                {
                    // No _id here; MongoDB will generate ObjectId automatically
                    meal_type: 'breakfast', // Use meal_type field
                    start_time: '07:00:00',
                    end_time: '09:00:00',
                    confirmation_deadline_hours: 12,
                    confirmation_deadline_description: 'Confirm by 7 PM previous day',
                    per_meal_cost: 25.00,
                    is_active: true,
                    updated_at: getCurrentISTDate(),
                    updated_by: null
                },
                {
                    meal_type: 'lunch', // Use meal_type field
                    start_time: '12:00:00',
                    end_time: '14:00:00',
                    confirmation_deadline_hours: 2,
                    confirmation_deadline_description: 'Confirm by 10 AM same day',
                    per_meal_cost: 50.00,
                    is_active: true,
                    updated_at: getCurrentISTDate(),
                    updated_by: null
                },
                {
                    meal_type: 'snacks', // Use meal_type field
                    start_time: '16:00:00',
                    end_time: '17:30:00',
                    confirmation_deadline_hours: 1,
                    confirmation_deadline_description: 'Confirm by 3 PM same day',
                    per_meal_cost: 20.00,
                    is_active: true,
                    updated_at: getCurrentISTDate(),
                    updated_by: null
                },
                {
                    meal_type: 'dinner', // Use meal_type field
                    start_time: '19:00:00',
                    end_time: '21:00:00',
                    confirmation_deadline_hours: 4,
                    confirmation_deadline_description: 'Confirm by 3 PM same day',
                    per_meal_cost: 60.00,
                    is_active: true,
                    updated_at: getCurrentISTDate(),
                    updated_by: null
                }
            ];

            await db.collection('meal_timings').insertMany(defaultMealTimings);
            console.log('✅ Default meal timings initialized');
        }
    }
}

module.exports = MealTiming;

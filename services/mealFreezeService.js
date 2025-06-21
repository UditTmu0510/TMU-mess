const MealConfirmation = require('../models/MealConfirmation');
const MealTiming = require('../models/MealTiming');
const { getCurrentISTTime, calculateMealDeadlineIST, getISTStartOfDay } = require('../utils/timezone');

/**
 * Service to automatically freeze meals based on confirmation deadlines
 */
class MealFreezeService {
    
    /**
     * Check and freeze meals that have passed their confirmation deadline
     */
    static async freezeExpiredMeals() {
        try {
            console.log('🔄 Starting automatic meal freeze process...');
            
            const currentISTTime = getCurrentISTTime();
            const todayIST = getISTStartOfDay();
            
            // Get all meal timings
            const mealTimings = await MealTiming.getAll();
            
            let totalFrozen = 0;
            
            for (const timing of mealTimings) {
                const mealType = timing.meal_type;
                const deadlineHours = timing.confirmation_deadline_hours;
                
                // Calculate deadline for today's meal
                const mealDeadlineIST = calculateMealDeadlineIST(
                    todayIST, 
                    timing.start_time, 
                    deadlineHours
                );
                
                // Check if deadline has passed
                if (currentISTTime > mealDeadlineIST) {
                    const frozenCount = await this.freezeMealType(mealType, todayIST);
                    totalFrozen += frozenCount;
                    
                    console.log(`✅ Frozen ${frozenCount} ${mealType} confirmations for today`);
                }
            }
            
            console.log(`🔒 Total meals frozen: ${totalFrozen}`);
            return totalFrozen;
            
        } catch (error) {
            console.error('❌ Error in meal freeze service:', error);
            throw error;
        }
    }
    
    /**
     * Freeze specific meal type for a specific date
     */
    static async freezeMealType(mealType, mealDate) {
        try {
            const { db } = await require('../config/database').connectDB();
            
            // Update all confirmations for this meal type and date to frozen
            const result = await db.collection('meal_confirmations').updateMany(
                {
                    meal_type: mealType,
                    meal_date: {
                        $gte: mealDate,
                        $lt: new Date(mealDate.getTime() + 24 * 60 * 60 * 1000) // Next day
                    },
                    is_freeze: { $ne: true } // Only freeze non-frozen meals
                },
                {
                    $set: {
                        is_freeze: true,
                        frozen_at: new Date(),
                        freeze_reason: 'automatic_deadline_freeze'
                    }
                }
            );
            
            return result.modifiedCount;
            
        } catch (error) {
            console.error(`❌ Error freezing ${mealType} meals:`, error);
            throw error;
        }
    }
    
    /**
     * Manual freeze for specific meal
     */
    static async manualFreezeMeal(mealType, mealDate, freezeReason = 'manual_freeze', frozenBy = null) {
        try {
            const { db } = await require('../config/database').connectDB();
            
            const result = await db.collection('meal_confirmations').updateMany(
                {
                    meal_type: mealType,
                    meal_date: {
                        $gte: mealDate,
                        $lt: new Date(mealDate.getTime() + 24 * 60 * 60 * 1000)
                    },
                    is_freeze: { $ne: true }
                },
                {
                    $set: {
                        is_freeze: true,
                        frozen_at: new Date(),
                        freeze_reason: freezeReason,
                        frozen_by: frozenBy
                    }
                }
            );
            
            return result.modifiedCount;
            
        } catch (error) {
            console.error(`❌ Error manually freezing ${mealType} meals:`, error);
            throw error;
        }
    }
    
    /**
     * Start automatic freeze scheduler
     */
    static startFreezeScheduler() {
        console.log('🚀 Starting meal freeze scheduler...');
        
        // Run every 5 minutes
        setInterval(async () => {
            try {
                await this.freezeExpiredMeals();
            } catch (error) {
                console.error('❌ Scheduled freeze failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        // Initial run
        setTimeout(async () => {
            try {
                await this.freezeExpiredMeals();
            } catch (error) {
                console.error('❌ Initial freeze failed:', error);
            }
        }, 10000); // 10 seconds after startup
    }
}

module.exports = MealFreezeService;
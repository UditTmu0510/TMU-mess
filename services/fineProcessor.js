const User = require('../models/User');
const Fine = require('../models/Fine');
const MealConfirmation = require('../models/MealConfirmation');
const MealTiming = require('../models/MealTiming');
const { getCurrentISTDate } = require('../utils/helpers');

const fineProcessor = {
    async processFinesForMeal(mealType) {
        try {
            const today = getCurrentISTDate();
            const confirmations = await MealConfirmation.findAllConfirmationsByDateAndMeal(today, mealType);

            for (const confirmation of confirmations) {
                const user = await User.findById(confirmation.user_id);

                if (user && user.user_type === 'student') {
                    const isNoShow = !confirmation.attended;
                    const isUnconfirmedWalkIn = confirmation.attended && confirmation.notes.includes('Walk-in');

                    if (isNoShow || isUnconfirmedWalkIn) {
                        const offenseCount = await User.logMessOffense(user._id);

                        if (offenseCount > 3) {
                            const mealTimings = await MealTiming.getAll();
                            const meal = mealTimings.find(m => m.meal_type === mealType);
                            const mealCost = meal.per_meal_cost ? meal.per_meal_cost : 0;

                            if (mealCost > 0) {
                                await Fine.createMessOffenseFine(user._id, confirmation._id, mealType, mealCost);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing fines for ${mealType}:`, error);
        }
    }
};

module.exports = fineProcessor;

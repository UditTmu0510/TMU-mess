const cron = require('node-cron');
const MealTiming = require('../models/MealTiming');
const fineProcessor = require('./fineProcessor');

const scheduler = {
    init() {
        MealTiming.getAll()
            .then(mealTimings => {
                mealTimings.forEach(meal => {
                    const [hour, minute] = meal.end_time.split(':');
                    
                    // Create a date object and add 30 minutes
                    const runTime = new Date();
                    runTime.setHours(parseInt(hour));
                    runTime.setMinutes(parseInt(minute) + 30);

                    const runHour = runTime.getHours();
                    const runMinute = runTime.getMinutes();

                    const cronTime = `${runMinute} ${runHour} * * *`;

                    cron.schedule(cronTime, () => {
                        console.log(`Running fine processor for ${meal.meal_type}`);
                        fineProcessor.processFinesForMeal(meal.meal_type);
                    }, {
                        scheduled: true,
                        timezone: "Asia/Kolkata"
                    });

                    console.log(`Scheduled fine processor for ${meal.meal_type} at ${runHour}:${runMinute}`);
                });
            })
            .catch(error => {
                console.error('Error initializing scheduler:', error);
            });
    }
};

module.exports = scheduler;

const cron = require('node-cron');
const MealTiming = require('../models/MealTiming');
const fineProcessor = require('./fineProcessor');
const { format } = require('date-fns');
const { addMinutes } = require('date-fns');

const scheduler = {
    init() {
        MealTiming.getAll()
            .then(mealTimings => {
                mealTimings.forEach(meal => {
                    const [hour, minute] = meal.end_time.split(':');
                    
                    // Create a date object in IST
                    const now = new Date();
                    now.setHours(parseInt(hour, 10));
                    now.setMinutes(parseInt(minute, 10));
                    
                    // Add 30 minutes
                    const runTime = addMinutes(now, 30);

                    const runHour = format(runTime, 'HH');
                    const runMinute = format(runTime, 'mm');

                    const cronTime = `${runMinute} ${runHour} * * *`;

                    cron.schedule(cronTime, () => {
                        console.log(`Running fine processor for ${meal.meal_type}`);
                        fineProcessor.processFinesForMeal(meal.meal_type);
                    }, {
                        scheduled: true,
                        timezone: "Asia/Kolkata"
                    });

                    console.log(`Scheduled fine processor for ${meal.meal_type} at ${runHour}:${runMinute} IST`);
                });
            })
            .catch(error => {
                console.error('Error initializing scheduler:', error);
            });
    }
};

module.exports = scheduler;

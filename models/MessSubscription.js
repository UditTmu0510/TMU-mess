const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { convertToIST, getCurrentISTDate } = require('../utils/helpers');

class MessSubscription {
    constructor(data) {
        this.user_id = new ObjectId(data.user_id);
        this.subscription_type = data.subscription_type;
        this.meal_types = data.meal_types;
        this.monthly_cost = data.monthly_cost;
        this.start_date = convertToIST(data.start_date);
        this.end_date = convertToIST(data.end_date);
        this.status = data.status || 'active';
        this.payment_reference = data.payment_reference || null;
        this.created_at = getCurrentISTDate();
    }

    static async create(data) {
        const db = getDB();
        const subscription = new MessSubscription(data);
        
        const result = await db.collection('mess_subscriptions').insertOne(subscription);
        return { ...subscription, _id: result.insertedId };
    }

    static async findById(subscriptionId) {
        const db = getDB();
        return await db.collection('mess_subscriptions').findOne({
            _id: new ObjectId(subscriptionId)
        });
    }

    static async findActiveByUserId(userId) {
        const db = getDB();
        const now = getCurrentISTDate();
        
        return await db.collection('mess_subscriptions').findOne({
            user_id: new ObjectId(userId),
            status: 'active',
            start_date: { $lte: now },
            end_date: { $gte: now }
        });
    }

    static async getUserSubscriptions(userId, includeExpired = false) {
        const db = getDB();
        const query = { user_id: new ObjectId(userId) };
        
        if (!includeExpired) {
            query.status = { $ne: 'expired' };
        }

        return await db.collection('mess_subscriptions').find(query)
            .sort({ created_at: -1 })
            .toArray();
    }

    static async updateStatus(subscriptionId, status) {
        const db = getDB();
        const result = await db.collection('mess_subscriptions').updateOne(
            { _id: new ObjectId(subscriptionId) },
            { $set: { status: status } }
        );
        return result;
    }

    static async renewSubscription(subscriptionId, newEndDate, paymentReference) {
        const db = getDB();
        const result = await db.collection('mess_subscriptions').updateOne(
            { _id: new ObjectId(subscriptionId) },
            {
                $set: {
                    end_date: convertToIST(newEndDate),
                    status: 'active',
                    payment_reference: paymentReference,
                    renewed_at: getCurrentISTDate()
                }
            }
        );
        return result;
    }

    static async checkUserSubscriptionStatus(userId, mealType, date) {
        const subscription = await this.findActiveByUserId(userId);
        
        if (!subscription) {
            return { hasSubscription: false, message: 'No active subscription found' };
        }

        const targetDate = convertToIST(date);
        if (targetDate < subscription.start_date || targetDate > subscription.end_date) {
            return { hasSubscription: false, message: 'Date outside subscription period' };
        }

        if (!subscription.meal_types.includes(mealType)) {
            return { hasSubscription: false, message: 'Meal type not included in subscription' };
        }

        return {
            hasSubscription: true,
            subscription: subscription,
            message: 'Valid subscription found'
        };
    }

    static async getExpiringSubscriptions(daysBeforeExpiry = 7) {
        const db = getDB();
        const futureDate = getCurrentISTDate();
        futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);

        return await db.collection('mess_subscriptions').find({
            status: 'active',
            end_date: {
                $gte: getCurrentISTDate(),
                $lte: futureDate
            }
        }).toArray();
    }

    static async expireOldSubscriptions() {
        const db = getDB();
        const now = getCurrentISTDate();
        
        const result = await db.collection('mess_subscriptions').updateMany(
            {
                status: 'active',
                end_date: { $lt: now }
            },
            {
                $set: { status: 'expired' }
            }
        );

        return result;
    }

    static async getSubscriptionStats() {
        const db = getDB();
        
        const pipeline = [
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    total_revenue: { $sum: '$monthly_cost' }
                }
            }
        ];

        const statusStats = await db.collection('mess_subscriptions').aggregate(pipeline).toArray();

        const typeStats = await db.collection('mess_subscriptions').aggregate([
            {
                $match: { status: 'active' }
            },
            {
                $group: {
                    _id: '$subscription_type',
                    count: { $sum: 1 },
                    total_revenue: { $sum: '$monthly_cost' }
                }
            }
        ]).toArray();

        return {
            by_status: statusStats,
            by_type: typeStats
        };
    }

    static async createHostelStudentSubscription(userId, mealTypes, startDate, endDate) {
        // Calculate monthly cost based on meal types
        const baseCosts = {
            'breakfast': 750,  // 25 * 30 days
            'lunch': 1500,     // 50 * 30 days
            'snacks': 600,     // 20 * 30 days
            'dinner': 1800     // 60 * 30 days
        };

        const monthlyCost = mealTypes.reduce((total, mealType) => {
            return total + (baseCosts[mealType] || 0);
        }, 0);

        return await this.create({
            user_id: userId,
            subscription_type: 'hostel_student',
            meal_types: mealTypes,
            monthly_cost: monthlyCost,
            start_date: startDate,
            end_date: endDate
        });
    }

    static async createEmployeeSubscription(userId, mealTypes, startDate, endDate) {
        // Employee rates (slightly higher than student rates)
        const baseCosts = {
            'breakfast': 900,   // 30 * 30 days
            'lunch': 1800,      // 60 * 30 days
            'snacks': 750,      // 25 * 30 days
            'dinner': 2100      // 70 * 30 days
        };

        const monthlyCost = mealTypes.reduce((total, mealType) => {
            return total + (baseCosts[mealType] || 0);
        }, 0);

        return await this.create({
            user_id: userId,
            subscription_type: 'employee_monthly',
            meal_types: mealTypes,
            monthly_cost: monthlyCost,
            start_date: startDate,
            end_date: endDate
        });
    }

    static async getMonthlyRevenue(year, month) {
        const db = getDB();
        const startDate = convertToIST(new Date(year, month - 1, 1));
        const endDate = convertToIST(new Date(year, month, 1));

        const pipeline = [
            {
                $match: {
                    status: 'active',
                    $or: [
                        {
                            start_date: {
                                $gte: startDate,
                                $lt: endDate
                            }
                        },
                        {
                            $and: [
                                { start_date: { $lte: startDate } },
                                { end_date: { $gte: startDate } }
                            ]
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    total_revenue: { $sum: '$monthly_cost' },
                    subscription_count: { $sum: 1 }
                }
            }
        ];

        const result = await db.collection('mess_subscriptions').aggregate(pipeline).toArray();
        return result.length > 0 ? result[0] : { total_revenue: 0, subscription_count: 0 };
    }
}

module.exports = MessSubscription;

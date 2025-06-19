const { MongoClient } = require('mongodb');

let db = null;
let client = null;

const connectDB = async () => {
    try {
        const MONGODB_URI = 'mongodb://localhost:27017/tmu_app';
        
        client = new MongoClient(MONGODB_URI, {
            useUnifiedTopology: true,
        });

        await client.connect();
        db = client.db();
        
        console.log('✅ MongoDB connected successfully');
        
        // Create indexes if they don't exist
        await createIndexes();
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
};

const createIndexes = async () => {
    try {
        // Users collection indexes
        await db.collection('users').createIndex({ tmu_code: 1 }, { unique: true });
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ student_code: 1 }, { unique: true, sparse: true });
        await db.collection('users').createIndex({ user_type: 1 });

        // Meal confirmations indexes
        await db.collection('meal_confirmations').createIndex(
            { user_id: 1, meal_date: 1, meal_type: 1 }, 
            { unique: true }
        );
        await db.collection('meal_confirmations').createIndex({ meal_date: 1 });

        // Fines indexes
        await db.collection('fines').createIndex({ user_id: 1, 'payment.is_paid': 1 });
        await db.collection('fines').createIndex({ created_at: 1 });

        // Student details indexes
        await db.collection('student_details').createIndex({ student_code: 1 }, { unique: true });
        await db.collection('student_details').createIndex({ enrollment_number: 1 }, { unique: true });

        // Employee details indexes
        await db.collection('employee_details').createIndex({ employee_code: 1 }, { unique: true });

        // Subscriptions indexes
        await db.collection('mess_subscriptions').createIndex({ user_id: 1, status: 1 });

        // Bookings indexes
        await db.collection('one_time_bookings').createIndex({ meal_date: 1 });
        await db.collection('parent_bookings').createIndex({ meal_date: 1 });

        console.log('✅ Database indexes created successfully');
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
    }
};

const getDB = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB() first.');
    }
    return db;
};

const closeDB = async () => {
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
};

module.exports = {
    connectDB,
    getDB,
    closeDB
};

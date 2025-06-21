const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { convertToIST, getCurrentISTDate } = require('../utils/helpers');

class User {
    constructor(userData) {
        this.tmu_code = userData.tmu_code;
        this.student_code = userData.student_code || null;
        this.user_type = userData.user_type;
        this.name = userData.name;
        this.email = userData.email;
        this.phone = userData.phone;
        this.profile_image = userData.profile_image || null;
        this.password_hash = userData.password_hash;
        this.is_active = userData.is_active !== undefined ? userData.is_active : true;
        this.department = userData.department || null;
        this.mess_offense = userData.mess_offense || { count: 0, month: '' };
        this.created_at = getCurrentISTDate();
        this.updated_at = getCurrentISTDate();
    }

    static async create(userData) {
        const db = getDB();
        const user = new User(userData);
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(userData.password, salt);
        
        const result = await db.collection('users').insertOne(user);
        return { ...user, _id: result.insertedId };
    }

    static async findByTMUCode(tmuCode) {
        const db = getDB();
        return await db.collection('users').findOne({ tmu_code: tmuCode });
    }

    static async findByEmail(email) {
        const db = getDB();
        return await db.collection('users').findOne({ email: email.toLowerCase() });
    }

    static async findById(id) {
        const db = getDB();
        return await db.collection('users').findOne({ _id: new ObjectId(id) });
    }

    static async updateById(id, updateData) {
        const db = getDB();
        updateData.updated_at = getCurrentISTDate();
        
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        return result;
    }

    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async findActiveUsers(filter = {}) {
        const db = getDB();
        const query = { is_active: true, ...filter };
        return await db.collection('users').find(query).toArray();
    }

    static async logMessOffense(userId) {
        const db = getDB();
        const user = await this.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const now = getCurrentISTDate();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let newOffenseCount = 1;
        if (user.mess_offense && user.mess_offense.month === currentMonth) {
            newOffenseCount = user.mess_offense.count + 1;
        }

        await this.updateById(userId, {
            mess_offense: {
                count: newOffenseCount,
                month: currentMonth
            }
        });

        return newOffenseCount;
    }

    static async getUsersByType(userType) {
        const db = getDB();
        return await db.collection('users').find({ 
            user_type: userType,
            is_active: true 
        }).toArray();
    }

    static async searchUsers(searchTerm, userType = null) {
        const db = getDB();
        const query = {
            is_active: true,
            $or: [
                { tmu_code: { $regex: searchTerm, $options: 'i' } },
                { 'name.first': { $regex: searchTerm, $options: 'i' } },
                { 'name.last': { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ]
        };

        if (userType) {
            query.user_type = userType;
        }

        return await db.collection('users').find(query).limit(20).toArray();
    }
}

module.exports = User;

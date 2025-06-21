const { MongoClient, ObjectId } = require('mongodb');
const { connectDB } = require('../config/database');

/**
 * HostelMaster Model
 * Manages hostel to mess mapping for student meal assignments
 */
class HostelMaster {
    constructor(data) {
        this.hostel_name = data.hostel_name;
        this.mess_name = data.mess_name;
        this.hostel_code = data.hostel_code;
        this.mess_code = data.mess_code;
        this.capacity = data.capacity || 0;
        this.current_occupancy = data.current_occupancy || 0;
        this.warden_details = data.warden_details || {};
        this.mess_timing_override = data.mess_timing_override || {};
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
    }

    /**
     * Create a new hostel-mess mapping
     */
    static async create(data) {
        const { db } = await connectDB();
        
        // Validate required fields
        if (!data.hostel_name || !data.mess_name) {
            throw new Error('Hostel name and mess name are required');
        }

        // Check for duplicate hostel mapping
        const existingHostel = await db.collection('hostel_master').findOne({
            hostel_name: data.hostel_name
        });

        if (existingHostel) {
            throw new Error('Hostel is already mapped to a mess');
        }

        const hostelMaster = new HostelMaster(data);
        const result = await db.collection('hostel_master').insertOne(hostelMaster);
        
        return { ...hostelMaster, _id: result.insertedId };
    }

    /**
     * Find hostel master by hostel name
     */
    static async findByHostelName(hostelName) {
        const { db } = await connectDB();
        
        return await db.collection('hostel_master').findOne({
            hostel_name: hostelName,
            is_active: true
        });
    }

    /**
     * Find all hostels mapped to a specific mess
     */
    static async findByMessName(messName) {
        const { db } = await connectDB();
        
        return await db.collection('hostel_master').find({
            mess_name: messName,
            is_active: true
        }).toArray();
    }

    /**
     * Get mess name for a specific hostel
     */
    static async getMessForHostel(hostelName) {
        const { db } = await connectDB();
        
        const hostelMaster = await db.collection('hostel_master').findOne({
            hostel_name: hostelName,
            is_active: true
        });

        return hostelMaster ? hostelMaster.mess_name : null;
    }

    /**
     * Get all active hostel-mess mappings
     */
    static async getAllActiveMappings() {
        const { db } = await connectDB();
        
        return await db.collection('hostel_master').find({
            is_active: true
        }).toArray();
    }

    /**
     * Update hostel master details
     */
    static async updateById(id, updateData) {
        const { db } = await connectDB();
        
        updateData.updated_at = new Date();
        
        const result = await db.collection('hostel_master').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return result;
    }

    /**
     * Get hostel statistics
     */
    static async getHostelStats() {
        const { db } = await connectDB();
        
        const stats = await db.collection('hostel_master').aggregate([
            {
                $match: { is_active: true }
            },
            {
                $group: {
                    _id: null,
                    total_hostels: { $sum: 1 },
                    total_capacity: { $sum: '$capacity' },
                    total_occupancy: { $sum: '$current_occupancy' },
                    unique_mess_count: { $addToSet: '$mess_name' }
                }
            },
            {
                $project: {
                    _id: 0,
                    total_hostels: 1,
                    total_capacity: 1,
                    total_occupancy: 1,
                    occupancy_percentage: {
                        $cond: {
                            if: { $gt: ['$total_capacity', 0] },
                            then: { $multiply: [{ $divide: ['$total_occupancy', '$total_capacity'] }, 100] },
                            else: 0
                        }
                    },
                    unique_mess_count: { $size: '$unique_mess_count' }
                }
            }
        ]).toArray();

        return stats[0] || {
            total_hostels: 0,
            total_capacity: 0,
            total_occupancy: 0,
            occupancy_percentage: 0,
            unique_mess_count: 0
        };
    }

    /**
     * Get mess-wise hostel distribution
     */
    static async getMessWiseDistribution() {
        const { db } = await connectDB();
        
        return await db.collection('hostel_master').aggregate([
            {
                $match: { is_active: true }
            },
            {
                $group: {
                    _id: '$mess_name',
                    hostel_count: { $sum: 1 },
                    total_capacity: { $sum: '$capacity' },
                    total_occupancy: { $sum: '$current_occupancy' },
                    hostels: {
                        $push: {
                            hostel_name: '$hostel_name',
                            capacity: '$capacity',
                            occupancy: '$current_occupancy'
                        }
                    }
                }
            },
            {
                $project: {
                    mess_name: '$_id',
                    hostel_count: 1,
                    total_capacity: 1,
                    total_occupancy: 1,
                    occupancy_percentage: {
                        $cond: {
                            if: { $gt: ['$total_capacity', 0] },
                            then: { $multiply: [{ $divide: ['$total_occupancy', '$total_capacity'] }, 100] },
                            else: 0
                        }
                    },
                    hostels: 1,
                    _id: 0
                }
            },
            {
                $sort: { mess_name: 1 }
            }
        ]).toArray();
    }

    /**
     * Validate student belongs to staff's mess
     */
    static async validateStudentMessAccess(studentHostel, staffMessName) {
        const { db } = await connectDB();
        
        const hostelMaster = await db.collection('hostel_master').findOne({
            hostel_name: studentHostel,
            mess_name: staffMessName,
            is_active: true
        });

        return !!hostelMaster;
    }

    /**
     * Initialize default hostel-mess mappings
     */
    static async initializeDefaultMappings() {
        const { db } = await connectDB();
        
        const existingCount = await db.collection('hostel_master').countDocuments();
        
        if (existingCount === 0) {
            const defaultMappings = [
                {
                    hostel_name: 'Boys Hostel 1',
                    mess_name: 'Central Mess A',
                    hostel_code: 'BH1',
                    mess_code: 'CMA',
                    capacity: 200,
                    current_occupancy: 150,
                    warden_details: {
                        name: 'Dr. Rajesh Kumar',
                        contact: '+91-9876543210',
                        email: 'warden.bh1@tmu.ac.in'
                    }
                },
                {
                    hostel_name: 'Boys Hostel 2',
                    mess_name: 'Central Mess A',
                    hostel_code: 'BH2',
                    mess_code: 'CMA',
                    capacity: 180,
                    current_occupancy: 165,
                    warden_details: {
                        name: 'Prof. Amit Sharma',
                        contact: '+91-9876543211',
                        email: 'warden.bh2@tmu.ac.in'
                    }
                },
                {
                    hostel_name: 'Girls Hostel 1',
                    mess_name: 'Central Mess B',
                    hostel_code: 'GH1',
                    mess_code: 'CMB',
                    capacity: 150,
                    current_occupancy: 140,
                    warden_details: {
                        name: 'Dr. Priya Singh',
                        contact: '+91-9876543212',
                        email: 'warden.gh1@tmu.ac.in'
                    }
                },
                {
                    hostel_name: 'Girls Hostel 2',
                    mess_name: 'Central Mess B',
                    hostel_code: 'GH2',
                    mess_code: 'CMB',
                    capacity: 120,
                    current_occupancy: 110,
                    warden_details: {
                        name: 'Prof. Sunita Gupta',
                        contact: '+91-9876543213',
                        email: 'warden.gh2@tmu.ac.in'
                    }
                }
            ];

            for (const mapping of defaultMappings) {
                await HostelMaster.create(mapping);
            }

            console.log('✅ Default hostel-mess mappings initialized');
        }
    }
}

module.exports = HostelMaster;
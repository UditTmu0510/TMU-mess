const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

class EmployeeDetail {
    constructor(data) {
        this._id = data._id; // employee_id as primary key
        this.user_id = new ObjectId(data.user_id);
        this.employee_code = data.employee_code;
        this.employment_status = data.employment_status;
        this.employee_name = data.employee_name;
        this.employee_type = data.employee_type;
        this.unit = data.unit;
        this.department = data.department;
        this.designation = data.designation;
        this.contact = data.contact;
        this.personal_details = data.personal_details;
    }

    static async create(data) {
        const db = getDB();
        const employeeDetail = new EmployeeDetail(data);
        
        const result = await db.collection('employee_details').insertOne(employeeDetail);
        return employeeDetail;
    }

    static async findByUserId(userId) {
        const db = getDB();
        return await db.collection('employee_details').findOne({
            user_id: new ObjectId(userId)
        });
    }

    static async findByEmployeeCode(employeeCode) {
        const db = getDB();
        return await db.collection('employee_details').findOne({
            employee_code: employeeCode
        });
    }

    static async updateByUserId(userId, updateData) {
        const db = getDB();
        const result = await db.collection('employee_details').updateOne(
            { user_id: new ObjectId(userId) },
            { $set: updateData }
        );
        return result;
    }

    static async searchEmployees(searchTerm, filters = {}) {
        const db = getDB();
        const query = {
            $or: [
                { employee_name: { $regex: searchTerm, $options: 'i' } },
                { employee_code: { $regex: searchTerm, $options: 'i' } },
                { 'contact.mobile': { $regex: searchTerm, $options: 'i' } },
                { 'contact.email': { $regex: searchTerm, $options: 'i' } }
            ]
        };

        // Apply additional filters
        if (filters.employee_type) {
            query.employee_type = filters.employee_type;
        }
        if (filters.department_code) {
            query['department.code'] = filters.department_code;
        }
        if (filters.employment_status) {
            query.employment_status = filters.employment_status;
        }

        return await db.collection('employee_details').find(query).limit(20).toArray();
    }

    static async getEmployeesByDepartment(departmentCode) {
        const db = getDB();
        return await db.collection('employee_details').find({
            'department.code': departmentCode,
            employment_status: 'Active'
        }).sort({ employee_name: 1 }).toArray();
    }

    static async getEmployeesByType(employeeType) {
        const db = getDB();
        return await db.collection('employee_details').find({
            employee_type: employeeType,
            employment_status: 'Active'
        }).sort({ employee_name: 1 }).toArray();
    }

    static async getActiveEmployees() {
        const db = getDB();
        return await db.collection('employee_details').find({
            employment_status: 'Active'
        }).sort({ employee_name: 1 }).toArray();
    }

    static async getEmployeeStatistics() {
        const db = getDB();
        
        const pipeline = [
            {
                $group: {
                    _id: null,
                    total_employees: { $sum: 1 },
                    active_employees: {
                        $sum: {
                            $cond: [{ $eq: ['$employment_status', 'Active'] }, 1, 0]
                        }
                    },
                    teaching_staff: {
                        $sum: {
                            $cond: [{ $eq: ['$employee_type', 'TEACH'] }, 1, 0]
                        }
                    },
                    non_teaching_staff: {
                        $sum: {
                            $cond: [{ $eq: ['$employee_type', 'NON-TEACH'] }, 1, 0]
                        }
                    },
                    admin_staff: {
                        $sum: {
                            $cond: [{ $eq: ['$employee_type', 'ADMIN'] }, 1, 0]
                        }
                    },
                    fourth_class: {
                        $sum: {
                            $cond: [{ $eq: ['$employee_type', 'FOURTH'] }, 1, 0]
                        }
                    },
                    departments: { $addToSet: '$department.name' },
                    units: { $addToSet: '$unit.name' }
                }
            },
            {
                $project: {
                    total_employees: 1,
                    active_employees: 1,
                    inactive_employees: { $subtract: ['$total_employees', '$active_employees'] },
                    teaching_staff: 1,
                    non_teaching_staff: 1,
                    admin_staff: 1,
                    fourth_class: 1,
                    total_departments: { $size: '$departments' },
                    total_units: { $size: '$units' }
                }
            }
        ];

        const result = await db.collection('employee_details').aggregate(pipeline).toArray();
        return result.length > 0 ? result[0] : {};
    }

    static async getDepartmentDistribution() {
        const db = getDB();
        
        return await db.collection('employee_details').aggregate([
            {
                $match: { employment_status: 'Active' }
            },
            {
                $group: {
                    _id: {
                        code: '$department.code',
                        name: '$department.name'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();
    }

    static async getDesignationDistribution() {
        const db = getDB();
        
        return await db.collection('employee_details').aggregate([
            {
                $match: { employment_status: 'Active' }
            },
            {
                $group: {
                    _id: {
                        code: '$designation.code',
                        name: '$designation.name'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();
    }

    static async getHODs() {
        const db = getDB();
        
        // Get employees with HOD-type designations
        return await db.collection('employee_details').find({
            employment_status: 'Active',
            'designation.name': { $regex: /head|hod|director|dean/i }
        }).sort({ 'department.name': 1 }).toArray();
    }

    static async validateEmployeeData(data) {
        const errors = [];

        if (!data.employee_code || data.employee_code.length < 3) {
            errors.push('Employee code is required and must be at least 3 characters');
        }

        if (!data.employee_name || data.employee_name.trim().length < 2) {
            errors.push('Employee name is required and must be at least 2 characters');
        }

        if (!['TEACH', 'NON-TEACH', 'FOURTH', 'ADMIN'].includes(data.employee_type)) {
            errors.push('Valid employee type is required');
        }

        if (!['Active', 'Inactive', 'Suspended', 'Terminated'].includes(data.employment_status)) {
            errors.push('Valid employment status is required');
        }

        if (!data.contact || !data.contact.mobile || !/^[+]?[\d\s\-\(\)]{10,15}$/.test(data.contact.mobile)) {
            errors.push('Valid mobile number is required');
        }

        if (data.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact.email)) {
            errors.push('Valid email address format required');
        }

        if (!data.department || !data.department.code || !data.department.name) {
            errors.push('Department code and name are required');
        }

        if (!data.designation || !data.designation.code || !data.designation.name) {
            errors.push('Designation code and name are required');
        }

        if (!data.personal_details || !['Male', 'Female', 'Other'].includes(data.personal_details.gender)) {
            errors.push('Valid gender is required');
        }

        if (!data.personal_details || !['Single', 'Married', 'Divorced', 'Widowed'].includes(data.personal_details.marital_status)) {
            errors.push('Valid marital status is required');
        }

        return errors;
    }
}

module.exports = EmployeeDetail;

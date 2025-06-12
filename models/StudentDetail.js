const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

class StudentDetail {
    constructor(data) {
        this._id = data._id; // student_id as primary key
        this.user_id = new ObjectId(data.user_id);
        this.student_code = data.student_code;
        this.enrollment_number = data.enrollment_number;
        this.student_name = data.student_name;
        this.college_name = data.college_name;
        this.course_name = data.course_name;
        this.admitted_year = data.admitted_year;
        this.fathers_name = data.fathers_name;
        this.mothers_name = data.mothers_name || null;
        this.date_of_birth = new Date(data.date_of_birth);
        this.gender = data.gender;
        this.category = data.category;
        this.type_of_course = data.type_of_course;
        this.semester_year = data.semester_year;
        this.permanent_address = data.permanent_address;
        this.mobile_number = data.mobile_number;
        this.email_address = data.email_address;
        this.hostel_details = data.hostel_details || null;
    }

    static async create(data) {
        const db = getDB();
        const studentDetail = new StudentDetail(data);
        
        const result = await db.collection('student_details').insertOne(studentDetail);
        return studentDetail;
    }

    static async findByUserId(userId) {
        const db = getDB();
        return await db.collection('student_details').findOne({
            user_id: new ObjectId(userId)
        });
    }

    static async findByStudentCode(studentCode) {
        const db = getDB();
        return await db.collection('student_details').findOne({
            student_code: studentCode
        });
    }

    static async findByEnrollmentNumber(enrollmentNumber) {
        const db = getDB();
        return await db.collection('student_details').findOne({
            enrollment_number: enrollmentNumber
        });
    }

    static async updateByUserId(userId, updateData) {
        const db = getDB();
        const result = await db.collection('student_details').updateOne(
            { user_id: new ObjectId(userId) },
            { $set: updateData }
        );
        return result;
    }

    static async searchStudents(searchTerm, filters = {}) {
        const db = getDB();
        const query = {
            $or: [
                { student_name: { $regex: searchTerm, $options: 'i' } },
                { student_code: { $regex: searchTerm, $options: 'i' } },
                { enrollment_number: { $regex: searchTerm, $options: 'i' } },
                { mobile_number: { $regex: searchTerm, $options: 'i' } }
            ]
        };

        // Apply additional filters
        if (filters.college_name) {
            query.college_name = filters.college_name;
        }
        if (filters.course_name) {
            query.course_name = filters.course_name;
        }
        if (filters.admitted_year) {
            query.admitted_year = filters.admitted_year;
        }

        return await db.collection('student_details').find(query).limit(20).toArray();
    }

    static async getStudentsByCollege(collegeName) {
        const db = getDB();
        return await db.collection('student_details').find({
            college_name: collegeName
        }).sort({ student_name: 1 }).toArray();
    }

    static async getStudentsByCourse(courseName) {
        const db = getDB();
        return await db.collection('student_details').find({
            course_name: courseName
        }).sort({ student_name: 1 }).toArray();
    }

    static async getStudentsByYear(admittedYear) {
        const db = getDB();
        return await db.collection('student_details').find({
            admitted_year: admittedYear
        }).sort({ student_name: 1 }).toArray();
    }

    static async getHostelStudents(hostelName = null) {
        const db = getDB();
        const query = {
            'hostel_details.name': { $exists: true, $ne: null }
        };

        if (hostelName) {
            query['hostel_details.name'] = hostelName;
        }

        return await db.collection('student_details').find(query)
            .sort({ 'hostel_details.name': 1, 'hostel_details.room_number': 1 })
            .toArray();
    }

    static async getStudentStatistics() {
        const db = getDB();
        
        const pipeline = [
            {
                $group: {
                    _id: null,
                    total_students: { $sum: 1 },
                    colleges: { $addToSet: '$college_name' },
                    courses: { $addToSet: '$course_name' },
                    years: { $addToSet: '$admitted_year' },
                    hostel_students: {
                        $sum: {
                            $cond: [
                                { $ifNull: ['$hostel_details.name', false] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    total_students: 1,
                    total_colleges: { $size: '$colleges' },
                    total_courses: { $size: '$courses' },
                    total_years: { $size: '$years' },
                    hostel_students: 1,
                    day_scholars: { $subtract: ['$total_students', '$hostel_students'] }
                }
            }
        ];

        const result = await db.collection('student_details').aggregate(pipeline).toArray();
        return result.length > 0 ? result[0] : {};
    }

    static async getGenderDistribution() {
        const db = getDB();
        
        return await db.collection('student_details').aggregate([
            {
                $group: {
                    _id: '$gender',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();
    }

    static async getCourseDistribution() {
        const db = getDB();
        
        return await db.collection('student_details').aggregate([
            {
                $group: {
                    _id: '$course_name',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();
    }

    static async validateStudentData(data) {
        const errors = [];

        if (!data.student_code || data.student_code.length < 3) {
            errors.push('Student code is required and must be at least 3 characters');
        }

        if (!data.enrollment_number) {
            errors.push('Enrollment number is required');
        }

        if (!data.student_name || data.student_name.trim().length < 2) {
            errors.push('Student name is required and must be at least 2 characters');
        }

        if (!data.mobile_number || !/^[+]?[\d\s\-\(\)]{10,15}$/.test(data.mobile_number)) {
            errors.push('Valid mobile number is required');
        }

        if (!data.email_address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_address)) {
            errors.push('Valid email address is required');
        }

        if (!data.date_of_birth || isNaN(new Date(data.date_of_birth))) {
            errors.push('Valid date of birth is required');
        }

        if (!['Male', 'Female', 'Other'].includes(data.gender)) {
            errors.push('Valid gender is required');
        }

        return errors;
    }
}

module.exports = StudentDetail;

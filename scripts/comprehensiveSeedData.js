const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { getCurrentISTTime, getISTDateString, addHoursToISTTime } = require('../utils/timezone');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'tmu_app';

// Comprehensive seed data for TMU Mess Management System
class ComprehensiveSeedData {
    constructor() {
        this.client = null;
        this.db = null;
        this.collections = {};
        
        // Data storage for cross-referencing
        this.createdUsers = [];
        this.createdStudentDetails = [];
        this.createdEmployeeDetails = [];
        this.createdHostelMaster = [];
        this.createdMealTimings = [];
    }

    async connect() {
        try {
            this.client = new MongoClient(MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db(DB_NAME);
            
            // Initialize collections
            this.collections = {
                users: this.db.collection('users'),
                student_details: this.db.collection('student_details'),
                employee_details: this.db.collection('employee_details'),
                hostel_master: this.db.collection('hostel_master'),
                meal_timings: this.db.collection('meal_timings'),
                meal_confirmations: this.db.collection('meal_confirmations'),
                mess_subscriptions: this.db.collection('mess_subscriptions'),
                one_time_bookings: this.db.collection('one_time_bookings'),
                parent_bookings: this.db.collection('parent_bookings'),
                payment_qrs: this.db.collection('payment_qrs'),
                fines: this.db.collection('fines')
            };
            
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    async clearAllCollections() {
        console.log('🧹 Clearing existing data...');
        for (const [name, collection] of Object.entries(this.collections)) {
            await collection.deleteMany({});
            console.log(`   Cleared ${name}`);
        }
    }

    async seedHostelMaster() {
        console.log('🏠 Creating hostel-mess mappings...');
        
        const hostelMasterData = [
            // Boys Hostels - North Campus Mess
            { hostel_name: 'Tagore Hostel', mess_name: 'North Campus Mess', capacity: 200, hostel_type: 'boys', warden_name: 'Dr. Rajesh Kumar', contact_number: '9876543210', is_active: true },
            { hostel_name: 'Vivekananda Hostel', mess_name: 'North Campus Mess', capacity: 180, hostel_type: 'boys', warden_name: 'Prof. Amit Singh', contact_number: '9876543211', is_active: true },
            { hostel_name: 'Gandhi Hostel', mess_name: 'North Campus Mess', capacity: 150, hostel_type: 'boys', warden_name: 'Dr. Suresh Gupta', contact_number: '9876543212', is_active: true },
            
            // Girls Hostels - South Campus Mess
            { hostel_name: 'Sarojini Hostel', mess_name: 'South Campus Mess', capacity: 120, hostel_type: 'girls', warden_name: 'Dr. Priya Sharma', contact_number: '9876543213', is_active: true },
            { hostel_name: 'Kalpana Hostel', mess_name: 'South Campus Mess', capacity: 100, hostel_type: 'girls', warden_name: 'Prof. Meera Joshi', contact_number: '9876543214', is_active: true },
            { hostel_name: 'Indira Hostel', mess_name: 'South Campus Mess', capacity: 110, hostel_type: 'girls', warden_name: 'Dr. Sunita Rao', contact_number: '9876543215', is_active: true },
            
            // Mixed Hostels - Central Campus Mess
            { hostel_name: 'International Hostel', mess_name: 'Central Campus Mess', capacity: 80, hostel_type: 'mixed', warden_name: 'Dr. John Smith', contact_number: '9876543216', is_active: true },
            { hostel_name: 'Research Scholar Hostel', mess_name: 'Central Campus Mess', capacity: 60, hostel_type: 'mixed', warden_name: 'Prof. Lisa Johnson', contact_number: '9876543217', is_active: true }
        ];

        const result = await this.collections.hostel_master.insertMany(hostelMasterData);
        this.createdHostelMaster = result.insertedIds;
        console.log('   Created 8 hostel-mess mappings');
    }

    async seedMealTimings() {
        console.log('🍽️ Creating meal timings...');
        
        const mealTimingsData = [
            {
                meal_type: 'breakfast',
                start_time: { hours: 7, minutes: 30 },
                end_time: { hours: 9, minutes: 30 },
                cost_per_meal: 25.00,
                confirmation_deadline_hours: 12,
                is_active: true,
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            },
            {
                meal_type: 'lunch',
                start_time: { hours: 12, minutes: 0 },
                end_time: { hours: 14, minutes: 30 },
                cost_per_meal: 45.00,
                confirmation_deadline_hours: 6,
                is_active: true,
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            },
            {
                meal_type: 'snacks',
                start_time: { hours: 16, minutes: 0 },
                end_time: { hours: 18, minutes: 0 },
                cost_per_meal: 20.00,
                confirmation_deadline_hours: 4,
                is_active: true,
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            },
            {
                meal_type: 'dinner',
                start_time: { hours: 19, minutes: 0 },
                end_time: { hours: 21, minutes: 30 },
                cost_per_meal: 50.00,
                confirmation_deadline_hours: 8,
                is_active: true,
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            }
        ];

        const result = await this.collections.meal_timings.insertMany(mealTimingsData);
        this.createdMealTimings = result.insertedIds;
        console.log('   Created 4 meal timing configurations');
    }

    async seedUsers() {
        console.log('👥 Creating users...');
        
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const usersData = [
            // Admin Users
            { tmu_code: 'TMU001', name: 'System Administrator', email: 'admin@tmu.ac.in', password: hashedPassword, user_type: 'admin', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'TMU002', name: 'Deputy Admin', email: 'deputy.admin@tmu.ac.in', password: hashedPassword, user_type: 'admin', is_active: true, created_at: getCurrentISTTime() },
            
            // HOD Users
            { tmu_code: 'HOD001', name: 'Dr. Computer Science Head', email: 'hod.cs@tmu.ac.in', password: hashedPassword, user_type: 'hod', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'HOD002', name: 'Dr. Mechanical Engineering Head', email: 'hod.mech@tmu.ac.in', password: hashedPassword, user_type: 'hod', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'HOD003', name: 'Dr. Business Studies Head', email: 'hod.business@tmu.ac.in', password: hashedPassword, user_type: 'hod', is_active: true, created_at: getCurrentISTTime() },
            
            // Mess Staff Users
            { tmu_code: 'MESS001', name: 'Rajesh Kumar', email: 'mess.north@tmu.ac.in', password: hashedPassword, user_type: 'mess_staff', mess_name: 'North Campus Mess', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'MESS002', name: 'Priya Sharma', email: 'mess.south@tmu.ac.in', password: hashedPassword, user_type: 'mess_staff', mess_name: 'South Campus Mess', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'MESS003', name: 'Amit Singh', email: 'mess.central@tmu.ac.in', password: hashedPassword, user_type: 'mess_staff', mess_name: 'Central Campus Mess', is_active: true, created_at: getCurrentISTTime() },
            
            // Student Users (Hostel Students)
            { tmu_code: 'STU001', name: 'Aarav Kumar', email: 'aarav.kumar@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU002', name: 'Priya Singh', email: 'priya.singh@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU003', name: 'Arjun Patel', email: 'arjun.patel@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU004', name: 'Sneha Gupta', email: 'sneha.gupta@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU005', name: 'Rohit Sharma', email: 'rohit.sharma@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU006', name: 'Ananya Joshi', email: 'ananya.joshi@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU007', name: 'Vikram Reddy', email: 'vikram.reddy@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU008', name: 'Kavya Nair', email: 'kavya.nair@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU009', name: 'Dev Malhotra', email: 'dev.malhotra@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU010', name: 'Riya Agarwal', email: 'riya.agarwal@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU011', name: 'Karthik Rao', email: 'karthik.rao@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'STU012', name: 'Pooja Verma', email: 'pooja.verma@student.tmu.ac.in', password: hashedPassword, user_type: 'student', is_active: true, created_at: getCurrentISTTime() },
            
            // Employee Users (Faculty and Staff)
            { tmu_code: 'EMP001', name: 'Dr. Suresh Gupta', email: 'suresh.gupta@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'EMP002', name: 'Prof. Meera Joshi', email: 'meera.joshi@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'EMP003', name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'EMP004', name: 'Ms. Sunita Rao', email: 'sunita.rao@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'EMP005', name: 'Mr. Vinod Sharma', email: 'vinod.sharma@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'EMP006', name: 'Dr. Lakshmi Patel', email: 'lakshmi.patel@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'EMP007', name: 'Prof. Anil Singh', email: 'anil.singh@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() },
            { tmu_code: 'EMP008', name: 'Ms. Deepika Nair', email: 'deepika.nair@tmu.ac.in', password: hashedPassword, user_type: 'employee', is_active: true, created_at: getCurrentISTTime() }
        ];

        const result = await this.collections.users.insertMany(usersData);
        this.createdUsers = Object.values(result.insertedIds);
        console.log('   Created 26 users (2 admin, 3 HOD, 3 mess staff, 12 students, 8 employees)');
    }

    async seedStudentDetails() {
        console.log('📚 Creating student details...');
        
        const studentUsers = await this.collections.users.find({ user_type: 'student' }).toArray();
        const hostels = await this.collections.hostel_master.find({}).toArray();
        
        const courses = ['B.Tech Computer Science', 'B.Tech Mechanical Engineering', 'MBA', 'B.Com', 'BBA', 'M.Tech'];
        const colleges = ['College of Engineering', 'College of Management', 'College of Commerce'];
        
        const studentDetailsData = studentUsers.map((user, index) => {
            const hostel = hostels[index % hostels.length];
            return {
                user_id: user._id,
                student_code: `ST${String(index + 1).padStart(4, '0')}`,
                enrollment_number: `EN2024${String(index + 1).padStart(4, '0')}`,
                course_name: courses[index % courses.length],
                college_name: colleges[index % colleges.length],
                admission_year: 2024,
                current_year: 1,
                semester: 1,
                hostel_name: hostel.hostel_name,
                room_number: `${String.fromCharCode(65 + Math.floor(index / 10))}${String(index % 10 + 101)}`,
                parent_name: `Parent of ${user.name}`,
                parent_phone: `98765432${String(10 + index).slice(-2)}`,
                parent_email: `parent.${user.email.split('@')[0]}@gmail.com`,
                emergency_contact: `98765433${String(10 + index).slice(-2)}`,
                blood_group: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][index % 8],
                date_of_birth: new Date(2005 - Math.floor(index / 3), index % 12, (index % 28) + 1),
                gender: index % 3 === 0 ? 'female' : 'male',
                address: `${index + 1}, Student Colony, New Delhi, 110001`,
                is_active: true,
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            };
        });

        const result = await this.collections.student_details.insertMany(studentDetailsData);
        this.createdStudentDetails = Object.values(result.insertedIds);
        console.log('   Created 12 student detail records with hostel assignments');
    }

    async seedEmployeeDetails() {
        console.log('👨‍💼 Creating employee details...');
        
        const employeeUsers = await this.collections.users.find({ user_type: 'employee' }).toArray();
        const departments = ['Computer Science', 'Mechanical Engineering', 'Business Studies', 'Mathematics', 'Physics'];
        const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Senior Lecturer'];
        
        const employeeDetailsData = employeeUsers.map((user, index) => ({
            user_id: user._id,
            employee_code: `EMP${String(index + 1).padStart(4, '0')}`,
            department_code: departments[index % departments.length].replace(' ', '_').toUpperCase(),
            department_name: departments[index % departments.length],
            designation: designations[index % designations.length],
            employee_type: index % 2 === 0 ? 'faculty' : 'staff',
            salary_grade: `Grade-${String(index % 5 + 1)}`,
            joining_date: new Date(2020 + (index % 4), index % 12, (index % 28) + 1),
            phone_number: `87654321${String(10 + index).slice(-2)}`,
            emergency_contact: `87654322${String(10 + index).slice(-2)}`,
            blood_group: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][index % 8],
            date_of_birth: new Date(1980 + index, index % 12, (index % 28) + 1),
            gender: index % 3 === 0 ? 'female' : 'male',
            address: `${index + 1}, Faculty Colony, University Campus, 110001`,
            qualifications: index % 2 === 0 ? 'Ph.D' : 'M.Tech',
            experience_years: 5 + (index % 10),
            is_active: true,
            created_at: getCurrentISTTime(),
            updated_at: getCurrentISTTime()
        }));

        const result = await this.collections.employee_details.insertMany(employeeDetailsData);
        this.createdEmployeeDetails = Object.values(result.insertedIds);
        console.log('   Created 8 employee detail records');
    }

    async seedMessSubscriptions() {
        console.log('📋 Creating mess subscriptions...');
        
        const allUsers = await this.collections.users.find({ 
            user_type: { $in: ['student', 'employee'] } 
        }).toArray();
        
        const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'];
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // Start of current month
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0); // End of next 3 months
        
        const subscriptionsData = [];
        
        for (const user of allUsers) {
            // Students get all meals, employees get lunch and dinner
            const userMealTypes = user.user_type === 'student' ? mealTypes : ['lunch', 'dinner'];
            
            for (const mealType of userMealTypes) {
                const mealTiming = await this.collections.meal_timings.findOne({ meal_type: mealType });
                const monthlyMeals = 30; // Approximate meals per month
                const totalCost = monthlyMeals * mealTiming.cost_per_meal * 3; // 3 months
                
                subscriptionsData.push({
                    user_id: user._id,
                    meal_types: [mealType],
                    start_date: startDate,
                    end_date: endDate,
                    status: 'active',
                    total_cost: totalCost,
                    payment_status: 'paid',
                    payment_reference: `PAY${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
                    payment_date: getCurrentISTTime(),
                    auto_renewal: user.user_type === 'student',
                    created_at: getCurrentISTTime(),
                    updated_at: getCurrentISTTime()
                });
            }
        }

        const result = await this.collections.mess_subscriptions.insertMany(subscriptionsData);
        console.log(`   Created ${subscriptionsData.length} mess subscriptions for all students and employees`);
    }

    async seedMealConfirmations() {
        console.log('✅ Creating meal confirmations...');
        
        const allUsers = await this.collections.users.find({ 
            user_type: { $in: ['student', 'employee'] } 
        }).toArray();
        
        const confirmationsData = [];
        const today = new Date();
        const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'];
        
        // Create confirmations for today and next 3 days
        for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
            const mealDate = new Date(today);
            mealDate.setDate(today.getDate() + dayOffset);
            
            for (const user of allUsers) {
                // Students confirm all meals, employees confirm lunch and dinner
                const userMealTypes = user.user_type === 'student' ? mealTypes : ['lunch', 'dinner'];
                
                for (const mealType of userMealTypes) {
                    const mealTiming = await this.collections.meal_timings.findOne({ meal_type: mealType });
                    
                    // 80% confirmation rate for realistic data
                    if (Math.random() < 0.8) {
                        confirmationsData.push({
                            user_id: user._id,
                            meal_date: mealDate,
                            meal_type: mealType,
                            confirmation_status: 'confirmed',
                            cost_per_meal: mealTiming.cost_per_meal,
                            total_cost: mealTiming.cost_per_meal,
                            payment_method: 'subscription',
                            attended: dayOffset === 0 ? (Math.random() < 0.9) : null, // 90% attendance for today
                            attendance_time: dayOffset === 0 && Math.random() < 0.9 ? getCurrentISTTime() : null,
                            created_at: getCurrentISTTime(),
                            updated_at: getCurrentISTTime()
                        });
                    }
                }
            }
        }

        const result = await this.collections.meal_confirmations.insertMany(confirmationsData);
        console.log(`   Created ${confirmationsData.length} meal confirmations for 4 days`);
    }

    async seedOneTimeBookings() {
        console.log('🎫 Creating one-time bookings...');
        
        const employees = await this.collections.users.find({ user_type: 'employee' }).toArray();
        const bookingsData = [];
        const today = new Date();
        
        // Create some employee bookings for next few days
        for (let i = 0; i < 10; i++) {
            const employee = employees[i % employees.length];
            const bookingDate = new Date(today);
            bookingDate.setDate(today.getDate() + Math.floor(i / 2) + 1);
            
            const mealType = ['lunch', 'dinner'][i % 2];
            const mealTiming = await this.collections.meal_timings.findOne({ meal_type: mealType });
            
            bookingsData.push({
                user_id: employee._id,
                booking_type: 'employee',
                meal_date: bookingDate,
                meal_type: mealType,
                guest_count: 1,
                total_amount: mealTiming.cost_per_meal,
                payment_status: Math.random() < 0.7 ? 'paid' : 'pending',
                payment_reference: Math.random() < 0.7 ? `PAY${Date.now()}${i}` : null,
                booking_status: 'confirmed',
                notes: `Employee meal booking for ${mealType}`,
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            });
        }

        const result = await this.collections.one_time_bookings.insertMany(bookingsData);
        console.log(`   Created ${bookingsData.length} one-time employee bookings`);
    }

    async seedParentBookings() {
        console.log('👨‍👩‍👧‍👦 Creating parent bookings...');
        
        const students = await this.collections.users.find({ user_type: 'student' }).toArray();
        const bookingsData = [];
        const today = new Date();
        
        // Create parent bookings for next few days
        for (let i = 0; i < 8; i++) {
            const student = students[i % students.length];
            const studentDetail = await this.collections.student_details.findOne({ user_id: student._id });
            const bookingDate = new Date(today);
            bookingDate.setDate(today.getDate() + Math.floor(i / 2) + 1);
            
            const mealType = ['lunch', 'dinner'][i % 2];
            const mealTiming = await this.collections.meal_timings.findOne({ meal_type: mealType });
            const guestCount = Math.floor(Math.random() * 3) + 2; // 2-4 guests
            
            bookingsData.push({
                student_id: student._id,
                meal_date: bookingDate,
                meal_type: mealType,
                parent_name: studentDetail.parent_name,
                parent_phone: studentDetail.parent_phone,
                parent_email: studentDetail.parent_email,
                guest_count: guestCount,
                per_person_cost: mealTiming.cost_per_meal,
                total_amount: mealTiming.cost_per_meal * guestCount,
                payment_status: Math.random() < 0.6 ? 'paid' : 'pending',
                payment_method: 'qr_payment',
                booking_status: 'confirmed',
                notes: `Family visit - ${guestCount} guests for ${mealType}`,
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            });
        }

        const result = await this.collections.parent_bookings.insertMany(bookingsData);
        console.log(`   Created ${bookingsData.length} parent bookings with QR payment`);
    }

    async seedPaymentQRs() {
        console.log('💳 Creating payment QR codes...');
        
        const pendingParentBookings = await this.collections.parent_bookings.find({ 
            payment_status: 'pending' 
        }).toArray();
        
        const qrData = [];
        
        for (const booking of pendingParentBookings) {
            const student = await this.collections.users.findOne({ _id: booking.student_id });
            const studentDetail = await this.collections.student_details.findOne({ user_id: student._id });
            const hostelMaster = await this.collections.hostel_master.findOne({ 
                hostel_name: studentDetail.hostel_name 
            });
            
            const qrCode = `QR${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
            const qrHash = await bcrypt.hash(qrCode, 10);
            
            qrData.push({
                booking_id: booking._id,
                qr_code: qrCode,
                qr_hash: qrHash,
                amount: booking.total_amount,
                mess_name: hostelMaster.mess_name,
                status: 'active',
                expires_at: addHoursToISTTime(getCurrentISTTime(), 2), // 2 hours from now
                created_at: getCurrentISTTime()
            });
        }

        if (qrData.length > 0) {
            const result = await this.collections.payment_qrs.insertMany(qrData);
            console.log(`   Created ${qrData.length} payment QR codes for pending bookings`);
        } else {
            console.log('   No pending bookings found, skipped payment QR creation');
        }
    }

    async seedFines() {
        console.log('💰 Creating fines for no-shows...');
        
        const noShowConfirmations = await this.collections.meal_confirmations.find({ 
            attended: false,
            meal_date: { $lt: new Date() } // Past meals only
        }).toArray();
        
        const finesData = [];
        
        for (const confirmation of noShowConfirmations.slice(0, 5)) { // Limit to 5 fines
            const user = await this.collections.users.findOne({ _id: confirmation.user_id });
            
            finesData.push({
                user_id: confirmation.user_id,
                fine_type: 'no_show',
                amount: confirmation.cost_per_meal * 0.5, // 50% of meal cost as fine
                reason: `No-show for ${confirmation.meal_type} on ${confirmation.meal_date.toDateString()}`,
                meal_date: confirmation.meal_date,
                meal_type: confirmation.meal_type,
                confirmation_id: confirmation._id,
                status: Math.random() < 0.3 ? 'paid' : 'pending',
                payment_reference: Math.random() < 0.3 ? `FINE${Date.now()}${Math.random().toString(36).substr(2, 4)}` : null,
                issued_date: getCurrentISTTime(),
                due_date: addHoursToISTTime(getCurrentISTTime(), 168), // 7 days from now
                created_at: getCurrentISTTime(),
                updated_at: getCurrentISTTime()
            });
        }

        if (finesData.length > 0) {
            const result = await this.collections.fines.insertMany(finesData);
            console.log(`   Created ${finesData.length} fines for no-show violations`);
        } else {
            console.log('   No no-show records found, skipped fine creation');
        }
    }

    async generateSummaryReport() {
        console.log('\n📊 SEED DATA SUMMARY REPORT');
        console.log('=' .repeat(50));
        
        for (const [name, collection] of Object.entries(this.collections)) {
            const count = await collection.countDocuments();
            console.log(`${name.padEnd(20)}: ${count} records`);
        }
        
        console.log('=' .repeat(50));
        
        // Additional summary stats
        const activeSubscriptions = await this.collections.mess_subscriptions.countDocuments({ status: 'active' });
        const todayConfirmations = await this.collections.meal_confirmations.countDocuments({ 
            meal_date: { 
                $gte: new Date(getCurrentISTTime().setHours(0, 0, 0, 0)),
                $lt: new Date(getCurrentISTTime().setHours(23, 59, 59, 999))
            }
        });
        const pendingPayments = await this.collections.parent_bookings.countDocuments({ payment_status: 'pending' });
        const activeFines = await this.collections.fines.countDocuments({ status: 'pending' });
        
        console.log(`\n📈 KEY METRICS:`);
        console.log(`Active Subscriptions : ${activeSubscriptions}`);
        console.log(`Today's Confirmations: ${todayConfirmations}`);
        console.log(`Pending Payments     : ${pendingPayments}`);
        console.log(`Active Fines         : ${activeFines}`);
        
        console.log('\n✅ All seed data created successfully with proper relationships!');
        console.log('🔗 All students and employees have active mess subscriptions');
        console.log('🏠 All students are assigned to hostels with proper mess mappings');
        console.log('📅 Meal confirmations created for next 4 days');
        console.log('💳 Payment QRs generated for pending parent bookings');
    }

    async run() {
        try {
            await this.connect();
            await this.clearAllCollections();
            
            // Seed data in proper order for relationships
            await this.seedHostelMaster();
            await this.seedMealTimings();
            await this.seedUsers();
            await this.seedStudentDetails();
            await this.seedEmployeeDetails();
            await this.seedMessSubscriptions();
            await this.seedMealConfirmations();
            await this.seedOneTimeBookings();
            await this.seedParentBookings();
            await this.seedPaymentQRs();
            await this.seedFines();
            
            await this.generateSummaryReport();
            
        } catch (error) {
            console.error('❌ Seed data creation failed:', error);
        } finally {
            if (this.client) {
                await this.client.close();
                console.log('🔒 Database connection closed');
            }
        }
    }
}

// Run the seed data script
if (require.main === module) {
    const seeder = new ComprehensiveSeedData();
    seeder.run().catch(console.error);
}

module.exports = ComprehensiveSeedData;
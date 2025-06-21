const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tmu_app';

// Seed data for the TMU Mess Management System
const seedData = {
    users: [
        // Students (20 entries)
        {
            tmu_code: "STU001",
            user_type: "student",
            name: { first: "Aarav", last: "Sharma" },
            email: "aarav.sharma@tmu.ac.in",
            phone: "9876543210",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2024-01-15T00:00:00Z"),
            last_login: new Date("2025-06-10T00:00:00Z")
        },
        {
            tmu_code: "STU002",
            user_type: "student",
            name: { first: "Priya", last: "Patel" },
            email: "priya.patel@tmu.ac.in",
            phone: "9876543211",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2024-01-16T00:00:00Z"),
            last_login: new Date("2025-06-11T00:00:00Z")
        },
        {
            tmu_code: "STU003",
            user_type: "student",
            name: { first: "Rahul", last: "Singh" },
            email: "rahul.singh@tmu.ac.in",
            phone: "9876543212",
            password: "password123",
            department: "Mechanical",
            is_active: true,
            created_at: new Date("2024-01-17T00:00:00Z"),
            last_login: new Date("2025-06-09T00:00:00Z")
        },
        {
            tmu_code: "STU004",
            user_type: "student",
            name: { first: "Ananya", last: "Gupta" },
            email: "ananya.gupta@tmu.ac.in",
            phone: "9876543213",
            password: "password123",
            department: "Civil",
            is_active: true,
            created_at: new Date("2024-01-18T00:00:00Z"),
            last_login: new Date("2025-06-08T00:00:00Z")
        },
        {
            tmu_code: "STU005",
            user_type: "student",
            name: { first: "Vikram", last: "Joshi" },
            email: "vikram.joshi@tmu.ac.in",
            phone: "9876543214",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2024-01-19T00:00:00Z"),
            last_login: new Date("2025-06-07T00:00:00Z")
        },
        {
            tmu_code: "STU006",
            user_type: "student",
            name: { first: "Kavya", last: "Reddy" },
            email: "kavya.reddy@tmu.ac.in",
            phone: "9876543215",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2024-01-20T00:00:00Z"),
            last_login: new Date("2025-06-06T00:00:00Z")
        },
        {
            tmu_code: "STU007",
            user_type: "student",
            name: { first: "Arjun", last: "Kumar" },
            email: "arjun.kumar@tmu.ac.in",
            phone: "9876543216",
            password: "password123",
            department: "Mechanical",
            is_active: true,
            created_at: new Date("2024-01-21T00:00:00Z"),
            last_login: new Date("2025-06-05T00:00:00Z")
        },
        {
            tmu_code: "STU008",
            user_type: "student",
            name: { first: "Sneha", last: "Verma" },
            email: "sneha.verma@tmu.ac.in",
            phone: "9876543217",
            password: "password123",
            department: "Civil",
            is_active: true,
            created_at: new Date("2024-01-22T00:00:00Z"),
            last_login: new Date("2025-06-04T00:00:00Z")
        },
        {
            tmu_code: "STU009",
            user_type: "student",
            name: { first: "Karthik", last: "Nair" },
            email: "karthik.nair@tmu.ac.in",
            phone: "9876543218",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2024-01-23T00:00:00Z"),
            last_login: new Date("2025-06-03T00:00:00Z")
        },
        {
            tmu_code: "STU010",
            user_type: "student",
            name: { first: "Riya", last: "Agarwal" },
            email: "riya.agarwal@tmu.ac.in",
            phone: "9876543219",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2024-01-24T00:00:00Z"),
            last_login: new Date("2025-06-02T00:00:00Z")
        },
        {
            tmu_code: "STU011",
            user_type: "student",
            name: { first: "Aditya", last: "Mishra" },
            email: "aditya.mishra@tmu.ac.in",
            phone: "9876543220",
            password: "password123",
            department: "Mechanical",
            is_active: true,
            created_at: new Date("2024-01-25T00:00:00Z"),
            last_login: new Date("2025-06-01T00:00:00Z")
        },
        {
            tmu_code: "STU012",
            user_type: "student",
            name: { first: "Pooja", last: "Jain" },
            email: "pooja.jain@tmu.ac.in",
            phone: "9876543221",
            password: "password123",
            department: "Civil",
            is_active: true,
            created_at: new Date("2024-01-26T00:00:00Z"),
            last_login: new Date("2025-05-31T00:00:00Z")
        },
        {
            tmu_code: "STU013",
            user_type: "student",
            name: { first: "Rohit", last: "Yadav" },
            email: "rohit.yadav@tmu.ac.in",
            phone: "9876543222",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2024-01-27T00:00:00Z"),
            last_login: new Date("2025-05-30T00:00:00Z")
        },
        {
            tmu_code: "STU014",
            user_type: "student",
            name: { first: "Nisha", last: "Tiwari" },
            email: "nisha.tiwari@tmu.ac.in",
            phone: "9876543223",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2024-01-28T00:00:00Z"),
            last_login: new Date("2025-05-29T00:00:00Z")
        },
        {
            tmu_code: "STU015",
            user_type: "student",
            name: { first: "Siddharth", last: "Pandey" },
            email: "siddharth.pandey@tmu.ac.in",
            phone: "9876543224",
            password: "password123",
            department: "Mechanical",
            is_active: true,
            created_at: new Date("2024-01-29T00:00:00Z"),
            last_login: new Date("2025-05-28T00:00:00Z")
        },
        {
            tmu_code: "STU016",
            user_type: "student",
            name: { first: "Megha", last: "Srivastava" },
            email: "megha.srivastava@tmu.ac.in",
            phone: "9876543225",
            password: "password123",
            department: "Civil",
            is_active: true,
            created_at: new Date("2024-01-30T00:00:00Z"),
            last_login: new Date("2025-05-27T00:00:00Z")
        },
        {
            tmu_code: "STU017",
            user_type: "student",
            name: { first: "Harsh", last: "Agrawal" },
            email: "harsh.agrawal@tmu.ac.in",
            phone: "9876543226",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2024-01-31T00:00:00Z"),
            last_login: new Date("2025-05-26T00:00:00Z")
        },
        {
            tmu_code: "STU018",
            user_type: "student",
            name: { first: "Shreya", last: "Bansal" },
            email: "shreya.bansal@tmu.ac.in",
            phone: "9876543227",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2024-02-01T00:00:00Z"),
            last_login: new Date("2025-05-25T00:00:00Z")
        },
        {
            tmu_code: "STU019",
            user_type: "student",
            name: { first: "Yash", last: "Goyal" },
            email: "yash.goyal@tmu.ac.in",
            phone: "9876543228",
            password: "password123",
            department: "Mechanical",
            is_active: true,
            created_at: new Date("2024-02-02T00:00:00Z"),
            last_login: new Date("2025-05-24T00:00:00Z")
        },
        {
            tmu_code: "STU020",
            user_type: "student",
            name: { first: "Divya", last: "Saxena" },
            email: "divya.saxena@tmu.ac.in",
            phone: "9876543229",
            password: "password123",
            department: "Civil",
            is_active: true,
            created_at: new Date("2024-02-03T00:00:00Z"),
            last_login: new Date("2025-05-23T00:00:00Z")
        },
        
        // Employees (10 entries)
        {
            tmu_code: "EMP001",
            user_type: "employee",
            name: { first: "Dr. Rajesh", last: "Sharma" },
            email: "rajesh.sharma@tmu.ac.in",
            phone: "9876543230",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2020-01-15T00:00:00Z"),
            last_login: new Date("2025-06-11T00:00:00Z")
        },
        {
            tmu_code: "EMP002",
            user_type: "employee",
            name: { first: "Prof. Sunita", last: "Singh" },
            email: "sunita.singh@tmu.ac.in",
            phone: "9876543231",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2019-03-20T00:00:00Z"),
            last_login: new Date("2025-06-10T00:00:00Z")
        },
        {
            tmu_code: "EMP003",
            user_type: "employee",
            name: { first: "Dr. Amit", last: "Gupta" },
            email: "amit.gupta@tmu.ac.in",
            phone: "9876543232",
            password: "password123",
            department: "Mechanical",
            is_active: true,
            created_at: new Date("2018-07-10T00:00:00Z"),
            last_login: new Date("2025-06-09T00:00:00Z")
        },
        {
            tmu_code: "EMP004",
            user_type: "employee",
            name: { first: "Dr. Priya", last: "Verma" },
            email: "priya.verma@tmu.ac.in",
            phone: "9876543233",
            password: "password123",
            department: "Civil",
            is_active: true,
            created_at: new Date("2021-01-05T00:00:00Z"),
            last_login: new Date("2025-06-08T00:00:00Z")
        },
        {
            tmu_code: "EMP005",
            user_type: "employee",
            name: { first: "Prof. Vikash", last: "Kumar" },
            email: "vikash.kumar@tmu.ac.in",
            phone: "9876543234",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2017-09-12T00:00:00Z"),
            last_login: new Date("2025-06-07T00:00:00Z")
        },
        {
            tmu_code: "EMP006",
            user_type: "employee",
            name: { first: "Dr. Kavita", last: "Joshi" },
            email: "kavita.joshi@tmu.ac.in",
            phone: "9876543235",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2020-05-18T00:00:00Z"),
            last_login: new Date("2025-06-06T00:00:00Z")
        },
        {
            tmu_code: "EMP007",
            user_type: "employee",
            name: { first: "Prof. Ravi", last: "Pandey" },
            email: "ravi.pandey@tmu.ac.in",
            phone: "9876543236",
            password: "password123",
            department: "Mechanical",
            is_active: true,
            created_at: new Date("2019-11-25T00:00:00Z"),
            last_login: new Date("2025-06-05T00:00:00Z")
        },
        {
            tmu_code: "EMP008",
            user_type: "employee",
            name: { first: "Dr. Neha", last: "Agarwal" },
            email: "neha.agarwal@tmu.ac.in",
            phone: "9876543237",
            password: "password123",
            department: "Civil",
            is_active: true,
            created_at: new Date("2022-02-14T00:00:00Z"),
            last_login: new Date("2025-06-04T00:00:00Z")
        },
        {
            tmu_code: "EMP009",
            user_type: "employee",
            name: { first: "Prof. Suresh", last: "Tiwari" },
            email: "suresh.tiwari@tmu.ac.in",
            phone: "9876543238",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2016-08-30T00:00:00Z"),
            last_login: new Date("2025-06-03T00:00:00Z")
        },
        {
            tmu_code: "EMP010",
            user_type: "employee",
            name: { first: "Dr. Anjali", last: "Mishra" },
            email: "anjali.mishra@tmu.ac.in",
            phone: "9876543239",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2021-06-22T00:00:00Z"),
            last_login: new Date("2025-06-02T00:00:00Z")
        },

        // Mess Staff (3 entries)
        {
            tmu_code: "STAFF001",
            user_type: "mess_staff",
            name: { first: "Ramesh", last: "Kumar" },
            email: "ramesh.kumar@tmu.ac.in",
            phone: "9876543240",
            password: "password123",
            department: "Mess Operations",
            is_active: true,
            created_at: new Date("2022-01-10T00:00:00Z"),
            last_login: new Date("2025-06-12T00:00:00Z")
        },
        {
            tmu_code: "STAFF002",
            user_type: "mess_staff",
            name: { first: "Geeta", last: "Devi" },
            email: "geeta.devi@tmu.ac.in",
            phone: "9876543241",
            password: "password123",
            department: "Mess Operations",
            is_active: true,
            created_at: new Date("2022-03-15T00:00:00Z"),
            last_login: new Date("2025-06-11T00:00:00Z")
        },
        {
            tmu_code: "STAFF003",
            user_type: "mess_staff",
            name: { first: "Mohan", last: "Singh" },
            email: "mohan.singh@tmu.ac.in",
            phone: "9876543242",
            password: "password123",
            department: "Mess Operations",
            is_active: true,
            created_at: new Date("2022-05-20T00:00:00Z"),
            last_login: new Date("2025-06-10T00:00:00Z")
        },

        // HODs (2 entries)
        {
            tmu_code: "HOD001",
            user_type: "hod",
            name: { first: "Dr. Ashok", last: "Chauhan" },
            email: "ashok.chauhan@tmu.ac.in",
            phone: "9876543243",
            password: "password123",
            department: "Computer Science",
            is_active: true,
            created_at: new Date("2015-01-01T00:00:00Z"),
            last_login: new Date("2025-06-12T00:00:00Z")
        },
        {
            tmu_code: "HOD002",
            user_type: "hod",
            name: { first: "Dr. Meera", last: "Sinha" },
            email: "meera.sinha@tmu.ac.in",
            phone: "9876543244",
            password: "password123",
            department: "Electronics",
            is_active: true,
            created_at: new Date("2016-06-15T00:00:00Z"),
            last_login: new Date("2025-06-11T00:00:00Z")
        }
    ],

    meal_timings: [
        {
            meal_type: "breakfast",
            start_time: "07:00:00",
            end_time: "09:00:00",
            per_meal_cost: 25.00,
            confirmation_deadline_hours: 12,
            confirmation_deadline_description: "Confirm by 7 PM previous day",
            is_active: true,
            updated_by: null, // Will be set to admin user
            updated_at: new Date("2025-01-01T00:00:00Z")
        },
        {
            meal_type: "lunch",
            start_time: "12:00:00",
            end_time: "14:00:00",
            per_meal_cost: 50.00,
            confirmation_deadline_hours: 2,
            confirmation_deadline_description: "Confirm by 10 AM same day",
            is_active: true,
            updated_by: null,
            updated_at: new Date("2025-01-01T00:00:00Z")
        },
        {
            meal_type: "snacks",
            start_time: "16:00:00",
            end_time: "17:30:00",
            per_meal_cost: 20.00,
            confirmation_deadline_hours: 1,
            confirmation_deadline_description: "Confirm by 3 PM same day",
            is_active: true,
            updated_by: null,
            updated_at: new Date("2025-01-01T00:00:00Z")
        },
        {
            meal_type: "dinner",
            start_time: "19:00:00",
            end_time: "21:00:00",
            per_meal_cost: 60.00,
            confirmation_deadline_hours: 4,
            confirmation_deadline_description: "Confirm by 3 PM same day",
            is_active: true,
            updated_by: null,
            updated_at: new Date("2025-01-01T00:00:00Z")
        }
    ]
};

const seedDatabase = async () => {
    let client;
    
    try {
        console.log('Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();

        console.log('Clearing existing data...');
        // Clear existing collections
        const collections = ['users', 'student_details', 'employee_details', 'meal_timings', 
                           'meal_confirmations', 'mess_subscriptions', 'one_time_bookings', 
                           'parent_bookings', 'fines'];
        
        for (const collection of collections) {
            await db.collection(collection).deleteMany({});
        }

        console.log('Seeding users...');
        // Hash passwords for all users
        for (const user of seedData.users) {
            user.password = await bcrypt.hash(user.password, 10);
        }
        
        const userResult = await db.collection('users').insertMany(seedData.users);
        const userIds = Object.values(userResult.insertedIds);
        
        console.log(`Inserted ${userIds.length} users`);

        // Get user IDs for reference
        const studentUsers = await db.collection('users').find({ user_type: 'student' }).toArray();
        const employeeUsers = await db.collection('users').find({ user_type: 'employee' }).toArray();
        const staffUsers = await db.collection('users').find({ user_type: 'mess_staff' }).toArray();
        const hodUsers = await db.collection('users').find({ user_type: 'hod' }).toArray();

        console.log('Seeding student details...');
        // Generate student details for all students
        const studentDetails = studentUsers.map((user, index) => ({
            user_id: user._id,
            student_code: `2024CSE${String(index + 1).padStart(3, '0')}`,
            enrollment_number: `EN2024${String(index + 1).padStart(3, '0')}`,
            college_name: "School of Engineering",
            course_name: ["Computer Science & Engineering", "Electronics Engineering", "Mechanical Engineering", "Civil Engineering"][index % 4],
            admitted_year: 2024,
            current_year: 1,
            hostel_details: {
                hostel_name: ["Hostel Block A", "Hostel Block B", "Hostel Block C"][index % 3],
                room_number: `${String.fromCharCode(65 + (index % 3))}${String(101 + index).padStart(3, '0')}`,
                floor: Math.floor(index / 10) + 1
            },
            personal_details: {
                father_name: `Mr. ${user.name.first} Father`,
                mother_name: `Mrs. ${user.name.first} Mother`,
                guardian_phone: `987654${String(3300 + index).padStart(4, '0')}`,
                permanent_address: `${123 + index} Main Street, ${["Delhi", "Mumbai", "Bangalore", "Chennai"][index % 4]}`,
                date_of_birth: new Date(2006, index % 12, (index % 28) + 1),
                gender: index % 2 === 0 ? "Male" : "Female",
                blood_group: ["A+", "B+", "O+", "AB+", "A-", "B-"][index % 6],
                category: ["General", "OBC", "SC", "ST"][index % 4]
            },
            academic_details: {
                semester: 2,
                cgpa: 7.0 + (index % 3),
                previous_education: "XII - CBSE",
                entrance_exam: "JEE Main"
            },
            created_at: new Date(),
            updated_at: new Date()
        }));

        await db.collection('student_details').insertMany(studentDetails);
        console.log(`Inserted ${studentDetails.length} student details`);

        console.log('Seeding employee details...');
        // Generate employee details
        const employeeDetails = employeeUsers.map((user, index) => ({
            user_id: user._id,
            employee_code: `EMP2020${String(index + 1).padStart(3, '0')}`,
            designation: ["Professor", "Associate Professor", "Assistant Professor", "Lecturer"][index % 4],
            employee_type: index % 4 === 3 ? "NON-TEACH" : "TEACH",
            employment_status: "Active",
            date_of_joining: new Date(2020 - (index % 5), (index % 12), 15),
            salary_details: {
                basic_salary: 60000 + (index * 5000),
                grade_pay: 6000 + (index * 1000),
                total_salary: 75000 + (index * 7000)
            },
            personal_details: {
                father_name: `Mr. ${user.name.first} Father`,
                spouse_name: index % 2 === 0 ? `Mrs. ${user.name.first} Spouse` : null,
                date_of_birth: new Date(1980 + (index % 10), index % 12, (index % 28) + 1),
                gender: index % 2 === 0 ? "Male" : "Female",
                blood_group: ["A+", "B+", "O+", "AB+"][index % 4],
                permanent_address: `${456 + index} Faculty Colony, TMU Campus`
            },
            academic_qualifications: {
                highest_degree: index % 3 === 0 ? "Ph.D" : "M.Tech",
                specialization: user.department,
                university: ["IIT Delhi", "IIT Mumbai", "NIT Warangal", "IIIT Hyderabad"][index % 4],
                year_of_passing: 2010 + (index % 10)
            },
            created_at: new Date(),
            updated_at: new Date()
        }));

        await db.collection('employee_details').insertMany(employeeDetails);
        console.log(`Inserted ${employeeDetails.length} employee details`);

        console.log('Seeding meal timings...');
        // Set updated_by to first HOD
        seedData.meal_timings.forEach(timing => {
            timing.updated_by = hodUsers[0]._id;
        });
        
        await db.collection('meal_timings').insertMany(seedData.meal_timings);
        console.log(`Inserted ${seedData.meal_timings.length} meal timings`);

        console.log('Seeding meal confirmations...');
        // Generate meal confirmations for the past week
        const mealConfirmations = [];
        const today = new Date();
        
        for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
            const mealDate = new Date(today);
            mealDate.setDate(today.getDate() - dayOffset);
            
            // Random confirmations from students
            const confirmedStudents = studentUsers.slice(0, 15 + (dayOffset % 5)); // Varying attendance
            
            for (const student of confirmedStudents) {
                for (const mealType of ['breakfast', 'lunch', 'dinner']) {
                    if (Math.random() > 0.3) { // 70% confirmation rate
                        mealConfirmations.push({
                            user_id: student._id,
                            meal_date: new Date(mealDate),
                            meal_type: mealType,
                            attendance: {
                                attended: Math.random() > 0.1, // 90% attendance rate
                                qr_scanned_at: Math.random() > 0.1 ? new Date(mealDate.getTime() + (Math.random() * 3600000)) : null,
                                scanner_id: Math.random() > 0.1 ? staffUsers[0]._id : null
                            },
                            notes: Math.random() > 0.8 ? "Regular meal" : null,
                            created_at: new Date(mealDate.getTime() - (Math.random() * 86400000))
                        });
                    }
                }
            }
        }
        
        await db.collection('meal_confirmations').insertMany(mealConfirmations);
        console.log(`Inserted ${mealConfirmations.length} meal confirmations`);

        console.log('Seeding subscriptions...');
        // Generate subscriptions for students
        const subscriptions = [];
        for (let i = 0; i < 15; i++) {
            const student = studentUsers[i];
            subscriptions.push({
                user_id: student._id,
                subscription_type: "hostel_student",
                meal_types: ["breakfast", "lunch", "dinner"],
                start_date: new Date("2025-06-01"),
                end_date: new Date("2025-06-30"),
                total_amount: 3900, // 25+50+60 * 30 days - discount
                payment: {
                    status: i % 3 === 0 ? "pending" : "paid",
                    reference: i % 3 === 0 ? null : `TXN2025${String(i + 1).padStart(6, '0')}`,
                    paid_at: i % 3 === 0 ? null : new Date("2025-05-25")
                },
                status: "active",
                created_at: new Date("2025-05-20"),
                updated_at: new Date("2025-05-25")
            });
        }

        // Generate employee subscriptions
        for (let i = 0; i < 8; i++) {
            const employee = employeeUsers[i];
            subscriptions.push({
                user_id: employee._id,
                subscription_type: "employee_monthly",
                meal_types: ["lunch"],
                start_date: new Date("2025-06-01"),
                end_date: new Date("2025-06-30"),
                total_amount: 1800, // 60 * 30 days
                payment: {
                    status: "paid",
                    reference: `TXN2025EMP${String(i + 1).padStart(3, '0')}`,
                    paid_at: new Date("2025-05-28")
                },
                status: "active",
                created_at: new Date("2025-05-25"),
                updated_at: new Date("2025-05-28")
            });
        }

        await db.collection('mess_subscriptions').insertMany(subscriptions);
        console.log(`Inserted ${subscriptions.length} subscriptions`);

        console.log('Seeding one-time bookings...');
        // Generate employee and guest bookings
        const oneTimeBookings = [];
        
        // Employee bookings
        for (let i = 0; i < 10; i++) {
            const employee = employeeUsers[i % employeeUsers.length];
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + (i % 7) + 1);
            
            oneTimeBookings.push({
                user_id: employee._id,
                booking_type: "employee",
                meal_date: futureDate,
                meal_type: ["breakfast", "lunch", "dinner"][i % 3],
                amount: [30, 60, 72][i % 3], // Employee rates (1.2x)
                payment: {
                    status: i % 4 === 0 ? "pending" : "paid",
                    reference: i % 4 === 0 ? null : `EMP${String(i + 1).padStart(6, '0')}`,
                    paid_at: i % 4 === 0 ? null : new Date()
                },
                attendance: {
                    attended: null,
                    scanner_id: null
                },
                notes: `Employee booking for ${futureDate.toDateString()}`,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        // Guest bookings
        for (let i = 0; i < 8; i++) {
            const bookedBy = employeeUsers[i % employeeUsers.length];
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + (i % 5) + 1);
            
            oneTimeBookings.push({
                booking_type: "guest",
                meal_date: futureDate,
                meal_type: ["lunch", "dinner"][i % 2],
                amount: [75, 90][i % 2], // Guest rates (1.5x)
                guest_details: {
                    name: `Guest ${i + 1}`,
                    phone: `987654${String(4000 + i).padStart(4, '0')}`,
                    relationship: ["Friend", "Relative", "Colleague"][i % 3]
                },
                booked_by: bookedBy._id,
                payment: {
                    status: i % 3 === 0 ? "pending" : "paid",
                    reference: i % 3 === 0 ? null : `GUEST${String(i + 1).padStart(6, '0')}`,
                    paid_at: i % 3 === 0 ? null : new Date()
                },
                attendance: {
                    attended: null,
                    scanner_id: null
                },
                notes: `Guest booking by ${bookedBy.name.first} ${bookedBy.name.last}`,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        await db.collection('one_time_bookings').insertMany(oneTimeBookings);
        console.log(`Inserted ${oneTimeBookings.length} one-time bookings`);

        console.log('Seeding parent bookings...');
        // Generate parent bookings
        const parentBookings = [];
        
        for (let i = 0; i < 6; i++) {
            const student = studentUsers[i];
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + (i % 10) + 1);
            
            const parentDetails = [
                {
                    name: `${student.name.first} Father`,
                    phone: `987654${String(5000 + i).padStart(4, '0')}`,
                    relationship: "Father"
                }
            ];

            if (i % 2 === 0) {
                parentDetails.push({
                    name: `${student.name.first} Mother`,
                    phone: `987654${String(5100 + i).padStart(4, '0')}`,
                    relationship: "Mother"
                });
            }

            parentBookings.push({
                student_id: student._id,
                meal_date: futureDate,
                meal_type: "lunch",
                parent_details: parentDetails,
                parent_count: parentDetails.length,
                per_person_cost: 60, // Parent rate (1.2x of 50)
                amount: 60 * parentDetails.length,
                payment: {
                    status: i % 3 === 0 ? "pending" : "paid",
                    reference: i % 3 === 0 ? null : `PARENT${String(i + 1).padStart(6, '0')}`,
                    paid_at: i % 3 === 0 ? null : new Date()
                },
                attendance: {
                    attended_count: null,
                    scanner_id: null
                },
                notes: `Parent visit for ${student.name.first}`,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        await db.collection('parent_bookings').insertMany(parentBookings);
        console.log(`Inserted ${parentBookings.length} parent bookings`);

        console.log('Seeding fines...');
        // Generate fines for no-shows and late cancellations
        const fines = [];
        
        // Get some meal confirmations that were marked as not attended
        const noShowConfirmations = mealConfirmations.filter(mc => mc.attendance.attended === false);
        
        for (let i = 0; i < Math.min(8, noShowConfirmations.length); i++) {
            const confirmation = noShowConfirmations[i];
            const mealCost = confirmation.meal_type === 'breakfast' ? 25 : 
                           confirmation.meal_type === 'lunch' ? 50 :
                           confirmation.meal_type === 'snacks' ? 20 : 60;
            
            fines.push({
                user_id: confirmation.user_id,
                fine_type: "no_show",
                amount: mealCost * 1.5, // 150% of meal cost
                description: `No-show fine for ${confirmation.meal_type} on ${confirmation.meal_date.toDateString()}`,
                related_confirmation_id: confirmation._id,
                payment: {
                    is_paid: i % 4 === 0,
                    paid_at: i % 4 === 0 ? new Date() : null,
                    payment_reference: i % 4 === 0 ? `FINE${String(i + 1).padStart(6, '0')}` : null,
                    paid_by: null
                },
                waiver: {
                    is_waived: false,
                    waived_at: null,
                    waived_by: null,
                    reason: null
                },
                created_at: new Date(confirmation.meal_date.getTime() + 86400000), // Next day
                updated_at: new Date(confirmation.meal_date.getTime() + 86400000)
            });
        }

        // Add some late cancellation fines
        for (let i = 0; i < 4; i++) {
            const student = studentUsers[i + 10];
            fines.push({
                user_id: student._id,
                fine_type: "late_cancellation",
                amount: 25, // 50% of lunch cost
                description: `Late cancellation fine for lunch`,
                related_confirmation_id: null,
                payment: {
                    is_paid: i % 2 === 0,
                    paid_at: i % 2 === 0 ? new Date() : null,
                    payment_reference: i % 2 === 0 ? `FINELC${String(i + 1).padStart(5, '0')}` : null,
                    paid_by: null
                },
                waiver: {
                    is_waived: false,
                    waived_at: null,
                    waived_by: null,
                    reason: null
                },
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        await db.collection('fines').insertMany(fines);
        console.log(`Inserted ${fines.length} fines`);

        console.log('Database seeding completed successfully!');
        
        // Print summary
        console.log('\nSEEDING SUMMARY:');
        console.log(`Users: ${seedData.users.length}`);
        console.log(`   - Students: ${studentUsers.length}`);
        console.log(`   - Employees: ${employeeUsers.length}`);
        console.log(`   - Mess Staff: ${staffUsers.length}`);
        console.log(`   - HODs: ${hodUsers.length}`);
        console.log(`Student Details: ${studentDetails.length}`);
        console.log(`Employee Details: ${employeeDetails.length}`);
        console.log(`Meal Timings: ${seedData.meal_timings.length}`);
        console.log(`Meal Confirmations: ${mealConfirmations.length}`);
        console.log(`Subscriptions: ${subscriptions.length}`);
        console.log(`One-time Bookings: ${oneTimeBookings.length}`);
        console.log(`Parent Bookings: ${parentBookings.length}`);
        console.log(`Fines: ${fines.length}`);

        console.log('\nSAMPLE CREDENTIALS:');
        console.log('Student: STU001 / password123');
        console.log('Employee: EMP001 / password123');
        console.log('Mess Staff: STAFF001 / password123');
        console.log('HOD: HOD001 / password123');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('Database connection closed');
        }
    }
};

// Run the seeding script
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };

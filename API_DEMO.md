# TMU Mess Management System - API Demo & Testing Guide

## Quick Start Demo

The TMU Mess Management System API is now running at: `http://localhost:5000`

### 1. Basic API Information
```bash
curl http://localhost:5000/
```

**Response:**
```json
{
  "message": "TMU Mess Management System API",
  "version": "1.0.0",
  "documentation": {
    "description": "Complete REST API for university mess management operations",
    "base_url": "/api",
    "endpoints": {
      "authentication": "/api/auth",
      "users": "/api/users", 
      "meals": "/api/meals",
      "bookings": "/api/bookings",
      "admin": "/api/admin"
    },
    "features": [
      "User Authentication & Authorization",
      "Meal Confirmation & Timing Management",
      "Booking System (Employee, Guest, Parent)",
      "Subscription Management",
      "Fine Management & Calculations",
      "Admin Dashboard & Reporting",
      "Real-time QR Code Scanning",
      "Comprehensive Data Export"
    ]
  },
  "health_check": "/health",
  "status": "operational",
  "database": "connected"
}
```

### 2. Health Check
```bash
curl http://localhost:5000/health
```

### 3. User Registration & Authentication Demo

#### Register a Student
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tmu_code": "STU001",
    "user_type": "student",
    "name": {"first": "John", "last": "Doe"},
    "email": "john.doe@tmu.ac.in",
    "phone": "9876543210",
    "password": "password123"
  }'
```

#### Register an Employee
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tmu_code": "EMP001",
    "user_type": "employee",
    "name": {"first": "Jane", "last": "Smith"},
    "email": "jane.smith@tmu.ac.in",
    "phone": "9876543211",
    "password": "password123",
    "department": "Computer Science"
  }'
```

#### Register Mess Staff
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tmu_code": "STAFF001",
    "user_type": "mess_staff",
    "name": {"first": "Admin", "last": "User"},
    "email": "admin@tmu.ac.in",
    "phone": "9876543212",
    "password": "password123"
  }'
```

#### Login and Get Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tmu_code": "STU001",
    "password": "password123"
  }'
```

**Save the access_token from the response for subsequent API calls.**

### 4. Meal Management Demo

#### Get Meal Timings
```bash
curl http://localhost:5000/api/meals/timings
```

#### Confirm a Meal (Student)
```bash
curl -X POST http://localhost:5000/api/meals/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "meal_date": "2025-06-15",
    "meal_type": "breakfast",
    "notes": "Regular breakfast"
  }'
```

#### Get User's Meal Confirmations
```bash
curl "http://localhost:5000/api/meals/confirmations?start_date=2025-06-01&end_date=2025-06-30" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get Today's Meals
```bash
curl http://localhost:5000/api/meals/today \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Booking System Demo

#### Employee Booking
```bash
curl -X POST http://localhost:5000/api/bookings/employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN_HERE" \
  -d '{
    "meal_date": "2025-06-15",
    "meal_type": "lunch",
    "notes": "One-time employee booking"
  }'
```

#### Guest Booking
```bash
curl -X POST http://localhost:5000/api/bookings/guest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN_HERE" \
  -d '{
    "meal_date": "2025-06-15",
    "meal_type": "dinner",
    "guest_details": {
      "name": "Guest Name",
      "phone": "9876543220",
      "relationship": "Friend"
    },
    "notes": "Guest visit for dinner"
  }'
```

#### Parent Booking (Student)
```bash
curl -X POST http://localhost:5000/api/bookings/parent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN_HERE" \
  -d '{
    "meal_date": "2025-06-15",
    "meal_type": "lunch",
    "parent_details": [
      {
        "name": "Father Name",
        "phone": "9876543221",
        "relationship": "Father"
      },
      {
        "name": "Mother Name", 
        "phone": "9876543222",
        "relationship": "Mother"
      }
    ],
    "notes": "Parents visiting for lunch"
  }'
```

#### Get User's Bookings
```bash
curl "http://localhost:5000/api/bookings/my-bookings?include_completed=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 6. Subscription Management Demo

#### Create Student Subscription
```bash
curl -X POST http://localhost:5000/api/bookings/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN_HERE" \
  -d '{
    "subscription_type": "hostel_student",
    "meal_types": ["breakfast", "lunch", "dinner"],
    "start_date": "2025-06-01",
    "end_date": "2025-06-30"
  }'
```

#### Create Employee Subscription
```bash
curl -X POST http://localhost:5000/api/bookings/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN_HERE" \
  -d '{
    "subscription_type": "employee_monthly",
    "meal_types": ["lunch"],
    "start_date": "2025-06-01",
    "end_date": "2025-06-30"
  }'
```

#### Get User Subscriptions
```bash
curl http://localhost:5000/api/bookings/subscriptions/my \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. User Profile Management Demo

#### Get User Profile
```bash
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Update User Profile
```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": {"first": "Updated", "last": "Name"},
    "phone": "9876543299",
    "department": "Updated Department"
  }'
```

#### Get User Dashboard
```bash
curl http://localhost:5000/api/users/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get User Fines
```bash
curl "http://localhost:5000/api/users/fines?status=unpaid" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8. Admin Operations Demo

#### Get Admin Dashboard (Requires staff/admin role)
```bash
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer STAFF_TOKEN_HERE"
```

#### Get User Statistics
```bash
curl http://localhost:5000/api/admin/users/statistics \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

#### Get Daily Meal Report
```bash
curl http://localhost:5000/api/meals/reports/daily/2025-06-12 \
  -H "Authorization: Bearer STAFF_TOKEN_HERE"
```

#### Get Outstanding Fines
```bash
curl "http://localhost:5000/api/admin/fines/outstanding?limit=50" \
  -H "Authorization: Bearer STAFF_TOKEN_HERE"
```

### 9. QR Code Scanning Demo (Staff only)

#### Scan QR Code for Attendance
```bash
curl -X POST http://localhost:5000/api/meals/scan-qr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STAFF_TOKEN_HERE" \
  -d '{
    "qr_data": "USER_ID|2025-06-12|breakfast"
  }'
```

### 10. Error Handling Examples

#### Invalid Endpoint
```bash
curl http://localhost:5000/api/invalid/endpoint
```

#### Unauthorized Access
```bash
curl http://localhost:5000/api/users/profile
```

#### Invalid Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tmu_code": "INVALID",
    "password": "wrongpassword"
  }'
```

## API Features Demonstrated

✅ **Complete Authentication System**
- User registration with role-based access
- JWT token authentication
- Password security

✅ **Meal Management**
- Meal timing configuration
- Meal confirmations with deadlines
- QR code scanning for attendance
- No-show tracking and fine calculation

✅ **Booking System**
- Employee one-time bookings
- Guest bookings with premium pricing
- Parent bookings for students
- Payment status tracking

✅ **Subscription Management**
- Monthly subscriptions for students/employees
- Different pricing tiers
- Subscription renewal system

✅ **Fine Management**
- Automatic fine calculation for no-shows
- Late cancellation penalties
- Fine waiver system for admins

✅ **Admin Dashboard**
- User statistics and management
- Revenue reporting
- Attendance analytics
- Data export capabilities

✅ **Security & Validation**
- Input validation and sanitization
- Role-based authorization
- Rate limiting
- Error handling

✅ **Database Operations**
- MongoDB with proper indexing
- Data relationships and constraints
- Aggregation pipelines for reporting

## Testing Workflow

1. **Setup**: Start with user registration for different roles
2. **Authentication**: Login and obtain JWT tokens
3. **Basic Operations**: Confirm meals, create bookings
4. **Subscriptions**: Create and manage meal subscriptions
5. **Admin Functions**: Use staff/admin tokens for management operations
6. **Error Testing**: Test validation and error responses

The API is production-ready with comprehensive error handling, security measures, and scalable architecture suitable for university mess management operations.
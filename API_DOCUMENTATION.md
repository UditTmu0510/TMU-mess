# TMU Mess Management System API Documentation

## Overview

The TMU Mess Management System is a comprehensive REST API built with Node.js, Express, and MongoDB for managing university mess operations. It provides complete functionality for user management, meal confirmations, bookings, subscriptions, and administrative operations.

**Base URL:** `http://localhost:5000/api`

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Types

- `student` - University students
- `employee` - University employees  
- `mess_staff` - Mess staff members
- `hod` - Head of Department
- `admin` - System administrators

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "tmu_code": "TEST001",
  "user_type": "student",
  "name": {
    "first": "John",
    "last": "Doe"
  },
  "email": "john.doe@tmu.ac.in",
  "phone": "9876543210",
  "password": "password123",
  "department": "Computer Science" // optional
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "684a9d5cb77c902214bfe706",
    "tmu_code": "TEST001",
    "user_type": "student",
    "name": {
      "first": "John",
      "last": "Doe"
    },
    "email": "john.doe@tmu.ac.in",
    "phone": "9876543210",
    "department": null
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "tmu_code": "TEST001",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "684a9d5cb77c902214bfe706",
    "tmu_code": "TEST001",
    "user_type": "student",
    "name": {
      "first": "John",
      "last": "Doe"
    },
    "email": "john.doe@tmu.ac.in",
    "phone": "9876543210",
    "department": null,
    "profile_image": null
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Verify Token
```http
GET /api/auth/verify-token
Authorization: Bearer <token>
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

### Meal Management Endpoints

#### Get Meal Timings
```http
GET /api/meals/timings
```

**Response:**
```json
{
  "message": "Meal timings retrieved successfully",
  "meal_timings": [
    {
      "meal_type": "breakfast",
      "start_time": "07:00:00",
      "end_time": "09:00:00",
      "per_meal_cost": 25.00,
      "confirmation_deadline_hours": 12,
      "is_active": true
    }
  ]
}
```

#### Confirm Meal
```http
POST /api/meals/confirm
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "meal_date": "2025-06-15",
  "meal_type": "breakfast",
  "notes": "Regular meal"
}
```

#### Cancel Meal Confirmation
```http
DELETE /api/meals/confirm/{confirmationId}
Authorization: Bearer <token>
```

#### Get User's Meal Confirmations
```http
GET /api/meals/confirmations?start_date=2025-06-01&end_date=2025-06-30
Authorization: Bearer <token>
```

#### Get Today's Meals
```http
GET /api/meals/today
Authorization: Bearer <token>
```

#### Get Weekly Stats
```http
GET /api/meals/weekly-stats
Authorization: Bearer <token>
```

### Staff/Admin Meal Endpoints

#### Get Daily Report
```http
GET /api/meals/reports/daily/{date}
Authorization: Bearer <token>
```
*Requires: mess_staff, hod, or admin role*

#### Scan QR Code
```http
POST /api/meals/scan-qr
Authorization: Bearer <token>
```
*Requires: mess_staff role*

**Request Body:**
```json
{
  "qr_data": "userId|meal_date|meal_type"
}
```

#### Get No-Show Users
```http
GET /api/meals/no-shows/{date}/{mealType}
Authorization: Bearer <token>
```
*Requires: mess_staff, hod, or admin role*

#### Mark Attendance Manually
```http
POST /api/meals/attendance/{confirmationId}
Authorization: Bearer <token>
```
*Requires: mess_staff role*

**Request Body:**
```json
{
  "attended": true,
  "notes": "Manual attendance marking"
}
```

### Booking Management Endpoints

#### Create Employee Booking
```http
POST /api/bookings/employee
Authorization: Bearer <token>
```
*Requires: employee role*

**Request Body:**
```json
{
  "meal_date": "2025-06-15",
  "meal_type": "lunch",
  "notes": "One-time booking"
}
```

#### Create Guest Booking
```http
POST /api/bookings/guest
Authorization: Bearer <token>
```
*Requires: employee, mess_staff, hod, or admin role*

**Request Body:**
```json
{
  "meal_date": "2025-06-15",
  "meal_type": "dinner",
  "guest_details": {
    "name": "Guest Name",
    "phone": "9876543210",
    "relationship": "Father"
  },
  "notes": "Guest visit"
}
```

#### Create Parent Booking
```http
POST /api/bookings/parent
Authorization: Bearer <token>
```
*Requires: student role*

**Request Body:**
```json
{
  "meal_date": "2025-06-15",
  "meal_type": "lunch",
  "parent_details": [
    {
      "name": "Father Name",
      "phone": "9876543210",
      "relationship": "Father"
    }
  ],
  "notes": "Parent visit"
}
```

#### Get User's Bookings
```http
GET /api/bookings/my-bookings?include_completed=true&booking_type=employee
Authorization: Bearer <token>
```

#### Get Booking by ID
```http
GET /api/bookings/{bookingId}?booking_type=one_time
Authorization: Bearer <token>
```

#### Update Payment Status
```http
PUT /api/bookings/{bookingId}/payment
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "payment_status": "paid",
  "payment_reference": "TXN123456789",
  "booking_type": "one_time"
}
```

#### Cancel Booking
```http
DELETE /api/bookings/{bookingId}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "Cancellation reason",
  "booking_type": "one_time"
}
```

### Subscription Management

#### Create Subscription
```http
POST /api/bookings/subscriptions
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "subscription_type": "hostel_student",
  "meal_types": ["breakfast", "lunch", "dinner"],
  "start_date": "2025-06-01",
  "end_date": "2025-06-30"
}
```

#### Get User Subscriptions
```http
GET /api/bookings/subscriptions/my
Authorization: Bearer <token>
```

#### Renew Subscription
```http
POST /api/bookings/subscriptions/{subscriptionId}/renew
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "new_end_date": "2025-07-31",
  "payment_reference": "TXN123456789"
}
```

### User Management Endpoints

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": {
    "first": "Updated",
    "last": "Name"
  },
  "phone": "9876543211",
  "department": "New Department"
}
```

#### Get User Dashboard
```http
GET /api/users/dashboard
Authorization: Bearer <token>
```

#### Get User Meal History
```http
GET /api/users/meal-history?limit=50
Authorization: Bearer <token>
```

#### Get User Fines
```http
GET /api/users/fines?status=unpaid
Authorization: Bearer <token>
```

#### Get User Subscriptions
```http
GET /api/users/subscriptions
Authorization: Bearer <token>
```

### Student Specific Endpoints

#### Get Student Details
```http
GET /api/users/students/details
Authorization: Bearer <token>
```
*Requires: student role*

#### Update Student Details
```http
PUT /api/users/students/details
Authorization: Bearer <token>
```
*Requires: student role*

**Request Body:**
```json
{
  "student_code": "STU001",
  "enrollment_number": "EN123456",
  "college_name": "Engineering College",
  "course_name": "Computer Science",
  "admitted_year": 2024,
  "hostel_details": {
    "hostel_name": "Hostel A",
    "room_number": "101"
  }
}
```

### Employee Specific Endpoints

#### Get Employee Details
```http
GET /api/users/employees/details
Authorization: Bearer <token>
```
*Requires: employee role*

#### Update Employee Details
```http
PUT /api/users/employees/details
Authorization: Bearer <token>
```
*Requires: employee role*

**Request Body:**
```json
{
  "employee_code": "EMP001",
  "designation": "Professor",
  "employee_type": "TEACH",
  "employment_status": "Active",
  "date_of_joining": "2020-01-15"
}
```

### Admin Management Endpoints

#### Get Admin Dashboard
```http
GET /api/admin/dashboard
Authorization: Bearer <token>
```
*Requires: mess_staff, hod, or admin role*

#### Get User Statistics
```http
GET /api/admin/users/statistics
Authorization: Bearer <token>
```
*Requires: hod or admin role*

#### Bulk Import Users
```http
POST /api/admin/users/bulk-import
Authorization: Bearer <token>
```
*Requires: hod or admin role*

**Request Body:**
```json
{
  "users": [
    {
      "tmu_code": "USER001",
      "user_type": "student",
      "name": {"first": "John", "last": "Doe"},
      "email": "john@tmu.ac.in",
      "phone": "9876543210",
      "password": "password123",
      "student_details": {
        "student_code": "STU001",
        "enrollment_number": "EN123456"
      }
    }
  ]
}
```

#### Activate User
```http
PUT /api/admin/users/{userId}/activate
Authorization: Bearer <token>
```
*Requires: hod or admin role*

#### Deactivate User
```http
PUT /api/admin/users/{userId}/deactivate
Authorization: Bearer <token>
```
*Requires: hod or admin role*

**Request Body:**
```json
{
  "reason": "Deactivation reason"
}
```

### Fine Management

#### Get Daily Fine Report
```http
GET /api/admin/fines/reports/daily/{date}
Authorization: Bearer <token>
```
*Requires: mess_staff, hod, or admin role*

#### Get Monthly Fine Report
```http
GET /api/admin/fines/reports/monthly/{year}/{month}
Authorization: Bearer <token>
```
*Requires: mess_staff, hod, or admin role*

#### Waive Fine
```http
POST /api/admin/fines/waive/{fineId}
Authorization: Bearer <token>
```
*Requires: hod or admin role*

**Request Body:**
```json
{
  "reason": "Fine waiver reason"
}
```

#### Get Outstanding Fines
```http
GET /api/admin/fines/outstanding?user_type=student&limit=100
Authorization: Bearer <token>
```
*Requires: mess_staff, hod, or admin role*

### Revenue Reports

#### Get Monthly Revenue
```http
GET /api/admin/reports/revenue/monthly/{year}/{month}
Authorization: Bearer <token>
```
*Requires: hod or admin role*

#### Get Daily Revenue
```http
GET /api/admin/reports/revenue/daily/{date}
Authorization: Bearer <token>
```
*Requires: mess_staff, hod, or admin role*

### Data Export

#### Export Meal Confirmations
```http
GET /api/admin/export/meal-confirmations/{startDate}/{endDate}
Authorization: Bearer <token>
```
*Requires: hod or admin role*

#### Export Bookings
```http
GET /api/admin/export/bookings/{startDate}/{endDate}
Authorization: Bearer <token>
```
*Requires: hod or admin role*

#### Export Users
```http
GET /api/admin/export/users
Authorization: Bearer <token>
```
*Requires: hod or admin role*

## Data Models

### User Model
```json
{
  "_id": "ObjectId",
  "tmu_code": "string",
  "user_type": "student|employee|mess_staff|hod|admin",
  "name": {
    "first": "string",
    "last": "string"
  },
  "email": "string",
  "phone": "string",
  "password": "string (hashed)",
  "department": "string",
  "profile_image": "string",
  "is_active": "boolean",
  "last_login": "Date",
  "created_at": "Date",
  "updated_at": "Date"
}
```

### Meal Confirmation Model
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "meal_date": "Date",
  "meal_type": "breakfast|lunch|snacks|dinner",
  "attendance": {
    "attended": "boolean",
    "qr_scanned_at": "Date",
    "scanner_id": "ObjectId"
  },
  "notes": "string",
  "created_at": "Date"
}
```

### Booking Model
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "booking_type": "employee|guest",
  "meal_date": "Date",
  "meal_type": "string",
  "amount": "number",
  "guest_details": {
    "name": "string",
    "phone": "string",
    "relationship": "string"
  },
  "payment": {
    "status": "pending|paid|failed|refunded",
    "reference": "string",
    "paid_at": "Date"
  },
  "attendance": {
    "attended": "boolean",
    "scanner_id": "ObjectId"
  },
  "notes": "string",
  "created_at": "Date"
}
```

### Subscription Model
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "subscription_type": "hostel_student|employee_monthly",
  "meal_types": ["string"],
  "start_date": "Date",
  "end_date": "Date",
  "total_amount": "number",
  "payment": {
    "status": "pending|paid|failed",
    "reference": "string",
    "paid_at": "Date"
  },
  "status": "active|expired|suspended",
  "created_at": "Date"
}
```

### Fine Model
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "fine_type": "no_show|late_cancellation|multiple_offense",
  "amount": "number",
  "description": "string",
  "related_confirmation_id": "ObjectId",
  "payment": {
    "is_paid": "boolean",
    "paid_at": "Date",
    "payment_reference": "string",
    "paid_by": "ObjectId"
  },
  "waiver": {
    "is_waived": "boolean",
    "waived_at": "Date",
    "waived_by": "ObjectId",
    "reason": "string"
  },
  "created_at": "Date"
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error Type",
  "details": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15-minute window per IP address
- Rate limit headers included in responses

## Security Features

- JWT authentication with access and refresh tokens
- Password hashing using bcrypt
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- Request rate limiting
- MongoDB injection protection

## Environment Variables

Required environment variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - JWT expiration time
- `FRONTEND_URL` - Frontend application URL

## Testing the API

Use the provided examples with curl or any HTTP client:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"tmu_code":"TEST001","user_type":"student","name":{"first":"John","last":"Doe"},"email":"john.doe@tmu.ac.in","phone":"9876543210","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tmu_code":"TEST001","password":"password123"}'

# Get meal timings
curl -X GET http://localhost:5000/api/meals/timings

# Get user profile (requires authentication)
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
# Guest Booking API Documentation

This document provides details on the APIs for creating and managing guest meal bookings.

---

## 1. Create Guest Meal Booking

Creates a new meal booking for a specified number of guests.

- **Endpoint**: `POST /api/bookings/guest-meal`
- **Authorization**: `student`, `employee`

### Request Body

| Field              | Type     | Description                                | Required |
| ------------------ | -------- | ------------------------------------------ | -------- |
| `booking_date`     | `String` | The date of the booking (YYYY-MM-DD).      | Yes      |
| `number_of_guests` | `Number` | The number of guests for the meal.         | Yes      |
| `meal_types`       | `Array`  | An array of meal types (e.g., `["lunch"]`). | Yes      |

### Sample Request

```json
{
  "booking_date": "2025-07-10",
  "number_of_guests": 2,
  "meal_types": ["lunch", "dinner"]
}
```

### Sample Response (Success)

```json
{
  "message": "Guest booking created successfully",
  "booking": {
    "id": "60c72b2f9b1d8c001f8e4c6a",
    "booking_date": "2025-07-10T00:00:00.000Z",
    "number_of_guests": 2,
    "meal_types": ["lunch", "dinner"],
    "total_amount": 220,
    "payment_status": "pending"
  }
}
```

---

## 5. Get Meal Prices

- **Endpoint:** `GET /api/meals/prices`
- **Description:** Retrieves the prices for all available meal types.
- **Authentication:** None
- **Request Body:** None
- **Success Response:**
  - `200 OK`
  ```json
  {
      "message": "Meal prices retrieved successfully",
      "meal_prices": [
          {
              "meal_type": "breakfast",
              "price": 25
          },
          {
              "meal_type": "lunch",
              "price": 50
          },
          {
              "meal_type": "snacks",
              "price": 20
          },
          {
              "meal_type": "dinner",
              "price": 60
          }
      ]
  }
  ```
- **Error Response:**
    - `500 Internal Server Error` on failure.
---

## 2. Get My Guest Bookings

Retrieves a list of all guest bookings made by the authenticated user.

- **Endpoint**: `GET /api/bookings/my-guest-bookings`
- **Authorization**: `student`, `employee`

### Sample Response (Success)

```json
{
  "message": "Your guest bookings retrieved successfully",
  "bookings": [
    {
      "id": "60c72b2f9b1d8c001f8e4c6a",
      "booking_date": "2025-07-10T00:00:00.000Z",
      "number_of_guests": 2,
      "meal_types": ["lunch", "dinner"]
    }
  ]
}
```

---

## 3. Generate Guest Booking QR Code

Generates a time-sensitive QR code for a specific guest booking.

- **Endpoint**: `GET /api/qr/guest-booking/:bookingId`
- **Authorization**: The user who created the booking.

### URL Parameters

| Parameter   | Type       | Description                      |
| ----------- | ---------- | -------------------------------- |
| `bookingId` | `ObjectId` | The ID of the guest booking.     |

### Sample Response (Success)

```json
{
  "message": "Guest booking QR code generated successfully",
  "qr_code": {
    "data": "eyJib29raW5nSWQiOiI2MGM3MmIyZjliMWQ4YzAwMWY4ZTRjNmEiLCJ0eXBlIjoiZ3Vlc3RfbWVhbF9hdHRlbmRhbmNlIiwiZXhwaXJlcyI6MTYyNTk0MzYwMDAwMH0=",
    "hash": "a1b2c3d4e5f6...",
    "expires": 1625943600000
  },
  "booking_id": "60c72b2f9b1d8c001f8e4c6a"
}
```

---

## 4. Scan Guest Booking QR Code

This is handled by the existing `POST /api/meals/scan-qr` endpoint, which now supports the `guest_meal_attendance` QR type.

### Sample Response (Success)

```json
{
  "message": "Guest attendance marked successfully for lunch",
  "booking_type": "guest_meal",
  "attendance": {
    "booking_id": "60c72b2f9b1d8c001f8e4c6a",
    "meal_type": "lunch",
    "number_of_guests": 2,
    "status": "ATTENDED"
  },
  "booked_by": {
    "name": {
      "first": "Aarav",
      "last": "Sharma"
    },
    "tmu_code": "STU001"
  },
  "scanned_at": "2025-07-10T12:30:00.000Z"
}

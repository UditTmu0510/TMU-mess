const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { convertToIST, getCurrentISTDate } = require('../utils/helpers');

class GuestBooking {
    constructor(data) {
        this.booked_by = new ObjectId(data.booked_by);
        this.booked_by_usertype = data.booked_by_usertype;
        this.booking_date = convertToIST(data.booking_date);
        this.number_of_guests = data.number_of_guests;
        this.meal_types = data.meal_types;
        this.total_amount = data.total_amount;
        this.payment = {
            status: 'pending',
            reference: null,
            paid_at: null
        };
        this.attendance = data.meal_types.map(mealType => ({
            meal_type: mealType,
            attended: false,
            scanned_at: null,
            scanner_id: null
        }));
        this.created_at = getCurrentISTDate();
    }

    static async create(data) {
        const db = getDB();
        const booking = new GuestBooking(data);
        const result = await db.collection('guest_bookings').insertOne(booking);
        return { ...booking, _id: result.insertedId };
    }

    static async findById(bookingId) {
        const db = getDB();
        return await db.collection('guest_bookings').findOne({ _id: new ObjectId(bookingId) });
    }

    static async findByBooker(userId) {
        const db = getDB();
        return await db.collection('guest_bookings').find({ booked_by: new ObjectId(userId) })
            .sort({ booking_date: -1 })
            .toArray();
    }

    static async markAttendance(bookingId, mealType, scannerId) {
        const db = getDB();
        const result = await db.collection('guest_bookings').updateOne(
            { 
                _id: new ObjectId(bookingId),
                'attendance.meal_type': mealType 
            },
            { 
                $set: { 
                    'attendance.$.attended': true,
                    'attendance.$.scanned_at': getCurrentISTDate(),
                    'attendance.$.scanner_id': new ObjectId(scannerId)
                } 
            }
        );
        return result;
    }

    static async markAsPaid(bookingId, scannerId) {
        const db = getDB();
        const result = await db.collection('guest_bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { 
                $set: { 
                    'payment.status': 'paid',
                    'payment.paid_at': getCurrentISTDate(),
                    'payment.payment_collected_by': new ObjectId(scannerId)
                } 
            }
        );
        return result;
    }
}

module.exports = GuestBooking;

const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');
const { connectDB } = require('../config/database');
const { getCurrentISTTime } = require('../utils/timezone');

/**
 * PaymentQR Model
 * Manages QR codes for parent booking payments
 */
class PaymentQR {
    constructor(data) {
        this.booking_id = data.booking_id;
        this.booking_type = data.booking_type; // 'parent_booking'
        this.amount = data.amount;
        this.qr_data = data.qr_data;
        this.qr_hash = data.qr_hash;
        this.expires_at = data.expires_at;
        this.is_used = data.is_used || false;
        this.payment_status = data.payment_status || 'pending'; // pending, confirmed, rejected
        this.confirmed_by = data.confirmed_by || null;
        this.confirmed_at = data.confirmed_at || null;
        this.mess_name = data.mess_name;
        this.created_at = data.created_at || new Date();
    }

    /**
     * Generate payment QR code for parent booking
     */
    static async generatePaymentQR(bookingId, amount, messName, expiryMinutes = 15) {
        const { db } = await connectDB();
        
        const currentTime = getCurrentISTTime();
        const expiresAt = new Date(currentTime.getTime() + (expiryMinutes * 60 * 1000));
        
        // Create QR data
        const qrData = {
            booking_id: bookingId,
            amount: amount,
            mess_name: messName,
            timestamp: currentTime.getTime(),
            type: 'payment_confirmation'
        };
        
        // Generate secure hash
        const qrString = JSON.stringify(qrData);
        const qrHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
            .update(qrString)
            .digest('hex');
        
        const paymentQR = new PaymentQR({
            booking_id: bookingId,
            booking_type: 'parent_booking',
            amount: amount,
            qr_data: Buffer.from(qrString).toString('base64'),
            qr_hash: qrHash,
            expires_at: expiresAt,
            mess_name: messName
        });

        const result = await db.collection('payment_qrs').insertOne(paymentQR);
        
        return { ...paymentQR, _id: result.insertedId };
    }

    /**
     * Verify and process payment QR scan
     */
    static async processPaymentScan(qrData, qrHash, messStaffId, paymentConfirmed) {
        const { db } = await connectDB();
        
        // Decode and verify QR data
        let decodedData;
        try {
            const decodedString = Buffer.from(qrData, 'base64').toString('utf8');
            decodedData = JSON.parse(decodedString);
        } catch (error) {
            throw new Error('Invalid QR code format');
        }

        // Verify hash
        const expectedHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
            .update(JSON.stringify(decodedData))
            .digest('hex');
        
        if (expectedHash !== qrHash) {
            throw new Error('QR code verification failed');
        }

        // Find the payment QR record
        const paymentQR = await db.collection('payment_qrs').findOne({
            booking_id: decodedData.booking_id,
            qr_hash: qrHash,
            is_used: false
        });

        if (!paymentQR) {
            throw new Error('Payment QR not found or already used');
        }

        // Check expiry
        if (new Date() > paymentQR.expires_at) {
            throw new Error('Payment QR has expired');
        }

        // Update payment QR status
        const paymentStatus = paymentConfirmed ? 'confirmed' : 'rejected';
        
        await db.collection('payment_qrs').updateOne(
            { _id: paymentQR._id },
            {
                $set: {
                    is_used: true,
                    payment_status: paymentStatus,
                    confirmed_by: messStaffId,
                    confirmed_at: new Date()
                }
            }
        );

        return {
            booking_id: paymentQR.booking_id,
            amount: paymentQR.amount,
            payment_status: paymentStatus,
            confirmed_by: messStaffId,
            confirmed_at: new Date()
        };
    }

    /**
     * Get payment QR by booking ID
     */
    static async getByBookingId(bookingId) {
        const { db } = await connectDB();
        
        return await db.collection('payment_qrs').findOne({
            booking_id: bookingId
        });
    }

    /**
     * Get pending payment QRs for a mess
     */
    static async getPendingPaymentsForMess(messName) {
        const { db } = await connectDB();
        
        return await db.collection('payment_qrs').find({
            mess_name: messName,
            is_used: false,
            expires_at: { $gt: new Date() }
        }).toArray();
    }

    /**
     * Get payment history for mess staff
     */
    static async getPaymentHistoryForStaff(messStaffId, limit = 50) {
        const { db } = await connectDB();
        
        return await db.collection('payment_qrs').find({
            confirmed_by: messStaffId,
            is_used: true
        })
        .sort({ confirmed_at: -1 })
        .limit(limit)
        .toArray();
    }

    /**
     * Get daily payment collection stats
     */
    static async getDailyCollectionStats(messName, date) {
        const { db } = await connectDB();
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const stats = await db.collection('payment_qrs').aggregate([
            {
                $match: {
                    mess_name: messName,
                    is_used: true,
                    confirmed_at: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        payment_status: '$payment_status',
                        confirmed_by: '$confirmed_by'
                    },
                    total_amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        return stats;
    }
}

module.exports = PaymentQR;
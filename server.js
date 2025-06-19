const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mealRoutes = require('./routes/meals');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API documentation
app.get('/', (req, res) => {
    res.json({
        message: 'TMU Mess Management System API',
        version: '1.0.0',
        documentation: {
            description: 'Complete REST API for university mess management operations',
            base_url: '/api',
            endpoints: {
                authentication: '/api/auth',
                users: '/api/users',
                meals: '/api/meals',
                bookings: '/api/bookings',
                admin: '/api/admin'
            },
            features: [
                'User Authentication & Authorization',
                'Meal Confirmation & Timing Management',
                'Booking System (Employee, Guest, Parent)',
                'Subscription Management',
                'Fine Management & Calculations',
                'Admin Dashboard & Reporting',
                'Real-time QR Code Scanning',
                'Comprehensive Data Export'
            ]
        },
        health_check: '/health',
        status: 'operational',
        database: 'connected',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.message
        });
    }

    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(409).json({
            error: 'Duplicate Entry',
            details: 'A record with this information already exists'
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid Token',
            details: 'Please provide a valid authentication token'
        });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler for all other routes
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({
            error: 'API Route Not Found',
            details: `Cannot ${req.method} ${req.originalUrl}`,
            available_endpoints: ['/api/auth', '/api/users', '/api/meals', '/api/bookings', '/api/admin']
        });
    } else {
        res.status(404).json({
            error: 'Route Not Found',
            details: `Cannot ${req.method} ${req.originalUrl}`,
            tip: 'Try accessing the root endpoint "/" for API documentation'
        });
    }
});

const PORT = process.env.PORT || 8000;

// Start server
const startServer = async () => {
    try {
        // Start server first, then attempt DB connection
        app.listen(PORT, '127.0.0.1', () => {
            console.log(`🚀 TMU Mess Management API Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Server URL: http://localhost:${PORT}`);
        });
        
        // Attempt DB connection in background
        try {
            await connectDB();
            console.log('✅ Database connected successfully');
        } catch (dbError) {
            console.warn('⚠️ Database connection failed, server running without DB:', dbError.message);
        }
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;

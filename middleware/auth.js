const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { verifyToken, extractTokenFromHeader } = require('../config/auth');

const authenticateToken = async (req, res, next) => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        
        if (!token) {
            return res.status(401).json({
                error: 'Access Denied',
                details: 'No authentication token provided'
            });
        }

        const decoded = verifyToken(token);
        const db = getDB();
        
        // Fetch user details from database
        const user = await db.collection('users').findOne({
            _id: new ObjectId(decoded.userId),
            is_active: true
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid Token',
                details: 'User not found or inactive'
            });
        }

        req.user = {
            id: user._id,
            tmu_code: user.tmu_code,
            user_type: user.user_type,
            email: user.email,
            name: user.name,
            department: user.department
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token Verification Failed',
            details: error.message
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.user_type)) {
            return res.status(403).json({
                error: 'Access Forbidden',
                details: `Required role: ${roles.join(' or ')}`
            });
        }
        next();
    };
};

const optionalAuth = async (req, res, next) => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        
        if (token) {
            const decoded = verifyToken(token);
            const db = getDB();
            
            const user = await db.collection('users').findOne({
                _id: new ObjectId(decoded.userId),
                is_active: true
            });

            if (user) {
                req.user = {
                    id: user._id,
                    tmu_code: user.tmu_code,
                    user_type: user.user_type,
                    email: user.email,
                    name: user.name,
                    department: user.department
                };
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    optionalAuth
};

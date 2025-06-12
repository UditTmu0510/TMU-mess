const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tmu_mess_management_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const generateTokens = (payload) => {
    const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'tmu-mess-api',
        audience: 'tmu-mess-app'
    });

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'tmu-mess-api',
        audience: 'tmu-mess-app'
    });

    return { accessToken, refreshToken };
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'tmu-mess-api',
            audience: 'tmu-mess-app'
        });
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
};

module.exports = {
    generateTokens,
    verifyToken,
    extractTokenFromHeader,
    JWT_SECRET
};

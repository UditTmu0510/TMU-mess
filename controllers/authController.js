const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const StudentDetail = require('../models/StudentDetail');
const EmployeeDetail = require('../models/EmployeeDetail');
const { generateTokens, verifyToken, extractTokenFromHeader } = require('../config/auth');

const authController = {
    // User registration
    register: async (req, res) => {
        try {
            const { tmu_code, student_code, user_type, name, email, phone, password, department } = req.body;

            // Check if user already exists
            const existingUser = await User.findByTMUCode(tmu_code);
            if (existingUser) {
                return res.status(409).json({
                    error: 'User Already Exists',
                    details: 'A user with this TMU code already exists'
                });
            }

            const existingEmail = await User.findByEmail(email);
            if (existingEmail) {
                return res.status(409).json({
                    error: 'Email Already Exists',
                    details: 'A user with this email already exists'
                });
            }

            // Create user
            const userData = {
                tmu_code,
                student_code: user_type === 'student' ? student_code : null,
                user_type,
                name: {
                    first: name.first,
                    last: name.last
                },
                email: email.toLowerCase(),
                phone,
                password,
                department,
                is_active: true
            };

            const user = await User.create(userData);

            // Generate tokens
            const tokenPayload = {
                userId: user._id,
                tmu_code: user.tmu_code,
                user_type: user.user_type,
                email: user.email
            };

            const { accessToken, refreshToken } = generateTokens(tokenPayload);

            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: user._id,
                    tmu_code: user.tmu_code,
                    user_type: user.user_type,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    department: user.department
                },
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                error: 'Registration Failed',
                details: error.message
            });
        }
    },

    // User login
    login: async (req, res) => {
        try {
            const { tmu_code, password } = req.body;

            if (!tmu_code || !password) {
                return res.status(400).json({
                    error: 'Missing Credentials',
                    details: 'TMU code and password are required'
                });
            }

            // Find user
            const user = await User.findByTMUCode(tmu_code);
            if (!user) {
                return res.status(401).json({
                    error: 'Invalid Credentials',
                    details: 'TMU code or password is incorrect'
                });
            }

            // Check if user is active
            if (!user.is_active) {
                return res.status(401).json({
                    error: 'Account Deactivated',
                    details: 'Your account has been deactivated. Please contact admin.'
                });
            }

            // Validate password
            const isPasswordValid = await User.validatePassword(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    error: 'Invalid Credentials',
                    details: 'TMU code or password is incorrect'
                });
            }

            // Generate tokens
            const tokenPayload = {
                userId: user._id,
                tmu_code: user.tmu_code,
                user_type: user.user_type,
                email: user.email
            };

            const { accessToken, refreshToken } = generateTokens(tokenPayload);

            res.json({
                message: 'Login successful',
                user: {
                    id: user._id,
                    tmu_code: user.tmu_code,
                    user_type: user.user_type,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    department: user.department,
                    profile_image: user.profile_image
                },
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                error: 'Login Failed',
                details: error.message
            });
        }
    },

    // Refresh token
    refreshToken: async (req, res) => {
        try {
            const { refresh_token } = req.body;

            if (!refresh_token) {
                return res.status(400).json({
                    error: 'Missing Token',
                    details: 'Refresh token is required'
                });
            }

            // Verify refresh token
            const decoded = verifyToken(refresh_token);
            
            // Find user
            const user = await User.findById(decoded.userId);
            if (!user || !user.is_active) {
                return res.status(401).json({
                    error: 'Invalid Token',
                    details: 'User not found or inactive'
                });
            }

            // Generate new tokens
            const tokenPayload = {
                userId: user._id,
                tmu_code: user.tmu_code,
                user_type: user.user_type,
                email: user.email
            };

            const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

            res.json({
                message: 'Token refreshed successfully',
                tokens: {
                    access_token: accessToken,
                    refresh_token: newRefreshToken
                }
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({
                error: 'Token Refresh Failed',
                details: error.message
            });
        }
    },

    // Verify token
    verifyToken: async (req, res) => {
        try {
            const token = extractTokenFromHeader(req.headers.authorization);
            
            if (!token) {
                return res.status(401).json({
                    error: 'No Token',
                    details: 'No authentication token provided'
                });
            }

            const decoded = verifyToken(token);
            const user = await User.findById(decoded.userId);

            if (!user || !user.is_active) {
                return res.status(401).json({
                    error: 'Invalid Token',
                    details: 'User not found or inactive'
                });
            }

            res.json({
                valid: true,
                user: {
                    id: user._id,
                    tmu_code: user.tmu_code,
                    user_type: user.user_type,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {
            res.status(401).json({
                valid: false,
                error: 'Token Verification Failed',
                details: error.message
            });
        }
    },

    // Forgot password
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    error: 'Missing Email',
                    details: 'Email address is required'
                });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                // Don't reveal if email exists for security
                return res.json({
                    message: 'If an account with this email exists, a password reset link has been sent.'
                });
            }

            // In a real implementation, you would:
            // 1. Generate a secure reset token
            // 2. Store it in database with expiration
            // 3. Send email with reset link
            
            // For now, we'll just return success
            res.json({
                message: 'If an account with this email exists, a password reset link has been sent.'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                error: 'Password Reset Failed',
                details: 'Unable to process password reset request'
            });
        }
    },

    // Reset password
    resetPassword: async (req, res) => {
        try {
            const { reset_token, new_password } = req.body;

            if (!reset_token || !new_password) {
                return res.status(400).json({
                    error: 'Missing Data',
                    details: 'Reset token and new password are required'
                });
            }

            if (new_password.length < 6) {
                return res.status(400).json({
                    error: 'Invalid Password',
                    details: 'Password must be at least 6 characters long'
                });
            }

            // In a real implementation, you would:
            // 1. Verify the reset token
            // 2. Check if it's not expired
            // 3. Find the associated user
            // 4. Update the password

            res.json({
                message: 'Password reset successfully'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                error: 'Password Reset Failed',
                details: error.message
            });
        }
    },

    // Change password (authenticated)
    changePassword: async (req, res) => {
        try {
            const token = extractTokenFromHeader(req.headers.authorization);
            
            if (!token) {
                return res.status(401).json({
                    error: 'No Token',
                    details: 'Authentication required'
                });
            }

            const decoded = verifyToken(token);
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                return res.status(400).json({
                    error: 'Missing Data',
                    details: 'Current password and new password are required'
                });
            }

            if (new_password.length < 6) {
                return res.status(400).json({
                    error: 'Invalid Password',
                    details: 'New password must be at least 6 characters long'
                });
            }

            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(404).json({
                    error: 'User Not Found',
                    details: 'User account not found'
                });
            }

            // Verify current password
            const isCurrentPasswordValid = await User.validatePassword(current_password, user.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    error: 'Invalid Current Password',
                    details: 'Current password is incorrect'
                });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(new_password, salt);

            // Update password
            await User.updateById(decoded.userId, {
                password_hash: newPasswordHash
            });

            res.json({
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                error: 'Password Change Failed',
                details: error.message
            });
        }
    }
};

module.exports = authController;

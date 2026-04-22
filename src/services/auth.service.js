const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { HTTP_STATUS, MESSAGES } = require('../constants');
const getEmailQueue = require("../queues/email.queue");
const { EMAIL_JOBS } = require("../workers/email.worker");
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');
const { SOCKET_EVENTS } = require('../constants/socket.events');

// Helper - generate secure refresh token
const generateSecureRefreshToken = () => {
    return crypto.randomBytes(64).toString('hex');
};

const register = async ({ name, email, password }) => {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser){
        const error = new Error(MESSAGES.AUTH.EMAIL_EXISTS);
        error.status = HTTP_STATUS.CONFLICT;
        throw error;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new User
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        },
    });

    // Notify admin in real time
    try {
        const io = getIO();
        io.to(`admin`).emit(SOCKET_EVENTS.NEW_USER_REGISTERED, {
            message: `New user registered: ${name}`,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        logger.warn('Socket emit failed:', { error: error.message });
    }

    // Add welcome email job to the queue
    await getEmailQueue().add(EMAIL_JOBS.WELCOME, { user }, {delay: 1000}); // Send after 1 second

    // Generate JWT token
    const token = generateAccessToken({ id: user.id });

    return { user, token };
}

/**
 * @description Logs in a user with email and password
 * @param {Object} param0 - Object containing email and password
 * @returns {Object} - Object containing user data and JWT token
 * @throws {Error} - Throws error if email is not found or password is incorrect
 */

const login = async ({ email, password }) => {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const error = new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
        error.status = HTTP_STATUS.UNAUTHORIZED;
        throw error;
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        const error = new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
        error.status = HTTP_STATUS.UNAUTHORIZED;
        throw error;
    }

    // Generate secure refresh token
    const refreshToken = generateSecureRefreshToken();

    // Store refrsh token in database
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });
    
    // Generate JWT token
    const accessToken = generateAccessToken({ id: user.id });
    return { 
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        }, 
        accessToken,
        refreshToken,
    };
};

const refreshAccessToken = async (refreshToken) => {
    if (!refreshToken) {
        const error = new Error(MESSAGES.AUTH.REFRESH_TOKEN_MISSING);
        error.status = HTTP_STATUS.UNAUTHORIZED;
        throw error;
    }

    // Find user with this refresh token
    const user = await prisma.user.findUnique({ 
        where: { refreshToken },
        select: { 
            id: true,
            name: true,
            email: true,
            role: true, 
        },
    });

    if (!user) {
        const error = new Error(MESSAGES.AUTH.REFRESH_TOKEN_INVALID);
        error.status = HTTP_STATUS.UNAUTHORIZED;
        throw error;
    }

    // Token rotation - generate new refresh token on every refresh
    const newRefreshToken = generateSecureRefreshToken();
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
    });

    // Generate new access token
    const accessToken = generateAccessToken({ id: user.id });

    return {
        user,
        accessToken,
        refreshToken: newRefreshToken,
    };
};

const logout = async (userId) => {
    // Invalidate refresh token in database
    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
    });
};

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout
}


const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { HTTP_STATUS, MESSAGES } = require('../constants');

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

    // Generate JWT token
    const token = generateToken({ id: user.id });

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
    
    // Generate JWT token
    const token = generateToken({ id: user.id });
    return { 
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
        }, 
        token, 
    };
}

module.exports = {
    register,
    login,
}


const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_TOKEN_EXPIRES_IN } = require('../config/index');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const generateAccessToken = (payload) => {
    return jwt.sign(
        payload, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const generateRefreshToken = (payload) => {
    return jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_TOKEN_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if(error.name === 'TokenExpiredError') {
            const err = new Error(MESSAGES.AUTH.TOKEN_EXPIRED);
            err.statusCode = HTTP_STATUS.UNAUTHORIZED;
            // flag to indicate token expired vs invalid
            err.expired = true;
            throw err;
        }
        const err = new Error(MESSAGES.AUTH.TOKEN_INVALID);
        err.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw err;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
};
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/index');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const generateToken = (payload) => {
    return jwt.sign(
        payload, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        const err = new Error(MESSAGES.AUTH.TOKEN_INVALID);
        err.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw err;
    }
};

module.exports = {
    generateToken,
    verifyToken,
};
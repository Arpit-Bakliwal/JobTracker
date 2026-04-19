const { HTTP_STATUS, MESSAGES } = require('../constants');
const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
    // Use error's status code or default to 500
    const statusCode = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || MESSAGES.INTERNAL_SERVER_ERROR;

    logger.error(`[Error] ${req.method} ${req.path} - ${message}`, {
        statusCode,
        stack: err.stack
    });

    res.status(statusCode).json({
        success: false,
        message,
        // Show stack trace in development mode
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = {
    errorMiddleware,
};
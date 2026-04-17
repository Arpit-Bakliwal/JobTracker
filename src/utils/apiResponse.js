const { HTTP_STATUS, MESSAGES } = require('../constants');

class ApiResponse {
    static success(
        res, 
        data = {}, 
        message = MESSAGES.SUCCESS, 
        statusCode = HTTP_STATUS.OK
    ) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    static error(
        res, 
        message = MESSAGES.SOMETHING_WENT_WRONG, 
        statusCode = HTTP_STATUS.BAD_REQUEST
    ) {
        return res.status(statusCode).json({
            success: false,
            message,
            data: null,
        });
    }
}

module.exports = ApiResponse;
const { HTTP_STATUS, MESSAGES } = require('../constants');
const { success } = require('../utils/apiResponse');

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
        }));

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: MESSAGES.VALIDATION_FAILED,
            errors,
        });
    }

    // Replace req.body with the validated and parsed data
    req.body = result.data;
    next();
};

module.exports = validate;
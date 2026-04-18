const { asyncHandler } = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AuthService = require('../services/auth.service');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const registerUser = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body);
    return ApiResponse.success(
        res,
        result,
        MESSAGES.AUTH.REGISTER_SUCCESS,
        HTTP_STATUS.CREATED
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body);
    return ApiResponse.success(
        res,
        result,
        MESSAGES.AUTH.LOGIN_SUCCESS,
        HTTP_STATUS.OK
    );
});

module.exports = {
    registerUser,
    loginUser,
};
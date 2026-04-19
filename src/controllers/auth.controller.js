const { asyncHandler } = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AuthService = require('../services/auth.service');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const registerUser = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.success(
        res,
        {
            user: result.user,
            accessToken: result.accessToken,
        },
        MESSAGES.AUTH.REGISTER_SUCCESS,
        HTTP_STATUS.CREATED
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body);

    // Set refresh token in httpOnly cookie    
    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return ApiResponse.success(
        res,
        {
            user: result.user,
            accessToken: result.accessToken,
        },
        MESSAGES.AUTH.LOGIN_SUCCESS,
        HTTP_STATUS.OK
    );
});

const refresh = asyncHandler(async (req, res) => {
    const refreshToken  = req.cookies?.refreshToken;
    const result = await AuthService.refreshAccessToken(refreshToken);

    // rotate refresh token cookie
    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(
        res,
        {
            user: result.user,
            accessToken: result.accessToken,
        },
        MESSAGES.AUTH.TOKEN_REFRESHED,
        HTTP_STATUS.OK
    );
});

const logout = asyncHandler(async (req, res) => {
    await AuthService.logout(req.user.id);

    // Clear refresh access token cookie
    res.clearCookie("refreshToken");

    return ApiResponse.success(
        res,
        null,
        MESSAGES.AUTH.LOGOUT_SUCCESS
    );
});

module.exports = {
    registerUser,
    loginUser,
    refresh,
    logout
};
const { asyncHandler } = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const { HTTP_STATUS, MESSAGES } = require("../constants");
const adminService = require("../services/admin.service");

const getAllUsers = asyncHandler(async (req, res) => {
    const result = await adminService.getAllUsers(req.query);
    return ApiResponse.success(res, result, MESSAGES.ADMIN.USERS_FETCHED, HTTP_STATUS.OK);
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await adminService.getUserById(req.params.id);
    return ApiResponse.success(res, user, MESSAGES.ADMIN.USER_FETCHED, HTTP_STATUS.OK);
});

const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;
    const updatedUser = await adminService.updateUserRole(req.params.id, role, req.user.id);
    return ApiResponse.success(res, updatedUser, MESSAGES.ADMIN.USER_ROLE_UPDATED, HTTP_STATUS.OK);
});

const deleteUser = asyncHandler(async (req, res) => {
    await adminService.deleteUser(req.params.id, req.user.id);
    return ApiResponse.success(res, null, MESSAGES.ADMIN.USER_DELETED, HTTP_STATUS.OK);
});

module.exports = {
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser,
};
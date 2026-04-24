const { asyncHandler } = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const jobService = require('../services/job.service');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const createJob = asyncHandler(async (req, res) => {
    const job = await jobService.createJob(req.body, req.user.id);
    return ApiResponse.success(
        res,
        job,
        MESSAGES.JOB.JOB_CREATED,
        HTTP_STATUS.CREATED,
    );
});

const getJobs = asyncHandler(async (req, res) => {
    const result = await jobService.getJobsByUser(req.user.id, req.query);
    return ApiResponse.success(
        res,
        result,
        MESSAGES.JOB.FETCHED,
        HTTP_STATUS.OK,
    );
});

const getJob = asyncHandler(async (req, res) => {
    const job = await jobService.getJobById(req.params.id, req.user.id);
    return ApiResponse.success(
        res,
        job,
        MESSAGES.JOB.FETCHED_ONE,
        HTTP_STATUS.OK,
    );
});

const updateJob = asyncHandler(async (req, res) => {
    const job = await jobService.updateJob(req.params.id, req.body, req.user.id);
    return ApiResponse.success(
        res,
        job,
        MESSAGES.JOB.UPDATED,
        HTTP_STATUS.OK,
    );
});

const deleteJob = asyncHandler(async (req, res) => {
    await jobService.deleteJob(req.params.id, req.user.id);
    return ApiResponse.success(
        res,
        null,
        MESSAGES.JOB.DELETED,
        HTTP_STATUS.NO_CONTENT,
    );
});

const getStats = asyncHandler(async (req, res) => {
    const results = await jobService.getJobStats(req.user.id, req.user.role);
    return ApiResponse.success(
        res,
        results,
        MESSAGES.JOB.STATS_FETCHED,
        HTTP_STATUS.OK
    )
});

module.exports = {
    createJob,
    getJobs,
    getJob,
    updateJob,
    deleteJob,
    getStats,
};
  
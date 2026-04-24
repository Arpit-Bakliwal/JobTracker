const { asyncHandler } = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const aiService = require('../services/ai.service');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const analyzeJob = asyncHandler(async (req, res) => {
    const { jobDescription, userSkills } = req.body;
    
    const results = await aiService.analyzeJobMatch(jobDescription, userSkills);
    return ApiResponse.success(res, results, MESSAGES.AI.ANALYSIS_COMPLETE);
});

const getInterviewQuestions = asyncHandler(async (req, res) => {
    const { jobTitle, skills } = req.body;

    const questions = await aiService.generateInterviewQuestions(jobTitle, skills);
    return ApiResponse.success(res, { questions }, MESSAGES.AI.QUESTIONS_GENERATED);
});

const improveResumeBullet = asyncHandler(async (req, res) => {
    const { bulletPoint, jobTitle } = req.body;

    const improvedBullet = await aiService.improveResumeBullet(bulletPoint, jobTitle);
    return ApiResponse.success(res, { improvedBullet }, MESSAGES.AI.BULLET_IMPROVED);
});

module.exports = {
    analyzeJob,
    getInterviewQuestions,
    improveResumeBullet,
};
const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const {
    analyzeJobSchema,
    interviewQuestionsSchema,
    resumeBulletSchema,
} = require('../validations/ai.validation');
const {
    analyzeJob,
    getInterviewQuestions,
    improveResumeBullet,
} = require('../controllers/ai.controller');

router.use(authenticate); // All AI routes require authentication
router.use(aiLimiter); // Apply rate limiting to all AI routes

// Analyze job match
router.post('/analyze', validate(analyzeJobSchema), analyzeJob);
router.post('/interview-questions', validate(interviewQuestionsSchema), getInterviewQuestions);
router.post('/improve-bullet', validate(resumeBulletSchema), improveResumeBullet);

module.exports = router;

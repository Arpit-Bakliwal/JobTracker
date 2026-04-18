const router = require('express').Router();
const validate = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');
const { registerUser, loginUser } = require('../controllers/auth.controller');

// Register route
router.post('/register', authLimiter, validate(registerSchema), registerUser);

// Login route
router.post('/login', authLimiter, validate(loginSchema), loginUser);

module.exports = router;
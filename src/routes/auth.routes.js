const router = require('express').Router();
const validate = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');
const { registerUser, loginUser, refresh, logout } = require('../controllers/auth.controller');
const { authenticate } = require("../middleware/auth.middleware");

// Register route
router.post('/register', authLimiter, validate(registerSchema), registerUser);
// Login route
router.post('/login', authLimiter, validate(loginSchema), loginUser);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);


module.exports = router;
const router = require('express').Router();
const validate = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');
const { registerUser, loginUser } = require('../controllers/auth.controller');

// Register route
router.post('/register', validate(registerSchema), registerUser);

// Login route
router.post('/login', validate(loginSchema), loginUser);

module.exports = router;
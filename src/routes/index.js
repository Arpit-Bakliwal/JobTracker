const router = require('express').Router();
const authRoutes = require('./auth.routes');
const jobRoutes = require('./job.routes');

// Mount auth routes
router.use('/auth', authRoutes);
// Mount job routes
router.use('/jobs', jobRoutes);

router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Job Application Tracker API',
        version: 'v1',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
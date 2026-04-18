const router = require('express').Router();
const authRoutes = require('./auth.routes');
const jobRoutes = require('./job.routes');
const adminRoutes = require('./admin.routes');

// Mount auth routes
router.use('/auth', authRoutes);
// Mount job routes
router.use('/jobs', jobRoutes);
// Mount admin routes
router.use('/admin', adminRoutes);

router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Job Application Tracker API',
        version: 'v1',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
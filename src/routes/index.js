const router = require('express').Router();
const authRoutes = require('./auth.routes');
const jobRoutes = require('./job.routes');
const adminRoutes = require('./admin.routes');
// const { sendWelcomeEmail } = require('../services/email.service');
// const { asyncHandler } = require('../utils/asyncHandler');

// Mount auth routes
router.use('/auth', authRoutes);
// Mount job routes
router.use('/jobs', jobRoutes);
// Mount admin routes
router.use('/admin', adminRoutes);

// Temparary route to test email sending
// router.get("/test-email", asyncHandler(async (req, res) => {
//     await sendWelcomeEmail({
//         name: "Arpit Bakliwal",
//         email: "arpit.bakliwal011@gmail.com"
//     });
//     res.json({ message: 'Test email sent successfully' });
// }));

router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Job Application Tracker API',
        version: 'v1',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
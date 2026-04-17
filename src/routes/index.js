const router = require('express').Router();

// We'll add auth, job, ai routes here in the future
// For now just add base route to verify everything is working

router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Job Application Tracker API',
        version: 'v1',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
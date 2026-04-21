const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createJobSchema, updateJobSchema } = require('../validations/job.validation');
const {
    createJob,
    getJobs,
    getJob,
    updateJob,
    deleteJob,
    getStats
} = require('../controllers/job.controller');

// All routes are authenticated
router.use(authenticate);

router.route('/').get(getJobs).post(validate(createJobSchema), createJob);
router.get("/stats", getStats);
router.route('/:id').get(getJob).put(validate(updateJobSchema), updateJob).delete(deleteJob);

module.exports = router;
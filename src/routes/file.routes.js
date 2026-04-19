const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../config/multer');
const { exportCSV, importCSV, exportExcel } = require('../controllers/file.controller');

router.use(authenticate);

// Export all jobs as CSV
router.get('/export/csv', exportCSV);
router.get('/export/excel', exportExcel);

// Import jobs from CSV
router.post('/import/csv', upload.single('file'), importCSV);

module.exports = router;
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants');
const {
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser,
} = require('../controllers/admin.controller');

// All Admin routes are authenticated and authorized for ADMIN role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.route('/users').get(getAllUsers);
router.route('/users/:id').get(getUserById).delete(deleteUser);
router.route('/users/:id/role').patch(updateUserRole);

module.exports = router;
const prisma = require("../config/database");
const { getIO } = require("../config/socket");
const { HTTP_STATUS, MESSAGES, ROLES } = require("../constants");
const { SOCKET_EVENTS } = require("../constants/socket.events");
const getEmailQueue = require('../queues/email.queue');
const { EMAIL_JOBS } = require('../workers/email.worker');

const getAllUsers = async (query = {}) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || undefined;

    const where = {
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: { jobs: true },
                },
            },
            orderBy: { name: 'asc' },
            skip,
            take: limit,
        }),
    ]);

    return {
        users,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
        },
    };
};

const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            jobs: {
                orderBy: { createdAt: 'desc' },
                take: 5, // Limit to latest 5 jobs for preview
            },
            _count: {
                select: { jobs: true },
            },
        },
    });

    if (!user) {
        const error = new Error(MESSAGES.AUTH.USER_NOT_FOUND);
        error.status = HTTP_STATUS.NOT_FOUND;
        throw error;
    }
    return user;
};

const updateUserRole = async (userId, newRole, adminId) => {
    // Prevent admin from changing their own role
    if (userId === adminId) {
        const error = new Error(MESSAGES.ADMIN.CHANGE_OWN_ROLE_FORBIDDEN);
        error.status = HTTP_STATUS.FORBIDDEN;
        throw error;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        const error = new Error(MESSAGES.AUTH.USER_NOT_FOUND);
        error.status = HTTP_STATUS.NOT_FOUND;
        throw error;
    }

    // Validate Role
    if (!Object.values(ROLES).includes(newRole)) {
        const error = new Error(MESSAGES.ROLE.INVALID);
        error.status = HTTP_STATUS.BAD_REQUEST;
        throw error;
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });

    // Notify affected user in real time
    try {
        const io = getIO();
        io.to(`user:${userId}`).emit(SOCKET_EVENTS.ROLE_UPDATED, {
            message: `Your role has been updated to ${newRole}`,
            newRole
        });
    } catch (error) {
        logger.warn('Socket emit failed:', { error: error.message });
    }

    return updatedUser;
};

const deleteUser = async (userId, adminId) => {
    // Prevent admin from deleting their own account
    if (userId === adminId) {
        const error = new Error(MESSAGES.ADMIN.DELETE_SELF_FORBIDDEN);
        error.status = HTTP_STATUS.FORBIDDEN;
        throw error;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        const error = new Error(MESSAGES.AUTH.USER_NOT_FOUND);
        error.status = HTTP_STATUS.NOT_FOUND;
        throw error;
    }

    // Queue account deletion email before deleting the user
    await getEmailQueue().add(EMAIL_JOBS.ACCOUNT_DELETION, { user });

    return await prisma.user.delete({
        where: { id: userId },
    });
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser,
};

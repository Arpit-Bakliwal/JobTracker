const prisma = require("../config/database");
const { HTTP_STATUS, MESSAGES, CACHE_TTL, ROLES,  VALID_JOB_STATUS} = require("../constants");
const { getCache, setCache, deleteCacheByPattern } = require("../config/redis");
const getEmailQueue = require('../queues/email.queue');
const { EMAIL_JOBS } = require('../workers/email.worker');
const { getIO } = require("../config/socket");
const { SOCKET_EVENTS } = require("../constants/socket.events");

// Helper - Generate cache key for jobs list based on userId and query parameters
const buildCacheKeyForJobs = (userId, query={}) => {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const status = query.status || 'all';
    const search = query.search || 'none';
    return `jobs:${userId}:page:${page}:limit:${limit}:status:${status}:search:${search}`;
};

const createJob = async (data, userId) => {
    const job = await prisma.job.create({
        data: {
            ...data,
            userId,
            appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
        }
    });
    // Invalidate related cache - Jobs list for the user (since a new job is added)
    await deleteCacheByPattern(`jobs:${userId}:*`);
    return job;
};

const getJobsByUser = async (userId, query = {}) => {
    const cacheKey = buildCacheKeyForJobs(userId, query);

    // Try to get from cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
        console.log('Cache HIT:', cacheKey);
        return cachedData;
    }
    
    console.log('Cache MISS:', cacheKey);

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = query.status || undefined;
    const search = query.search || undefined;

    const where = {
        userId,
        ...(status && { status }),
        ...(search && {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    // Run both query in parallel to optimize performance - Total count and actual data
    const [total, jobs] = await Promise.all([
        prisma.job.count({ where }),
        prisma.job.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
    ]);

    const result = {
        jobs,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
        },
    };

    // Cache the result with TTL
    await setCache(cacheKey, result, CACHE_TTL);
    
    return result;
};

const getJobById = async (jobId, userId) => {
    const job = await prisma.job.findFirst({
        where: { id: jobId, userId },
    });
    if (!job) {
        const error = new Error(MESSAGES.JOB.NOT_FOUND);
        error.status = HTTP_STATUS.NOT_FOUND;
        throw error;
    }
    return job;
};

const updateJob = async (jobId, data, userId) => {
    const existingJob = await getJobById(jobId, userId);

    const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: {
            ...data,
            appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
        },
    });

    // Send job status update email if status has changed 
    if (data.status && data.status !== existingJob.status) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });

        await getEmailQueue().add(EMAIL_JOBS.JOB_STATUS, { user, job: updatedJob });

        // Real time notification to admin
        try {
            const io = getIO();
            io.to('admin').emit(SOCKET_EVENTS.JOB_STATUS_CHANGED,{
                message: `${user.name} updated job status to ${data.status}`,
                job: {
                    id: updateJob.id,
                    title: updateJob.title,
                    company: updateJob.company,
                    status: updatedJob.status,
                    userId
                },
            });
        } catch (error) {
            logger.warn('Socket emit failed:', { error: error.message });
        }
    }

    // Invalidate related cache - Jobs list for the user (since a job is updated)
    await deleteCacheByPattern(`jobs:${userId}:*`);
    return updatedJob;
};

const deleteJob = async (jobId, userId) => {
    const job = await getJobById(jobId, userId);
    await prisma.job.delete({
        where: { id: job.id },
    });

    // Invalidate related cache - Jobs list for the user (since a job is deleted)
    await deleteCacheByPattern(`jobs:${userId}:*`);
};

const getJobStats = async (userId, role) => {
    // if Admin then all jobs else user's own job
    const where = role === ROLES.ADMIN ? {} : { userId };
    const [total, countByStatus, recentJobs] = await Promise.all([
        prisma.job.count({
            where
        }),
        prisma.job.groupBy({
            by: ['status'],
            where: where,
            _count: { _all: true}
        }),
        prisma.job.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                company: true,
                title: true,
                status: true,
                appliedAt: true,
                createdAt: true,
            }
        }),
    ]);

    let jobStats = {
        total,
    };

    const allValidStatuses = Object.keys(VALID_JOB_STATUS);

    const counts = countByStatus.reduce((acc, countState) => {
        acc[countState.status] = countState._count._all;
        return acc;
    }, {});

    const countWithDefault = Object.fromEntries(
        allValidStatuses.map(s => [s, counts[s] ?? 0])
    );
    
    return { ...jobStats, ...countWithDefault, recentJobs};
};

const getPublicJobs = async ({ page, limit, status, search }) => {
    const skip = (page - 1) * limit

    const where = {
        ...(status && { status }),
        ...(search && {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ]
        })
    };

    const [jobs, total] = await Promise.all([
        prisma.job.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                salary: true,
                status: true,
                jobUrl: true,
                appliedAt: true,
                createdAt: true,
                // no userId, no notes — safe for public
            }
        }),
        prisma.job.count({ where })
    ]);

    return {
        jobs,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
    };
};

const getPublicJobById = async (jobId) => {
    const job = await prisma.job.findUnique({
        where: { id: jobId},
        select: {
            id: true,
            title: true,
            company: true,
            location: true,
            salary: true,
            status: true,
            jobUrl: true,
            notes: true,
            appliedAt: true,
            createdAt: true,
        }
    });

    return job;
};

module.exports = {
    createJob,
    getJobsByUser,
    getJobById,
    updateJob,
    deleteJob,
    getJobStats,
    getPublicJobs,
    getPublicJobById,
};
const prisma = require("../config/database");
const { HTTP_STATUS, MESSAGES } = require("../constants");

const createJob = async (data, userId) => {
    const job = await prisma.job.create({
        data: {
            ...data,
            userId,
            appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
        }
    });
    return job;
};

const getJobsByUser = async (userId, query = {}) => {
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

    return {
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
    const job = await getJobById(jobId, userId);
    const updatedJob = await prisma.job.update({
        where: { id: job.id },
        data: {
            ...data,
            appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
        },
    });
    return updatedJob;
};

const deleteJob = async (jobId, userId) => {
    const job = await getJobById(jobId, userId);
    await prisma.job.delete({
        where: { id: job.id },
    });
};

module.exports = {
    createJob,
    getJobsByUser,
    getJobById,
    updateJob,
    deleteJob,
};
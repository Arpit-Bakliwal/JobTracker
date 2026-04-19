const { Readable } = require("stream");
const csvParser = require('csv-parser');
const { format } = require('fast-csv');
const prisma = require('../config/database');
const { HTTP_STATUS, VALID_JOB_STATUS, MESSAGES } = require('../constants');

// CSV Export
const exportJobsToCSV = async (userId) => {
    const jobs = await prisma.job.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            company: true,
            location: true,
            jobUrl: true,
            status: true,
            salary: true,
            notes: true,
            appliedAt: true,
            createdAt: true,
        },
    });

    // Transform Data for CSV
    const csvData = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location || '',
        jobUrl: job.jobUrl || '',
        status: job.status,
        salary: job.salary || '',
        notes: job.notes || '',
        appliedAt: job.appliedAt.toISOString().split('T')[0], // YYYY-MM-DD
        createdAt: job.createdAt.toISOString().split('T')[0],
    }));

    return csvData;
};

// CSV Import
const importJobsFromCSV = async (fileBuffer, userId) => {
    const results = [];
    const errors = [];
    const skipped = [];

    // Convert buffer to readable stream
    const stream = Readable.from(fileBuffer.toString());

    await new Promise((resolve, reject) => {
        stream
            .pipe(csvParser())
            .on('data', (row) => {
                // Validate Required Field
                if(!row.title || !row.company){
                    errors.push({
                        row,
                        error: 'title and company are required'
                    });

                    return;
                }

                // Validate status
                const status = row.status?.toUpperCase();

                results.push({
                    title: row.title.trim(),
                    company: row.company.trim(),
                    location: row.location?.trim() || null,
                    jobUrl: row.jobUrl?.trim() || null,
                    status: VALID_JOB_STATUS.includes(status) ? status : 'APPLIED',
                    salary: row.salary?.trim() || null,
                    notes: row.notes?.trim() || null,
                    appliedAt: row.appliedAt ? new Date(row.appliedAt) : new Date(),
                    userId,
                });
            })
            .on('error', reject)
            .on('end', resolve)
    });

    if(results.length === 0 && errors.length > 0){
        const error = new Error(MESSAGES.FILE_UPLOAD.NO_VALID_ROW_IN_CSV);
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error; 
    }

    // Fetch Existing jobs for this user
    const existingJobs = await prisma.job.findMany({
        where: { userId },
        select: { title: true, company: true }
    });

    // Build a set for fast lookup
    const existingJobSet = new Set(existingJobs.map((j) => `${j.title.toLowerCase()}:${j.company.toLowerCase()}`));

    // filter out duplicates
    const newJobs = [];
    results.forEach((job) => {
        const key = `${job.title.toLowerCase()}:${job.company.toLowerCase()}`;
        if(existingJobSet.has(key)){
            skipped.push({ title: job.title, company: job.company });
        } else {
            newJobs.push(job);
            // Add to set immediately — handles duplicates within same CSV
            existingSet.add(key);
        }
    });

    if(newJobs.length === 0){
        return {
            imported: 0,
            skipped: skipped.length,
            failed: errors.length,
            message: 'All jobs already exist',
        };
    }

    // Bulk insert valid rows
    const created = await prisma.job.createMany({
        data: newJobs,
        skipDuplicates: true,
    });

    return {
        imported: created.count,
        skipped: skipped.length,
        failed: errors.length,
        errors: errors.length ? errors : undefined
    };
};

module.exports = { exportJobsToCSV, importJobsFromCSV};
const { QueueScheduler } = require('bullmq');
const cron = require('node-cron');
const prisma = require('../config/database');
const getEmailQueue = require('./email.queue');
const { EMAIL_JOBS } = require('../workers/email.worker');

const startScheduler = () => {
    // Run every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily job to check pending applications...');

        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Find all users with pending applications older than 7 days
            const usersWithPendingApps = await prisma.user.findMany({
                where: {
                    jobs: {
                        some: {
                            status: 'APPLIED',
                            appliedAt: { lte: sevenDaysAgo },
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    jobs: {
                        where: {
                            status: 'APPLIED',
                            appliedAt: { lte: sevenDaysAgo },
                        },
                        select: {
                            title: true,
                            company: true,
                            appliedAt: true,
                        },
                    },
                },
            });

            console.log(`Found ${usersWithPendingApps.length} users with pending applications.`);

            // Add reminder email job for each user
            for (const user of usersWithPendingApps) {
                await getEmailQueue().add(
                    EMAIL_JOBS.PENDING_APPLICATIONS, 
                    { 
                        user: {
                            email: user.email,
                            name: user.name,
                        },
                        jobs: user.jobs 
                    }, 
                ); // Send after 1 second
            }

            console.log("Pending application reminder jobs added to the queue.");
        } catch (error) {
            console.error("Error occurred while scheduling pending application reminders:", error);
        }
    });

    console.log('Scheduler started and will run daily at 9 AM.');
};

module.exports = {
    startScheduler,
};
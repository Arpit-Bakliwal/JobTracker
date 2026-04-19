require('dotenv').config();
const { connectRedis, redisClient } = require('./src/config/redis');
const app = require('./src/app');
const { PORT } = require('./src/config');
const prisma = require('./src/config/database');
const { verifyEmailConnection } = require("./src/services/email.service");
const { initEmailWorker, getEmailWorker } = require('./src/workers/email.worker');
const { startScheduler } = require('./src/queues/scheduler');
const logger = require('./src/utils/logger');

const startServer = async () => {
    const server = app.listen(PORT, () => {
        logger.info(`🚀 Server is running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    server.on('error', (error) => {
        if(error.code === 'EADDRINUSE') {
            logger.error(`Port ${PORT} is already in use. Please free the port and try again.`);
        } else {
            logger.error('Server error:', error);
        }
        process.exit(1);
    });

    // Connect to the database
    try {
        await prisma.$connect();
        logger.info('✅ Connected to the database successfully');
    } catch (error) {
        logger.error('FATAL: ❌ Failed to connect to the database:', error.message);
        process.exit(1);
    }

    // Connect to Redis
    await connectRedis();
    
    // Verify email transporter configuration
    await verifyEmailConnection();

    // Initialize email worker
    initEmailWorker();

    // Start the scheduler for periodic tasks
    startScheduler();

    // Graceful Shutdown
    process.on('SIGINT', async () => {
        logger.info("Shutting down gracefully...");
        const emailWorker = getEmailWorker();
        if (emailWorker) {
            await emailWorker.close(); // Stop accepting new jobs and finish processing current ones
        }
        await prisma.$disconnect();
        await redisClient.quit();
        server.close(() => {
            logger.info("Server closed. Goodbye!");
            process.exit(0);
        });
    });

    process.on('SIGTERM', async () => {
        logger.info("Shutting down gracefully...");
        const emailWorker = getEmailWorker();
        if (emailWorker) {
            await emailWorker.close(); // Stop accepting new jobs and finish processing current ones
        }
        await prisma.$disconnect();
        await redisClient.quit();
        server.close(() => {
            logger.info("Server closed. Goodbye!");
            process.exit(0);
        });
    });
};

startServer();
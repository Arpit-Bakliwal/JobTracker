require('dotenv').config();
const http = require('http');
const { connectRedis, redisClient } = require('./src/config/redis');
const app = require('./src/app');
const { PORT } = require('./src/config');
const prisma = require('./src/config/database');
const { verifyEmailConnection } = require("./src/services/email.service");
const { initEmailWorker, getEmailWorker } = require('./src/workers/email.worker');
const { startScheduler } = require('./src/queues/scheduler');
const { initSocket, getIO } = require("./src/config/socket");
const logger = require('./src/utils/logger');

const startServer = async () => {
    // Create http server from Express app
    const httpServer = http.createServer(app);

    // Initialize Socket.io on HTTP server
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
        logger.info(`🚀 Server is running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    httpServer.on('error', (error) => {
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
        // Close socket.io first - disconnect all socket clients
        const io = getIO();
        io.close();

        // Close EMail Worker
        const emailWorker = getEmailWorker();
        if (emailWorker) {
            await emailWorker.close(); // Stop accepting new jobs and finish processing current ones
        }
        await prisma.$disconnect();
        await redisClient.quit();

        // Force exit after 3 seconds if httpServer.close() hangs
        const forceExit = setTimeout(() => {
            logger.warn("Forcing exit after timeout")
            process.exit(0)
        }, 3000);

        httpServer.close(() => {
            logger.info("Server closed. Goodbye!");
            clearTimeout(forceExit);
            process.exit(0);
        });
    });

    process.on('SIGTERM', async () => {
        logger.info("Shutting down gracefully...");
         // Close socket.io first - disconnect all socket clients
        const io = getIO();
        io.close();

        // Close EMail Worker
        const emailWorker = getEmailWorker();
        if (emailWorker) {
            await emailWorker.close(); // Stop accepting new jobs and finish processing current ones
        }
        await prisma.$disconnect();
        await redisClient.quit();

        // Force exit after 3 seconds if httpServer.close() hangs
        const forceExit = setTimeout(() => {
            logger.warn("Forcing exit after timeout")
            process.exit(0)
        }, 3000);

        httpServer.close(() => {
            logger.info("Server closed. Goodbye!");
            clearTimeout(forceExit);
            process.exit(0);
        });
    });
};

startServer();
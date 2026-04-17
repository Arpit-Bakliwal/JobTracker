require('dotenv').config();
const { connectRedis, redisClient } = require('./src/config/redis');
const app = require('./src/app');
const { PORT } = require('./src/config');
const prisma = require('./src/config/database');

const startServer = async () => {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    server.on('error', (error) => {
        if(error.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Please free the port and try again.`);
        } else {
            console.error('Server error:', error);
        }
        process.exit(1);
    });

    try {
        await prisma.$connect();
        console.log('✅ Connected to the database successfully');
    } catch (error) {
        console.error('FATAL: ❌ Failed to connect to the database:', error.message);
        process.exit(1);
    }

    // Connect to Redis
    await connectRedis();

    // Graceful Shutdown
    process.on('SIGINT', async () => {
        console.log("Shutting down gracefully...");
        await prisma.$disconnect();
        await redisClient.quit();
        server.close(() => {
            console.log("Server closed. Goodbye!");
            process.exit(0);
        });
    });

    process.on('SIGTERM', async () => {
        console.log("Shutting down gracefully...");
        await prisma.$disconnect();
        await redisClient.quit();
        server.close(() => {
            console.log("Server closed. Goodbye!");
            process.exit(0);
        });
    });
};

startServer();
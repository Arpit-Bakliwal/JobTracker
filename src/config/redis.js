const redis = require('redis');
const { REDIS_URL, REDIS_HOST, REDIS_PORT, NODE_ENV } = require('./index');
const { MESSAGES } = require('../constants');
const logger = require('../utils/logger');

// Shared BullMQ connection configuration
// BullMQ needs host and port separately - not url
const bullMQConnection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
};

const redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                logger.error('Redis: Max reconnection attempts reached. Giving up.');
                return new Error(MESSAGES.REDIS.MAX_RECONNECTION_ATTEMPTS);
            }

            // Reconnect after retries * 500 ms (500ms, 1000ms, 1500ms, etc.)
            return retries * 500;
        }
    }
});

redisClient.on('connect', () => {
    logger.info('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err.message);
});

redisClient.on('reconnecting', (delay, attempt) => {
    logger.info(`Redis reconnecting... Attempt ${attempt}, next attempt in ${delay}ms`);
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        logger.error('Failed to connect to Redis:', error.message);
        process.exit(1);
    }
};

// Helper - Get Cached value
const getCache = async (key) => {
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        logger.error('Error getting cache from Redis:', error.message);
        return null;
    }
};

// Helper - Set Cache with expiration (in seconds) = TTL
const setCache = async (key, value, ttl = 300) => {
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
        logger.error('Error setting cache in Redis:', error.message);
    }
};

// Helper - Delete Cache
const deleteCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        logger.error('Error deleting cache from Redis:', error.message);
    }
};

// Helper - Delete All Keys Matching a Pattern
// Used to clear all cached queries for a user
const deleteCacheByPattern = async (pattern) => {
    try {
        if (NODE_ENV === "development") {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Deleted ${keys.length} cache entries matching pattern: ${pattern}`);
            }
        } else {
            // In production, use SCAN to avoid blocking Redis
            const keys = [];
            for await (const key of redisClient.scanIterator({ MATCH: pattern })) {
                keys.push(key);
            }
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Deleted ${keys.length} cache entries matching pattern: ${pattern}`);
            }
        }
    } catch (error) {
        logger.error('Error deleting cache by pattern from Redis:', error.message);
    }
};

module.exports = { 
    redisClient, 
    connectRedis, 
    bullMQConnection,
    getCache, 
    setCache, 
    deleteCache, 
    deleteCacheByPattern, 
};
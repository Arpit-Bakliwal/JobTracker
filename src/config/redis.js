const redis = require('redis');
const { REDIS_URL } = require('./index');
const { MESSAGES } = require('../constants');

const redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                console.error('Redis: Max reconnection attempts reached. Giving up.');
                return new Error(MESSAGES.REDIS.MAX_RECONNECTION_ATTEMPTS);
            }

            // Reconnect after retries * 500 ms (500ms, 1000ms, 1500ms, etc.)
            return retries * 500;
        }
    }
});

redisClient.on('connect', () => {
    console.log('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err.message);
});

redisClient.on('reconnecting', (delay, attempt) => {
    console.log(`Redis reconnecting... Attempt ${attempt}, next attempt in ${delay}ms`);
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error.message);
        process.exit(1);
    }
};

// Helper - Get Cached value
const getCache = async (key) => {
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Error getting cache from Redis:', error.message);
        return null;
    }
};

// Helper - Set Cache with expiration (in seconds) = TTL
const setCache = async (key, value, ttl = 300) => {
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
        console.error('Error setting cache in Redis:', error.message);
    }
};

// Helper - Delete Cache
const deleteCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        console.error('Error deleting cache from Redis:', error.message);
    }
};

// Helper - Delete All Keys Matching a Pattern
// Used to clear all cached queries for a user
const deleteCacheByPattern = async (pattern) => {
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`Deleted ${keys.length} cache entries matching pattern: ${pattern}`);
        }
    } catch (error) {
        console.error('Error deleting cache by pattern from Redis:', error.message);
    }
};

module.exports = { 
    redisClient, 
    connectRedis, 
    getCache, 
    setCache, 
    deleteCache, 
    deleteCacheByPattern, 
};
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
    }
};

module.exports = { redisClient, connectRedis };
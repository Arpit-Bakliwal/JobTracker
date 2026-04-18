const {redisClient} = require("../config/redis");
const {HTTP_STATUS, MESSAGES} = require('../constants');
const { success } = require('../utils/apiResponse');


// Create a sliding window rate limiter using Redis
const createRateLimiter = (limit, windowSeconds, message) => {
    return async (req, res, next) => {
        const key = `rate_limit:${req.ip}:${req.path}`;

        try {
            const now = Date.now();
            const windowStart = now - (windowSeconds * 1000);
            
            // Remove timestamps that are outside the current window
            await redisClient.zRemRangeByScore(key, '-inf', windowStart);
            // Get the current count of requests in the window
            const requestCount = await redisClient.zCard(key);

            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', Math.max(limit - requestCount, 0));
            res.setHeader('X-RateLimit-Reset', Math.ceil(windowSeconds));

            if (requestCount >= limit) {
                return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                    success: false,
                    message,
                    data: null
                });
            }

            // Add the current request timestamp to the sorted set
            await redisClient.zAdd(key, [
                {
                    score: now,
                    value: `req:${now}:${Math.random().toString(36).substr(2, 9)}`,
                },
            ]);
        
            // Set an expiration for the key to automatically clean up old entries
            await redisClient.expire(key, windowSeconds);
            next();
        } catch (error) {
            console.error('Error in rate limiter:', error.message);
            // In case of Redis error, allow the request to proceed (fail open)
            next();
        }
    };
}

// General API Rate Limiter - 100 requests per 15 minutes
const apiLimiter = createRateLimiter(100, 15 * 60, MESSAGES.TOO_MANY_REQUESTS);

// Auth API Rate Limiter - More strict - 10 requests per 15 minutes
const authLimiter = createRateLimiter(10, 15 * 60, MESSAGES.AUTH.RATE_LIMIT_EXCEEDED);


// AI rate limit - protect OpenAI API - 10 requests per hour
const aiLimiter = createRateLimiter(10, 60 * 60, MESSAGES.AI.RATE_LIMIT_EXCEEDED);

module.exports = { apiLimiter, authLimiter, aiLimiter };
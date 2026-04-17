const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,

    // Database configuration
    DATABASE_URL: process.env.DATABASE_URL,

    // Redis configuration
    REDIS_URL: process.env.REDIS_URL,

    // JWT configuration
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

    // OpenAI configuration
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

// validate critical config on startup
const requiredConfig = ['DATABASE_URL', 'JWT_SECRET'];

requiredConfig.forEach((key) => {
    if (!config[key]) {
        console.error(`FATAL: Missing required config: ${key}`);
        process.exit(1);
    }
});

module.exports = config;
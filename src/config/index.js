const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,

    // Frontend
    CLIENT_URL: process.env.CLIENT_URL.split(','),

    // Database configuration
    DATABASE_URL: process.env.DATABASE_URL,

    // Redis configuration
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT || 6381,


    // JWT configuration
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',

    // OpenAI configuration
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Email configuration
    SMTP_HOST: process.env.EMAIL_HOST,
    SMTP_PORT: process.env.EMAIL_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
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
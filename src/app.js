const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const routes = require('./routes');
const { errorMiddleware } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { NODE_ENV } = require('./config');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: false, // Disable to allow loading resources from different origins
}));

// CORS middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3005",
    credentials: true,
}));

// Compression middleware before all other middleware to ensure responses are compressed
app.use(compression());

// Request logging middleware
const morganStream = {
    write: (message) => logger.http(message.trim()), // Trim to remove extra newline
};
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply API rate limiter to all API routes
app.use('/api/', apiLimiter);

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// All API routes
app.use('/api/v1', routes);

// Global error handling middleware
app.use(errorMiddleware);

module.exports = app;
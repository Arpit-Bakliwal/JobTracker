const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { errorMiddleware } = require('./middleware/error.middleware');

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

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
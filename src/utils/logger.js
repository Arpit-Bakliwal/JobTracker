const winston = require('winston');
const { NODE_ENV } = require('../config');

const logger = winston.createLogger({
    level: NODE_ENV === 'production' ? 'warn' : 'http',
    levels: {
        ...winston.config.npm.levels,
        http: 3,
    },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        NODE_ENV === 'production' ? winston.format.json() : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })
        )
    ),
    transports: [
        new winston.transports.Console(),
        ...(NODE_ENV === 'production' ? [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' }),
        ] : [])
    ]
});

module.exports = logger;
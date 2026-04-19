const { Server } = require('socket.io');
const logger = require("../utils/logger");
const { verifyToken } = require("../utils/jwt");
const { ROLES } = require("../constants");
const prisma = require('./database');
const { NODE_ENV } = require("./index");

let io = null;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: NODE_ENV === "development" ? '*' : process.env.CLIENT_URL,
            credentials: true,
        },
        // Fallback to long polling if websocket fails
        transports: ["websocket", "polling"]
    });

    // Auth middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if(!token){
                return next(new Error("Authentication required"));
            }

            const decoded = verifyToken(token);

            const user = await prisma.user.findUnique({
                where: {id: decoded.id},
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                }
            });

            if (!user){
                return next(new Error("User not found"));
            }

            // Attach user to socket
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} — User: ${socket.user.name}`);

        // Join personal room - for user specific notifications
        socket.join(`user:${socket.user.id}`);

        // If admin - join admin room
        if(socket.user.role === ROLES.ADMIN){
            socket.join("admin");
            logger.info(`Admin joined admin room: ${socket.user.name}`);
        }

        // Handle disconnect
        socket.on("disconnect", (reason) => {
            logger.info(`Socket disconnected: ${socket.id} — Reason: ${reason}`);
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error: ${error.message}`);
        });
    });

    logger.info('Socket.io initialized successfully');
    return io;
};

const getIO = () => {
    if(!io){
        throw new Error('Socket.io is not initialized');
    }
    return io;
}

module.exports = {
    initSocket,
    getIO
};
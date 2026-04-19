const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/database');
const { asyncHandler } = require('../utils/asyncHandler');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const authenticate = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error(MESSAGES.AUTH.TOKEN_MISSING);
        error.status = HTTP_STATUS.UNAUTHORIZED;
        throw error;
    }

    // Extract token from header "Bearer <token>"
    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = verifyToken(token);
    } catch (error) {
        // Tell client to use refresh token if access token expired
        if(error.expired){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: MESSAGES.AUTH.TOKEN_EXPIRED,
                expired: true,
                data: null,
            });
        }
        throw error;
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({ 
        where: { id: decoded.id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        }, 
    });

    if (!user) {
        const error = new Error(MESSAGES.AUTH.USER_NOT_FOUND);
        error.status = HTTP_STATUS.UNAUTHORIZED;
        throw error;
    }

    // Attach user to request object for downstream handlers
    req.user = user;
    next();
});

// Role based authorization factory function
const authorize = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)) {
            const error = new Error(MESSAGES.ADMIN.FORBIDDEN);
            error.status = HTTP_STATUS.FORBIDDEN;
            throw error;
        }
        next();
    }
};

module.exports = { authenticate, authorize };

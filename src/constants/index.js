const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const MESSAGES = {
  // Generic
  SUCCESS: 'Success',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Not authorized',
  FORBIDDEN: 'Access denied',
  VALIDATION_ERROR: 'Validation error',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  INTERNAL_SERVER_ERROR: 'Internal server error',

  // Auth
  AUTH: {
    REGISTER_SUCCESS: 'Registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'Email already registered',
    TOKEN_MISSING: 'Not authorized, no token',
    TOKEN_INVALID: 'Not authorized, token is invalid',
    USER_NOT_FOUND: 'User not found',
  },

  // Jobs
  JOB: {
    CREATED: 'Job created successfully',
    FETCHED: 'Jobs fetched successfully',
    FETCHED_ONE: 'Job fetched successfully',
    UPDATED: 'Job updated successfully',
    DELETED: 'Job deleted successfully',
    NOT_FOUND: 'Job not found',
  },

  // AI
  AI: {
    ANALYSIS_COMPLETE: 'Job analysis complete',
    QUESTIONS_GENERATED: 'Interview questions generated',
  },

  // Redis
  REDIS: {
    MAX_RECONNECTION_ATTEMPTS: 'Max reconnection attempts reached. Giving up.',
  }
};

module.exports = { HTTP_STATUS, MESSAGES };
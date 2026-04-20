# 🎯 Job Tracker API

A production-grade REST API built with Node.js, featuring authentication, real-time notifications, AI integration, background jobs, and comprehensive file operations.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Design Decisions](#design-decisions)
- [Project Structure](#project-structure)

---

## Overview

Job Tracker API helps developers track their job applications with features like AI-powered job match analysis, real-time notifications, automated email reminders, and exportable reports.

Built to demonstrate production-grade Node.js development patterns including caching, queuing, rate limiting, RBAC, and WebSockets.

---

## Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20 | Server runtime |
| Framework | Express.js | HTTP framework |
| Database | PostgreSQL 15 | Primary data store |
| ORM | Prisma 5 | Database access layer |
| Cache | Redis 7 | Caching + Rate limiting + Queues |
| Queue | BullMQ | Background job processing |
| Auth | JWT + bcryptjs | Authentication |
| Real-time | Socket.io | WebSocket notifications |
| AI | OpenAI GPT-4o-mini | Job analysis + Interview questions |
| Email | Nodemailer | Transactional emails |
| Validation | Zod | Request validation + sanitization |
| Logging | Winston + Morgan | Structured logging |
| Scheduler | node-cron | Scheduled background jobs |

---

## Architecture

```
Client (React)
      ↓
   Express
      ↓
┌─────────────────────────────────┐
│           Middleware             │
│  helmet → cors → compression    │
│  morgan → rateLimit → validate  │
│  protect → authorize            │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  Routes → Controllers           │
│  (thin layer, no business logic)│
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│           Services              │
│  (all business logic lives here)│
└─────────────────────────────────┘
      ↓           ↓          ↓
PostgreSQL      Redis      OpenAI
(Prisma ORM)  (Cache +   (AI features)
              Queues +
              RateLimit)
```

### Request Flow

```
Request → helmet → cors → compression → morgan
        → rateLimit → express.json
        → route match
        → validate(zodSchema)
        → protect (JWT verify + DB user check)
        → authorize (role check)
        → controller → service → database
        → ApiResponse.success()
        → error caught by asyncHandler → errorMiddleware
```

---

## Features

### 🔐 Authentication
- JWT access tokens (15 minute expiry)
- Refresh token rotation (7 day expiry)
- httpOnly cookie for refresh token security
- bcrypt password hashing (12 salt rounds)
- Silent token refresh support

### 👥 Role Based Access Control
- `USER` — manage own job applications
- `ADMIN` — manage all users, view system data
- Middleware factory pattern for flexible role guards

### 💼 Job Management
- Full CRUD with ownership verification
- Pagination, search, and status filtering
- Parallel DB queries with `Promise.all`
- Redis caching with pattern-based invalidation

### ⚡ Redis Caching
- Job list caching with 5 minute TTL
- Unique cache keys per user + query combination
- KEYS in development, SCAN in production
- Graceful degradation if Redis unavailable

### 🛡️ Rate Limiting
- Custom sliding window implementation using Redis sorted sets
- No third party rate limit package
- Separate limits: API (100/15min), Auth (10/15min), AI (10/15min)
- Atomic operations — no race conditions under concurrent load

### 📧 Email System
- BullMQ queue based email processing
- Exponential backoff retry (3 attempts: 1s, 2s, 4s)
- Welcome email on registration
- Job status change notifications
- Account deletion notifications
- Development mode logs instead of sending

### ⏰ Scheduled Jobs
- node-cron daily scheduler at 9am
- Finds applications pending > 7 days
- Queues reminder emails via BullMQ
- Each email is independent job — one failure doesn't affect others

### 🤖 AI Integration
- Job match analyzer with score and verdict
- Interview question generator with difficulty levels
- Resume bullet point improver with ATS keywords
- Structured JSON responses enforced
- OpenAI specific error handling (429, 503)

### 🔌 WebSockets
- Socket.io on existing HTTP server
- JWT authentication for socket connections
- Personal user rooms for targeted notifications
- Admin room for dashboard events
- Real-time: role updates, new registrations, job status changes

### 📁 File Operations
- CSV export — streamed directly to response
- CSV import — duplicate detection with O(1) Set lookup
- Excel export — dynamic columns, styled headers, summary sheet
- PDF report — stats dashboard + job table with status colors

---

## Prerequisites

- Node.js v20+
- Docker (for PostgreSQL and Redis)
- OpenAI API key (for AI features)
- Gmail account with App Password (for emails)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/job-tracker.git
cd job-tracker/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Start Docker containers

```bash
# Create isolated network
docker network create jobtracker-network

# Start PostgreSQL
docker run \
  --name jobtracker-postgres \
  --network jobtracker-network \
  -e POSTGRES_DB=jobtracker \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5433:5432 \
  -v jobtracker_postgres_data:/var/lib/postgresql/data \
  -d postgres:15

# Start Redis
docker run \
  --name jobtracker-redis \
  --network jobtracker-network \
  -p 6381:6379 \
  -v jobtracker_redis_data:/data \
  -d redis:7-alpine
```

### 5. Run database migrations

```bash
npx prisma migrate dev
```

### 6. Start development server

```bash
npm run dev
```

Server starts at `http://localhost:5050`

### 7. Run tests

```bash
npm test
npm run test:coverage
```

---

## Environment Variables

```bash
# Server
NODE_ENV=development
PORT=5050

# Database
DATABASE_URL=postgresql://admin:password@localhost:5433/jobtracker?connection_limit=5&pool_timeout=10

# Redis
REDIS_URL=redis://localhost:6381
REDIS_HOST=localhost
REDIS_PORT=6381

# JWT
JWT_SECRET=             # generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=         # from platform.openai.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=              # your gmail
SMTP_PASS=              # gmail app password
EMAIL_FROM=             # "Job Tracker <your@gmail.com>"

# Client
CLIENT_URL=http://localhost:3000
```

---

## API Reference

### Base URL
```
http://localhost:5050/api/v1
```

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login user |
| POST | `/auth/refresh` | ❌ | Refresh access token via cookie |
| POST | `/auth/logout` | ✅ | Logout and invalidate refresh token |

### Job Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/jobs` | ✅ | Get all jobs (paginated) |
| POST | `/jobs` | ✅ | Create job application |
| GET | `/jobs/:id` | ✅ | Get single job |
| PUT | `/jobs/:id` | ✅ | Update job |
| DELETE | `/jobs/:id` | ✅ | Delete job |

**Query Parameters for GET /jobs:**
```
page     → page number (default: 1)
limit    → items per page (default: 10)
status   → filter by status (APPLIED|SCREENING|INTERVIEW|OFFER|REJECTED|WITHDRAWN)
search   → search by title or company
```

### Admin Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/admin/users` | ✅ | ADMIN | Get all users |
| GET | `/admin/users/:id` | ✅ | ADMIN | Get user with jobs |
| PATCH | `/admin/users/:id/role` | ✅ | ADMIN | Update user role |
| DELETE | `/admin/users/:id` | ✅ | ADMIN | Delete user |

### AI Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ai/analyze` | ✅ | Analyze job match |
| POST | `/ai/interview-questions` | ✅ | Generate interview questions |
| POST | `/ai/improve-bullet` | ✅ | Improve resume bullet point |

### File Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/files/export/csv` | ✅ | Export jobs as CSV |
| GET | `/files/export/excel` | ✅ | Export jobs as Excel |
| GET | `/files/export/pdf` | ✅ | Export job report as PDF |
| POST | `/files/import/csv` | ✅ | Import jobs from CSV |

### Response Format

All endpoints return consistent response shape:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

Validation error:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Design Decisions

### Why Custom Rate Limiting Over express-rate-limit?
Built sliding window rate limiter using Redis sorted sets. Each request stored with timestamp as score — `ZREMRANGEBYSCORE` removes expired entries, `ZCARD` counts active requests. Prevents boundary attacks possible with fixed window. Uses `KEYS` in development, `SCAN` in production to avoid blocking Redis.

### Why Refresh Token As Random Bytes Not JWT?
JWT refresh tokens can be decoded exposing user data. If JWT secret is compromised — attacker can forge JWT tokens. Random bytes stored in DB are opaque and immune to secret compromise. Database lookup is the only validation method.

### Why asyncHandler Utility?
Eliminates try/catch in every controller. Wraps async functions in `Promise.resolve().catch(next)` — any thrown error automatically reaches Express error middleware. Controllers stay thin and readable.

### Why Service Layer Separation?
Controllers handle HTTP concerns only (req/res). Services handle business logic only. Same service can be called from HTTP controllers, WebSocket handlers, scheduled jobs, or CLI tools without modification.

### Why Redis Sorted Sets For Rate Limiting?
`ZADD` is atomic — no race conditions under concurrent load. Score is timestamp — natural expiry tracking. `ZREMRANGEBYSCORE` removes expired entries in one command. Sorted set gives exact count of requests in sliding window.

### Why BullMQ For Emails Instead Of Direct Sending?
API returns response immediately after queuing email job. User doesn't wait for SMTP. Failed emails retry automatically with exponential backoff. One email failure doesn't affect others. Scales to thousands of emails with concurrency.

### Why Stream Files Instead Of Buffer?
CSV/Excel/PDF streamed directly to response. Works for any file size — 10 rows or 100,000 rows same memory usage. Building entire file in memory then sending would crash with large datasets.

### Why Prisma select Over Returning Full Objects?
Explicitly define returned fields prevents accidental password exposure. Response shape is a contract — adding fields to model doesn't automatically leak them to API.

---

## Project Structure

```
server/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
│
├── src/
│   ├── config/
│   │   ├── index.js           # Centralized config + validation
│   │   ├── database.js        # Prisma client + connection pool
│   │   ├── redis.js           # Redis client + cache helpers
│   │   ├── openai.js          # OpenAI client
│   │   ├── socket.js          # Socket.io setup
│   │   └── multer.js          # File upload config
│   │
│   ├── constants/
│   │   ├── index.js           # HTTP status codes + messages + roles
│   │   └── socket.events.js   # WebSocket event names
│   │
│   ├── controllers/           # Thin HTTP handlers
│   │   ├── auth.controller.js
│   │   ├── job.controller.js
│   │   ├── admin.controller.js
│   │   ├── ai.controller.js
│   │   └── file.controller.js
│   │
│   ├── services/              # Business logic
│   │   ├── auth.service.js
│   │   ├── job.service.js
│   │   ├── admin.service.js
│   │   ├── ai.service.js
│   │   ├── email.service.js
│   │   └── file.service.js
│   │
│   ├── routes/
│   │   ├── index.js           # Route aggregator
│   │   ├── auth.routes.js
│   │   ├── job.routes.js
│   │   ├── admin.routes.js
│   │   ├── ai.routes.js
│   │   └── file.routes.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT protect + authorize
│   │   ├── error.middleware.js    # Global error handler
│   │   ├── validate.middleware.js # Zod request validation
│   │   ├── rateLimit.middleware.js # Sliding window rate limiter
│   │   └── cache.middleware.js    # Redis cache middleware
│   │
│   ├── utils/
│   │   ├── asyncHandler.js    # Async error wrapper
│   │   ├── apiResponse.js     # Consistent response format
│   │   ├── jwt.js             # Token generation + verification
│   │   └── logger.js          # Winston structured logger
│   │
│   ├── validations/
│   │   ├── auth.validation.js
│   │   ├── job.validation.js
│   │   └── ai.validation.js
│   │
│   ├── queues/
│   │   ├── index.js           # Queue exports
│   │   ├── email.queue.js     # Email queue definition
│   │   └── scheduler.js       # node-cron scheduled jobs
│   │
│   ├── workers/
│   │   └── email.worker.js    # Email job processor
│   │
│   └── __tests__/
│       ├── setup.js           # Jest configuration
│       ├── unit/
│       │   ├── auth.service.test.js
│       │   └── job.service.test.js
│       └── integration/
│           └── auth.routes.test.js
│
├── server.js                  # Entry point
├── .env.example               # Environment template
├── .gitignore
└── package.json
```

---

## Daily Development Commands

```bash
# Start containers
docker start jobtracker-postgres jobtracker-redis

# Start server
npm run dev

# Run tests
npm test

# View database
npx prisma studio

# Stop containers
docker stop jobtracker-postgres jobtracker-redis
```

---

## WebSocket Events

Connect with access token:

```javascript
const socket = io('http://localhost:5050', {
  auth: { token: accessToken }
});
```

| Event | Direction | Description |
|-------|-----------|-------------|
| `role:updated` | Server → User | Admin changed your role |
| `admin:new_user` | Server → Admin | New user registered |
| `admin:job_status_changed` | Server → Admin | User updated job status |

---

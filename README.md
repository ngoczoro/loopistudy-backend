# Loopi Study - Backend API

A comprehensive Learning Management System (LMS) backend built with **Node.js**, **Express.js**, **PostgreSQL**, and **Sequelize ORM**.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Contributing](#contributing)

---

## ✨ Features

### User Features

- ✅ User Authentication (Register, Login, Logout)
- ✅ Token Refresh & Session Management
- ✅ Subject Management (CRUD)
- ✅ Study Plans (AI-generated or manual)
- ✅ Study Sessions Tracking
- ✅ Pomodoro Timer Management
- ✅ Notes Taking Per Subject
- ✅ Quiz System with Scoring
- ✅ Progress Tracking & Analytics
- ✅ Goal Setting & Achievement System
- ✅ Notifications & Reminders

### Admin Features

- ✅ User Management
- ✅ Content Moderation
- ✅ Warning & Ban System
- ✅ Activity Logging & Audit Trail
- ✅ Platform Statistics

---

## 🛠 Tech Stack

| Layer                | Technology         |
| -------------------- | ------------------ |
| **Runtime**          | Node.js (v18+)     |
| **Framework**        | Express.js v5.2.1  |
| **ORM**              | Sequelize v6.35.2  |
| **Database**         | PostgreSQL v8+     |
| **Authentication**   | JWT (jsonwebtoken) |
| **Password Hashing** | Bcrypt             |
| **Validation**       | Joi                |
| **Rate Limiting**    | express-rate-limit |
| **CORS**             | cors               |
| **Environment**      | dotenv             |

---

## 📁 Project Structure

```
loopistudy-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # Database connection
│   │   └── constants.js     # App constants
│   │
│   ├── models/              # Sequelize Models
│   │   ├── User.js
│   │   ├── Subject.js
│   │   ├── StudyPlan.js
│   │   ├── StudySession.js
│   │   ├── PomodoroSession.js
│   │   └── index.js        # Model initialization & associations
│   │
│   ├── controllers/         # Request handlers
│   │   ├── authController.js
│   │   ├── subjectController.js
│   │   ├── pomodoroController.js
│   │   └── ...
│   │
│   ├── services/            # Business logic
│   │   ├── authService.js
│   │   ├── progressService.js
│   │   └── ...
│   │
│   ├── middlewares/         # Custom middlewares
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── rateLimitMiddleware.js
│   │   └── corsMiddleware.js
│   │
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── subjectRoutes.js
│   │   ├── pomodoroRoutes.js
│   │   └── index.js
│   │
│   ├── validations/         # Request validations
│   │   └── schemas.js
│   │
│   ├── utils/               # Utility functions
│   │   ├── jwt.js
│   │   ├── password.js
│   │   ├── ApiError.js
│   │   ├── asyncHandler.js
│   │   └── response.js
│   │
│   └── app.js              # Express app setup
│
├── .env.example            # Environment template
├── package.json
├── server.js               # Server entry point
└── README.md
```

---

## 🚀 Installation

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- PostgreSQL 12 or higher
- Git

### Step 1: Clone Repository

```bash
git clone https://github.com/yourname/loopistudy-backend.git
cd loopistudy-backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Setup Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` with your configuration:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loopi_study_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_characters_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_min_32_characters_long

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Step 4: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE loopi_study_db;

# Exit
\q
```

### Step 5: Start Server

```bash
npm run dev
```

Server should be running at `http://localhost:5000`

---

## 🌍 Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loopi_study_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key_must_be_at_least_32_characters_long
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_must_be_at_least_32_characters_long
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=info
```

---

## 📝 Running the Server

### Development Mode

```bash
npm run dev          # With auto-reload using nodemon
```

### Production Mode

```bash
npm start            # Direct node execution
```

### Database Operations

```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Run seeders
npm run db:reset     # Migrate + Seed
```

### Linting

```bash
npm run lint         # Check code style
npm run lint:fix     # Fix code style
```

---

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "fullName": "John Doe"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Login User

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Refresh Token

```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response (200):
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Subject Endpoints

#### Create Subject

```http
POST /subjects
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Mathematics",
  "description": "Advanced Calculus",
  "color": "#FF5733",
  "difficulty": "hard",
  "targetHours": 40
}

Response (201):
{
  "success": true,
  "message": "Subject created successfully",
  "data": { ... }
}
```

#### Get All Subjects

```http
GET /subjects?status=active&page=1&limit=10
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Subjects fetched successfully",
  "data": [ ... ],
  "pagination": { ... }
}
```

#### Get Subject by ID

```http
GET /subjects/:id
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Subject fetched successfully",
  "data": { ... }
}
```

#### Update Subject

```http
PUT /subjects/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Advanced Mathematics",
  "targetHours": 50
}

Response (200):
{
  "success": true,
  "message": "Subject updated successfully",
  "data": { ... }
}
```

#### Delete Subject

```http
DELETE /subjects/:id
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Subject deleted successfully"
}
```

---

## 🔐 Authentication

### JWT Flow

1. **Register/Login**: User receives `accessToken` and `refreshToken`
2. **Store Tokens**: Save tokens in localStorage (frontend)
3. **API Requests**: Include `Authorization: Bearer {accessToken}` header
4. **Token Expiry**: When access token expires (15 min), use refresh token to get new one
5. **Logout**: Clear tokens from localStorage

### Token Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Protected Routes

All routes except auth endpoints require:

```javascript
Authorization: Bearer {accessToken}
```

---

## ⚠️ Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": null // Details in development
}
```

### HTTP Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | OK - Request successful              |
| 201  | Created - Resource created           |
| 400  | Bad Request - Invalid input          |
| 401  | Unauthorized - Authentication failed |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found       |
| 409  | Conflict - Duplicate entry           |
| 500  | Internal Server Error                |

---

## 🔗 Frontend Integration

### Connect React Frontend

1. **Install Axios**

```bash
npm install axios
```

2. **Create Axios Instance**

```javascript
// src/lib/axios-instance.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/v1",
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

3. **Use in Services**

```javascript
// src/services/subjectService.js
import api from "../lib/axios-instance";

export const subjectService = {
  async createSubject(data) {
    const response = await api.post("/subjects", data);
    return response.data;
  },

  async getSubjects(params) {
    const response = await api.get("/subjects", { params });
    return response.data;
  },
};
```

---

## 📊 Database Schema

See `BACKEND_ARCHITECTURE.md` for complete database schema documentation.

Key Tables:

- `users` - User accounts
- `subjects` - Study subjects
- `study_plans` - Learning plans
- `study_sessions` - Study sessions
- `pomodoro_sessions` - Pomodoro timers
- `quizzes` - Quiz content
- `goals` - User goals
- `achievements` - Achievements/badges
- `notifications` - User notifications

---

## 📝 Contributing

1. Create a feature branch
2. Make changes
3. Commit with clear messages
4. Push and create a Pull Request

---

## 📄 License

MIT License - See LICENSE file

---

## 🤝 Support

For issues or questions, please create an issue on GitHub.

---

**Last Updated:** May 16, 2026  
**Version:** 1.0.0  
**Status:** Production Ready

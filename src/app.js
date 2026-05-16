import express from "express";
import dotenv from "dotenv";
import { initializeModels } from "./models/index.js";
import routes from "./routes/index.js";
import { corsMiddleware } from "./middlewares/corsMiddleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/errorMiddleware.js";
import { generalLimiter } from "./middlewares/rateLimitMiddleware.js";

dotenv.config();

const app = express();

/**
 * Middleware Setup
 */

// CORS
app.use(corsMiddleware);

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Rate Limiting
app.use(generalLimiter);

// Initialize database models
try {
  initializeModels();
} catch (error) {
  console.error("Error initializing models:", error);
}

/**
 * Routes
 */

// Health check route
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Loopi Study Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes
app.use("/api/v1", routes);

// Default route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Loopi Study Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      subjects: "/api/v1/subjects",
      pomodoro: "/api/v1/pomodoro",
      health: "/health",
    },
  });
});

/**
 * Error Handling
 */

// 404 Not Found
app.use(notFoundMiddleware);

// Global Error Handler
app.use(errorMiddleware);

export default app;

import "./config/loadEnv.js";
import express from "express";
import { initializeModels } from "./models/index.js";
import routes from "./routes/index.js";
import { corsMiddleware } from "./middlewares/corsMiddleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/errorMiddleware.js";
import { generalLimiter } from "./middlewares/rateLimitMiddleware.js";
import { securityMonitorMiddleware } from "./middlewares/securityMonitorMiddleware.js";

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(generalLimiter);
app.use(securityMonitorMiddleware);

try {
  initializeModels();
} catch (error) {
  console.error("Error initializing models:", error);
}

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Loopi Study Backend is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Loopi Study Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      subjects: "/api/v1/subjects",
      pomodoro: "/api/v1/pomodoro",
      focusSessions: "/api/v1/focus-sessions",
      health: "/health",
    },
  });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;

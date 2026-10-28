import "./src/config/loadEnv.js";

import http from "http";
import app from "./src/app.js";
import { initRealtime } from "./src/shared/realtime/socket.js";
import {
  registerChatSocketHandlers,
  startTaskAlertScheduler,
} from "./src/modules/groups/index.js";
import sequelize from "./src/config/database.js";
import { initializeModels } from "./src/models/index.js";

const PORT = process.env.PORT || 5000;

/**
 * Start Server
 */
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✓ Database connection successful");

    initializeModels();

    const { verifyFocusSessionSchema } = await import(
      "./src/shared/database/schemaGuard.js"
    );
    await verifyFocusSessionSchema();

    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: false });
      console.log("✓ Database models synced");
    }

    const { seedAdmin } = await import("./src/utils/seedAdmin.js");
    await seedAdmin();

    const httpServer = http.createServer(app);
    initRealtime(httpServer, [registerChatSocketHandlers]);

    httpServer.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log("✓ Socket.IO ready on the same port");
      console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`✓ API Documentation: http://localhost:${PORT}/api/v1`);
      startTaskAlertScheduler();
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error.message);
    process.exit(1);
  }
};

process.on("unhandledRejection", (error) => {
  console.error("✗ Unhandled Rejection:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("✗ Uncaught Exception:", error);
  process.exit(1);
});

startServer();

import "../config/loadEnv.js";
import sequelize from "../config/database.js";
import { initializeModels } from "../models/index.js";
import { up as seedBadges } from "./001_seed_achievements.js";

const run = async () => {
  await sequelize.authenticate();
  initializeModels();
  await seedBadges(sequelize.getQueryInterface());
  console.log("✓ Badge seed completed");
  process.exit(0);
};

run().catch((error) => {
  console.error("✗ Seed failed:", error.message);
  process.exit(1);
});

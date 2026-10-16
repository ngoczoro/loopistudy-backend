/**
 * Full demo dataset for Loopi Study (dashboard, streaks, notifications, goals, admin).
 *
 * Usage:
 *   npm run db:seed:demo
 *   npm run db:seed:demo -- --fresh     # default: wipe demo users' data then reseed
 *   npm run db:seed:demo -- --keep        # only create missing demo data
 */
import "../config/loadEnv.js";
import sequelize from "../config/database.js";
import { initializeModels } from "../models/index.js";
import { up as seedBadgeCatalog } from "./001_seed_achievements.js";
import { EXTRA_BADGE_ROWS } from "./demo/constants.js";
import { upsertExtraBadges } from "./demo/helpers.js";
import { runDemoSeed } from "./demo/seedDemoData.js";

const args = new Set(process.argv.slice(2));
const fresh = !args.has("--keep");

const printSummary = (result) => {
  console.log("\n══════════════════════════════════════════");
  console.log(" Demo seed complete");
  console.log("══════════════════════════════════════════");
  console.log(`Seed key: ${result.seedKey}`);
  console.log(`Password (all demo students): ${result.password}`);
  console.log("\nDemo student accounts:");
  for (const user of result.users) {
    console.log(`  • ${user.email} — ${user.fullName} [${user.profile}] (${user.status})`);
  }
  console.log("\nAdmin (from server boot / seedAdmin): ADMIN_EMAIL / ADMIN_PASSWORD in .env");
  console.log("\nSuggested logins for demo:");
  console.log("  Student UI → alex.demo@loopi.com");
  console.log("  Admin UI   → admin@loopi.com");
  console.log("\nIncludes: subjects, notes, tasks, planner, focus history,");
  console.log("streaks, goals, quizzes, badges, notifications, violations.");
};

const run = async () => {
  await sequelize.authenticate();
  console.log("✓ Database connection successful");

  initializeModels();

  await seedBadgeCatalog(sequelize.getQueryInterface());
  console.log("✓ Badge catalog seeded");

  await upsertExtraBadges(sequelize, EXTRA_BADGE_ROWS);
  console.log("✓ Extra demo badges upserted");

  const result = await runDemoSeed(sequelize, { fresh });
  printSummary(result);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✗ Demo seed failed:", error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  });

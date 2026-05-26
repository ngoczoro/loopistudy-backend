/**
 * Demo seed: English notifications + unlock first 4 milestone badges for one user.
 *
 * Usage:
 *   SEED_USER_EMAIL=you@example.com npm run db:seed:milestones
 *   npm run db:seed:milestones -- you@example.com
 */
import "../config/loadEnv.js";
import sequelize from "../config/database.js";
import { initializeModels } from "../models/index.js";
import { ROLES } from "../config/constants.js";
import { SCHEMA } from "../models/shared.js";
import { up as seedBadgeCatalog } from "./001_seed_achievements.js";

const MILESTONE_SEED_KEY = "milestone_demo_v1";

/** Display-only catalog rows (stay locked — no user_badges insert). */
const LOCKED_BADGE_DISPLAY = [
  {
    code: "thirty_day_streak",
    name: "30-Day Streak",
    description: "Maintain a 30-day focus study streak",
  },
  {
    code: "five_subjects",
    name: "Subject Master",
    description: "Create 5 subjects",
  },
];

/** Badge codes unlocked by this seed (others stay locked). */
const UNLOCK_BADGE_SPECS = [
  {
    code: "first_focus_session",
    name: "First Session",
    description: "Complete your first focus session",
  },
  {
    code: "3_day_streak",
    name: "3-Day Streak",
    description: "Maintain a 3-day focus study streak",
  },
  {
    code: "seven_day_streak",
    name: "7-Day Streak",
    description: "Maintain a 7-day focus study streak",
  },
  {
    code: "ten_tasks_completed",
    name: "10 Tasks Done",
    description: "Complete 10 tasks in your planner",
  },
];

const DEMO_NOTIFICATIONS = [
  {
    slot: "first_session",
    type: "streak",
    isRead: true,
    title: "First Milestone Unlocked! ⭐",
    body: "Congratulations! You have completed your very first focus session and earned the 'First Session' badge.",
    badgeCode: "first_focus_session",
  },
  {
    slot: "streak_3",
    type: "streak",
    isRead: true,
    title: "3-Day Streak Achieved! 🔥",
    body: "Amazing consistency! You've successfully unlocked the '3-Day Streak' badge by focusing 3 days in a row.",
    badgeCode: "3_day_streak",
  },
  {
    slot: "streak_7",
    type: "streak",
    isRead: false,
    title: "Weekly Champion: 7-Day Streak! 🌟",
    body: "Unstoppable! The '7-Day Streak' badge is now yours. Keep up this incredible dedication!",
    badgeCode: "seven_day_streak",
  },
  {
    slot: "tasks_10",
    type: "session",
    isRead: false,
    title: "Task Crusher! 🏆",
    body: "You have successfully completed 10 tasks in your planner and unlocked the '10 Tasks Done' badge.",
    badgeCode: "ten_tasks_completed",
  },
];

const resolveTargetEmail = () => {
  const argvEmail = process.argv[2]?.trim();
  if (argvEmail && argvEmail.includes("@")) return argvEmail;
  if (process.env.SEED_USER_EMAIL?.trim()) {
    return process.env.SEED_USER_EMAIL.trim();
  }
  return null;
};

const resolveUserId = async () => {
  const { User } = sequelize.models;
  const email = resolveTargetEmail();

  if (email) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error(`No user found for SEED_USER_EMAIL: ${email}`);
    }
    return { userId: user.id, email: user.email };
  }

  const user = await User.findOne({
    where: { role: ROLES.STUDENT },
    order: [["createdAt", "ASC"]],
  });

  if (!user) {
    throw new Error(
      "No student user found. Set SEED_USER_EMAIL or pass email: npm run db:seed:milestones -- you@example.com",
    );
  }

  return { userId: user.id, email: user.email };
};

const upsertBadgeCatalogRows = async () => {
  const now = new Date();
  const allSpecs = [...UNLOCK_BADGE_SPECS, ...LOCKED_BADGE_DISPLAY];

  for (const spec of allSpecs) {
    await sequelize.query(
      `
      INSERT INTO "${SCHEMA}"."badges" (code, name, description, created_at, updated_at)
      VALUES (:code, :name, :description, :now, :now)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = EXCLUDED.updated_at
      `,
      {
        replacements: {
          code: spec.code,
          name: spec.name,
          description: spec.description,
          now,
        },
      },
    );
  }
};

const removeLockedDemoBadges = async (userId) => {
  const { Badge, UserBadge } = sequelize.models;

  for (const spec of LOCKED_BADGE_DISPLAY) {
    const badge = await Badge.findOne({ where: { code: spec.code } });
    if (!badge) continue;
    await UserBadge.destroy({ where: { userId, badgeId: badge.id } });
  }
};

const unlockBadgesForUser = async (userId) => {
  const { Badge, UserBadge } = sequelize.models;
  const earnedAt = new Date();

  for (const spec of UNLOCK_BADGE_SPECS) {
    const badge = await Badge.findOne({ where: { code: spec.code } });
    if (!badge) {
      console.warn(`⚠ Badge missing in catalog, skipping unlock: ${spec.code}`);
      continue;
    }

    await UserBadge.findOrCreate({
      where: { userId, badgeId: badge.id },
      defaults: { userId, badgeId: badge.id, earnedAt },
    });
  }
};

const seedStreakSnapshot = async (userId) => {
  const { UserStreak } = sequelize.models;
  const today = new Date().toISOString().slice(0, 10);

  await UserStreak.upsert({
    userId,
    currentStreak: 7,
    longestStreak: 7,
    lastStudyDate: today,
  });
};

const clearPreviousMilestoneSeed = async (userId) => {
  await sequelize.query(
    `
    DELETE FROM "${SCHEMA}"."notifications"
    WHERE user_id = :userId
      AND metadata->>'seedKey' = :seedKey
    `,
    { replacements: { userId, seedKey: MILESTONE_SEED_KEY } },
  );
};

const seedNotifications = async (userId) => {
  const { Notification } = sequelize.models;
  const baseTime = Date.now();

  await clearPreviousMilestoneSeed(userId);

  for (let i = 0; i < DEMO_NOTIFICATIONS.length; i += 1) {
    const row = DEMO_NOTIFICATIONS[i];
    const createdAt = new Date(baseTime - (DEMO_NOTIFICATIONS.length - i) * 60 * 60 * 1000);

    await Notification.create({
      userId,
      audience: "user",
      type: row.type,
      title: row.title,
      body: row.body,
      isRead: row.isRead,
      metadata: {
        seedKey: MILESTONE_SEED_KEY,
        slot: row.slot,
        badgeCode: row.badgeCode,
      },
      createdAt,
      updatedAt: createdAt,
    });
  }
};

const run = async () => {
  await sequelize.authenticate();
  console.log("✓ Database connection successful");

  initializeModels();

  const { userId, email } = await resolveUserId();
  console.log(`→ Seeding milestones for user: ${email} (${userId})`);

  await seedBadgeCatalog(sequelize.getQueryInterface());
  console.log("✓ Badge catalog seeded (001)");

  await upsertBadgeCatalogRows();
  console.log("✓ Milestone badge names/catalog updated");

  await removeLockedDemoBadges(userId);
  console.log("✓ Ensured 30-Day Streak & Subject Master stay locked");

  await unlockBadgesForUser(userId);
  console.log(`✓ Unlocked ${UNLOCK_BADGE_SPECS.length} badges in user_badges`);

  await seedStreakSnapshot(userId);
  console.log("✓ user_streaks set to 7-day streak for Goals header");

  await seedNotifications(userId);
  console.log(`✓ Inserted ${DEMO_NOTIFICATIONS.length} English notifications`);

  console.log("\nDone. Refresh Notifications dropdown and Goals & Streak page.");
  console.log(
    "Locked badges (e.g. 30-Day Streak, Subject Master) remain unchanged unless already earned.",
  );
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✗ Milestone seed failed:", error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  });

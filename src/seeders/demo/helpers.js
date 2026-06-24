import { hashPassword } from "../../utils/password.js";
import { SCHEMA } from "../../models/shared.js";
import { getWeekStartDate, addDays, toDateOnly } from "../../modules/planner/ai-plan/ai-plan.weekUtils.js";

export { getWeekStartDate, addDays, toDateOnly };

export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
};

export const daysAgo = (count, from = new Date()) =>
  toDateOnly(addDays(toDateOnly(from), -count));

export const hoursAgo = (hours, from = new Date()) =>
  new Date(from.getTime() - hours * 60 * 60 * 1000);

export const atHourOnDate = (dateKey, hour, minute = 0) => {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
};

export const withSeedMetadata = (extra = {}) => ({
  seedKey: "loopi_demo_v1",
  ...extra,
});

export const ensureDemoUser = async (sequelize, spec, passwordHash) => {
  const { User } = sequelize.models;
  const [user, created] = await User.findOrCreate({
    where: { email: spec.email },
    defaults: {
      email: spec.email,
      passwordHash,
      fullName: spec.fullName,
      role: spec.role,
      status: spec.status,
      lockedReason: spec.lockedReason ?? null,
      lockedAt: spec.status === "LOCKED" ? new Date() : null,
    },
  });

  if (!created) {
    await user.update({
      fullName: spec.fullName,
      role: spec.role,
      status: spec.status,
      lockedReason: spec.lockedReason ?? null,
      lockedAt: spec.status === "LOCKED" ? user.lockedAt ?? new Date() : null,
      passwordHash,
    });
  }

  return user;
};

export const clearDemoUserData = async (sequelize, userId) => {
  const models = sequelize.models;
  const {
    Violation,
    Notification,
    UserBadge,
    QuizAttempt,
    Quiz,
    FocusSession,
    PlannerSession,
    Task,
    StudyGoal,
    ContentItem,
    Subject,
    BlockedSlot,
    UserPreference,
    UserStreak,
    SavedLearningResource,
    AiResourceRecommendationHistory,
    AIRequest,
  } = models;

  await Violation.destroy({ where: { userId } });
  await Notification.destroy({ where: { userId } });
  await UserBadge.destroy({ where: { userId } });
  await QuizAttempt.destroy({ where: { userId } });
  await Quiz.destroy({ where: { userId }, force: true });
  await FocusSession.destroy({ where: { userId } });
  await PlannerSession.destroy({ where: { userId } });
  await Task.destroy({ where: { userId } });
  await StudyGoal.destroy({ where: { userId } });
  await SavedLearningResource.destroy({ where: { userId } });
  await AiResourceRecommendationHistory.destroy({ where: { userId } });
  await AIRequest.destroy({ where: { userId } });
  await ContentItem.destroy({ where: { userId }, force: true });
  await Subject.destroy({ where: { userId }, force: true });
  await BlockedSlot.destroy({ where: { userId } });
  await UserPreference.destroy({ where: { userId } });
  await UserStreak.destroy({ where: { userId } });
};

export const clearAllDemoUsersData = async (sequelize, emails) => {
  const { User } = sequelize.models;

  for (const email of emails) {
    const user = await User.findOne({ where: { email } });
    if (user) {
      await clearDemoUserData(sequelize, user.id);
    }
  }
};

export const hashDemoPassword = async (password) => hashPassword(password);

export const upsertExtraBadges = async (sequelize, rows) => {
  const now = new Date();

  for (const row of rows) {
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
          code: row.code,
          name: row.name,
          description: row.description,
          now,
        },
      },
    );
  }
};

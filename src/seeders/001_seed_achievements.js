/**
 * Seeds the badges catalog (learning_app.badges).
 * Former achievement_key / achievement_type rows are mapped to badges.code;
 * rule metadata is embedded in description until achievements engine (Phase 1).
 */
import { SCHEMA } from "../models/shared.js";

const now = new Date();

const badgeRows = [
  {
    code: "first_focus_session",
    name: "First Focus Session",
    description: "Complete your first Pomodoro focus session",
    created_at: now,
    updated_at: now,
  },
  {
    code: "first_task_completed",
    name: "First Task Done",
    description: "Complete your first task",
    created_at: now,
    updated_at: now,
  },
  {
    code: "3_day_streak",
    name: "3-Day Streak",
    description: "Maintain a 3-day focus study streak (15 min/day qualifying)",
    created_at: now,
    updated_at: now,
  },
  {
    code: "10_completed_sessions",
    name: "10 Focus Sessions",
    description: "Complete 10 focus sessions",
    created_at: now,
    updated_at: now,
  },
  {
    code: "first_subject",
    name: "First Subject",
    description: "Create your first subject | rule: subjects | threshold: 1",
    created_at: now,
    updated_at: now,
  },
  {
    code: "five_subjects",
    name: "Subject Master",
    description: "Create 5 subjects | rule: subjects | threshold: 5",
    created_at: now,
    updated_at: now,
  },
  {
    code: "ten_hours",
    name: "Dedicated Learner",
    description: "Study for 10 hours | rule: study_hours | threshold: 10",
    created_at: now,
    updated_at: now,
  },
  {
    code: "hundred_hours",
    name: "Study Beast",
    description: "Study for 100 hours | rule: study_hours | threshold: 100",
    created_at: now,
    updated_at: now,
  },
  {
    code: "seven_day_streak",
    name: "Weekly Warrior",
    description: "Maintain a 7-day study streak | rule: streak | threshold: 7",
    created_at: now,
    updated_at: now,
  },
  {
    code: "thirty_day_streak",
    name: "Unstoppable",
    description: "Maintain a 30-day study streak | rule: streak | threshold: 30",
    created_at: now,
    updated_at: now,
  },
  {
    code: "perfect_quiz",
    name: "Quiz Master",
    description: "Score 100% on a quiz | rule: quiz_score | threshold: 100",
    created_at: now,
    updated_at: now,
  },
  {
    code: "ten_notes",
    name: "Note Taker",
    description: "Create 10 notes | rule: notes | threshold: 10",
    created_at: now,
    updated_at: now,
  },
];

export const up = async (queryInterface) => {
  for (const row of badgeRows) {
    await queryInterface.sequelize.query(
      `
      INSERT INTO "${SCHEMA}"."badges" (code, name, description, created_at, updated_at)
      VALUES (:code, :name, :description, :created_at, :updated_at)
      ON CONFLICT (code) DO NOTHING
      `,
      { replacements: row },
    );
  }
};

export const down = async (queryInterface) => {
  await queryInterface.bulkDelete(
    { tableName: "badges", schema: SCHEMA },
    { code: badgeRows.map((b) => b.code) },
  );
};

export const badgeSeedCatalog = badgeRows;

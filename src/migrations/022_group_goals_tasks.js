import { SCHEMA } from "../models/shared.js";

const NOTIFICATION_TYPES = [
  "reminder",
  "deadline",
  "ai",
  "streak",
  "session",
  "moderation",
  "group_task_assigned",
  "group_task_reminder",
  "group_task_due_soon",
  "group_task_overdue",
  "group_task_blocked",
];

/**
 * Study group goals and tasks. Goal progress is derived from its tasks at read time,
 * so nothing here stores percentages.
 */
export async function up(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."group_goals" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES "${SCHEMA}"."study_groups"(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description VARCHAR(1000),
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      created_by UUID REFERENCES "${SCHEMA}"."users"(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (end_date > start_date)
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS group_goals_group_idx
      ON "${SCHEMA}"."group_goals" (group_id, start_date)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."group_tasks" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES "${SCHEMA}"."study_groups"(id) ON DELETE CASCADE,
      goal_id UUID REFERENCES "${SCHEMA}"."group_goals"(id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL,
      description VARCHAR(2000),
      assignee_id UUID REFERENCES "${SCHEMA}"."users"(id) ON DELETE SET NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
      due_at TIMESTAMPTZ,
      depends_on_task_id UUID REFERENCES "${SCHEMA}"."group_tasks"(id) ON DELETE SET NULL,
      completed_at TIMESTAMPTZ,
      created_by UUID REFERENCES "${SCHEMA}"."users"(id) ON DELETE SET NULL,
      last_reminded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (depends_on_task_id IS NULL OR depends_on_task_id <> id)
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS group_tasks_group_idx
      ON "${SCHEMA}"."group_tasks" (group_id, created_at)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS group_tasks_open_due_idx
      ON "${SCHEMA}"."group_tasks" (due_at)
      WHERE status <> 'done' AND assignee_id IS NOT NULL
  `);

  // One row per notification actually sent, so the scheduler can rerun safely.
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${SCHEMA}"."group_task_notification_log" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(30) NOT NULL,
      task_id UUID NOT NULL REFERENCES "${SCHEMA}"."group_tasks"(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES "${SCHEMA}"."users"(id) ON DELETE CASCADE,
      dedupe_key VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (type, task_id, recipient_id, dedupe_key)
    )
  `);

  const typeList = NOTIFICATION_TYPES.map((type) => `'${type}'`).join(", ");
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."notifications"
      DROP CONSTRAINT IF EXISTS notifications_type_check
  `);
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."notifications"
      ADD CONSTRAINT notifications_type_check CHECK (type IN (${typeList}))
  `);
}

export async function down(sequelize) {
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."group_task_notification_log"`);
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."group_tasks"`);
  await sequelize.query(`DROP TABLE IF EXISTS "${SCHEMA}"."group_goals"`);
}

import { SCHEMA } from "../models/shared.js";

/**
 * The group's running Loopi call, so members can be told once when it starts and
 * chat can say when it ended.
 * - call_started_at: when the first person joined an empty room (null = no call).
 * - call_started_by: who that was.
 */
export const up = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_groups"
      ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS call_started_by UUID
  `);
};

export const down = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_groups"
      DROP COLUMN IF EXISTS call_started_at,
      DROP COLUMN IF EXISTS call_started_by
  `);
};

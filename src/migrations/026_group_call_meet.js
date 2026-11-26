import { SCHEMA } from "../models/shared.js";

/**
 * Google Meet fallback for group calls.
 * - backup_meet_url: a standing Meet link the group owner can set.
 * - active_meet_*: the Meet the group moved to while Loopi calls were unavailable.
 */
export const up = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_groups"
      ADD COLUMN IF NOT EXISTS backup_meet_url TEXT,
      ADD COLUMN IF NOT EXISTS active_meet_url TEXT,
      ADD COLUMN IF NOT EXISTS active_meet_by UUID,
      ADD COLUMN IF NOT EXISTS active_meet_at TIMESTAMPTZ
  `);
};

export const down = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."study_groups"
      DROP COLUMN IF EXISTS backup_meet_url,
      DROP COLUMN IF EXISTS active_meet_url,
      DROP COLUMN IF EXISTS active_meet_by,
      DROP COLUMN IF EXISTS active_meet_at
  `);
};

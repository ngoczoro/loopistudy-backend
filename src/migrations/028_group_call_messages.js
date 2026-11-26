import { SCHEMA } from "../models/shared.js";
import { NOTIFICATION_TYPES } from "../config/enums.js";

/**
 * Group call messages and notifications.
 * - group_messages.kind: "text" for what members write; "call_started", "call_ended" and
 *   "meet" for messages the call system posts, which chat shows as call cards.
 * - group_messages.metadata: details for those cards (call start time, duration, Meet link).
 * - notifications.type: adds "group_call_started".
 *
 * Call messages posted before this migration (plain text starting with 📹) are converted.
 */
export const up = async (sequelize) => {
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."group_messages"
      ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'text',
      ADD COLUMN IF NOT EXISTS metadata JSONB
  `);

  await sequelize.query(`
    UPDATE "${SCHEMA}"."group_messages"
       SET kind = 'call_started', content = 'Started a group call'
     WHERE kind = 'text' AND content = '📹 Started a group call. Join from the video call button.'
  `);
  await sequelize.query(`
    UPDATE "${SCHEMA}"."group_messages"
       SET kind = 'call_ended', content = substring(content FROM 3)
     WHERE kind = 'text' AND content LIKE '📹 Call ended · %'
  `);
  await sequelize.query(`
    UPDATE "${SCHEMA}"."group_messages"
       SET kind = 'meet',
           metadata = jsonb_build_object('url', substring(content FROM 'https://meet\\.google\\.com/\\S+')),
           content = 'Google Meet: ' || substring(content FROM 'https://meet\\.google\\.com/\\S+')
     WHERE kind = 'text' AND content LIKE '📹 Google Meet cho nhóm: https://meet.google.com/%'
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
};

export const down = async (sequelize) => {
  await sequelize.query(`
    DELETE FROM "${SCHEMA}"."notifications" WHERE type = 'group_call_started'
  `);
  const typeList = NOTIFICATION_TYPES.filter((type) => type !== "group_call_started")
    .map((type) => `'${type}'`)
    .join(", ");
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."notifications"
      DROP CONSTRAINT IF EXISTS notifications_type_check
  `);
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."notifications"
      ADD CONSTRAINT notifications_type_check CHECK (type IN (${typeList}))
  `);
  await sequelize.query(`
    ALTER TABLE "${SCHEMA}"."group_messages"
      DROP COLUMN IF EXISTS kind,
      DROP COLUMN IF EXISTS metadata
  `);
};

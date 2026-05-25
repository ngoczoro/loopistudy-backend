/**
 * Partial unique indexes for unfinished workspace domain:
 * - one unfinished (running|paused) row per (user_id, subject_id)
 * - one globally running row per user_id
 *
 * Pre-migration: detect violations, resolve duplicates, verify before CREATE INDEX.
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

const UNFINISHED_STATUSES = "('running', 'paused')";

const countViolations = async (sequelize, s) => {
  const { QueryTypes } = sequelize.Sequelize;

  const [duplicateUnfinishedPerSubject] = await sequelize.query(
    `
    SELECT COUNT(*)::int AS violation_groups
    FROM (
      SELECT user_id, subject_id
      FROM "${s}"."focus_sessions"
      WHERE status IN ${UNFINISHED_STATUSES}
      GROUP BY user_id, subject_id
      HAVING COUNT(*) > 1
    ) dup
    `,
    { type: QueryTypes.SELECT },
  );

  const [duplicateRunningPerUser] = await sequelize.query(
    `
    SELECT COUNT(*)::int AS violation_groups
    FROM (
      SELECT user_id
      FROM "${s}"."focus_sessions"
      WHERE status = 'running'
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) dup
    `,
    { type: QueryTypes.SELECT },
  );

  return {
    duplicateUnfinishedPerSubject: duplicateUnfinishedPerSubject?.violation_groups ?? 0,
    duplicateRunningPerUser: duplicateRunningPerUser?.violation_groups ?? 0,
  };
};

/**
 * Keep the newest unfinished row per (user_id, subject_id); terminal-cancel older duplicates.
 */
const resolveDuplicateUnfinishedPerSubject = async (sequelize, s) => {
  await sequelize.query(`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, subject_id
          ORDER BY updated_at DESC, id DESC
        ) AS rn
      FROM "${s}"."focus_sessions"
      WHERE status IN ${UNFINISHED_STATUSES}
    )
    UPDATE "${s}"."focus_sessions" fs
    SET
      status = 'cancelled',
      completed_at = COALESCE(fs.completed_at, NOW()),
      paused_at = NULL,
      phase_ends_at = NULL,
      remaining_seconds = 0,
      updated_at = NOW()
  FROM ranked r
    WHERE fs.id = r.id
      AND r.rn > 1
  `);
};

/**
 * Keep the newest running row per user; pause other running rows with best-effort remaining time.
 */
const resolveDuplicateRunningPerUser = async (sequelize, s) => {
  await sequelize.query(`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY updated_at DESC, id DESC
        ) AS rn
      FROM "${s}"."focus_sessions"
      WHERE status = 'running'
    )
    UPDATE "${s}"."focus_sessions" fs
    SET
      status = 'paused',
      paused_at = COALESCE(fs.paused_at, NOW()),
      phase_ends_at = NULL,
      remaining_seconds = CASE
        WHEN fs.phase_ends_at IS NOT NULL THEN GREATEST(
          0,
          CEIL(EXTRACT(EPOCH FROM (fs.phase_ends_at - NOW())))
        )::int
        ELSE COALESCE(fs.remaining_seconds, 0)
      END,
      updated_at = NOW()
    FROM ranked r
    WHERE fs.id = r.id
      AND r.rn > 1
  `);
};

const assertNoViolations = async (sequelize, s) => {
  const counts = await countViolations(sequelize, s);

  if (counts.duplicateUnfinishedPerSubject > 0 || counts.duplicateRunningPerUser > 0) {
    throw new Error(
      `focus_sessions index pre-check failed after cleanup: ` +
        `${counts.duplicateUnfinishedPerSubject} duplicate unfinished subject group(s), ` +
        `${counts.duplicateRunningPerUser} duplicate running user group(s)`,
    );
  }
};

export async function up(sequelize) {
  const s = schema();
  const before = await countViolations(sequelize, s);

  if (before.duplicateUnfinishedPerSubject > 0) {
    console.log(
      `→ 008: resolving ${before.duplicateUnfinishedPerSubject} duplicate unfinished (user, subject) group(s)`,
    );
    await resolveDuplicateUnfinishedPerSubject(sequelize, s);
  }

  if (before.duplicateRunningPerUser > 0) {
    console.log(
      `→ 008: resolving ${before.duplicateRunningPerUser} duplicate running user group(s)`,
    );
    await resolveDuplicateRunningPerUser(sequelize, s);
  }

  await assertNoViolations(sequelize, s);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_one_unfinished_per_subject
    ON "${s}"."focus_sessions" (user_id, subject_id)
    WHERE status IN ${UNFINISHED_STATUSES}
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_one_running_per_user
    ON "${s}"."focus_sessions" (user_id)
    WHERE status = 'running'
  `);
}

export async function down(sequelize) {
  const s = schema();
  await sequelize.query(
    `DROP INDEX IF EXISTS "${s}".idx_focus_sessions_one_running_per_user`,
  );
  await sequelize.query(
    `DROP INDEX IF EXISTS "${s}".idx_focus_sessions_one_unfinished_per_subject`,
  );
}

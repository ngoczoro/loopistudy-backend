import sequelize from "../../config/database.js";
import { SCHEMA } from "../../models/shared.js";
import { FOCUS_ANALYTICS } from "./focus.analytics.constants.js";

const { QueryTypes } = sequelize.Sequelize;

/** Productivity seconds and averages — completed sessions only. */
const qualifyingCompletedSecondsSql = `
  CASE
    WHEN COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0) >= :minSessionSeconds
    THEN COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0)
    ELSE 0
  END
`;

const productivityWhereSql = `
  fs.user_id = :userId
  AND fs.status = 'completed'
`;

/** Row scope for display-only abandoned counts (no seconds aggregated). */
const terminalArchiveWhereSql = `
  fs.user_id = :userId
  AND fs.status IN ('completed', 'cancelled')
`;

const dateFilterSql = (column) => `
  AND (:fromDate IS NULL OR ${column}::date >= :fromDate::date)
  AND (:toDate IS NULL OR ${column}::date <= :toDate::date)
`;

export const aggregateSummary = async (userId, { fromDate = null, toDate = null } = {}) => {
  console.log("[focus-analytics] aggregateSummary", { userId, fromDate, toDate });

  try {
    const [row] = await sequelize.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE fs.status = 'completed')::int AS completed_count,
      COUNT(*) FILTER (WHERE fs.status = 'cancelled')::int AS abandoned_count,
      COUNT(*) FILTER (WHERE fs.status = 'completed')::int AS total_sessions,
      COALESCE(SUM(
        CASE
          WHEN fs.status = 'completed' THEN ${qualifyingCompletedSecondsSql}
          ELSE 0
        END
      ), 0)::bigint AS total_focus_seconds,
      COALESCE(AVG(${qualifyingCompletedSecondsSql}) FILTER (
        WHERE fs.status = 'completed'
          AND COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0) >= :minSessionSeconds
      ), 0)::float AS avg_session_seconds
    FROM "${SCHEMA}"."focus_sessions" fs
    WHERE ${terminalArchiveWhereSql}
    ${dateFilterSql("COALESCE(fs.completed_at, fs.started_at)")}
    `,
    {
      replacements: {
        userId,
        fromDate,
        toDate,
        minSessionSeconds: FOCUS_ANALYTICS.MIN_SESSION_SECONDS,
      },
      type: QueryTypes.SELECT,
    },
  );

    return row;
  } catch (error) {
    console.error(
      "[focus-analytics] aggregateSummary SQL failed:",
      error.message,
    );
    throw error;
  }
};

export const aggregateDailyTrends = async (
  userId,
  { fromDate, toDate, minSessionSeconds = FOCUS_ANALYTICS.MIN_SESSION_SECONDS } = {},
) => {
  return sequelize.query(
    `
    SELECT
      TO_CHAR(COALESCE(fs.completed_at, fs.started_at)::date, 'YYYY-MM-DD') AS date,
      COALESCE(SUM(
        CASE
          WHEN fs.status = 'completed'
            AND COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0) >= :minSessionSeconds
          THEN COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0)
          ELSE 0
        END
      ), 0)::bigint AS focus_seconds,
      COUNT(*) FILTER (WHERE fs.status = 'completed')::int AS completed_count,
      COUNT(*) FILTER (WHERE fs.status = 'cancelled')::int AS abandoned_count
    FROM "${SCHEMA}"."focus_sessions" fs
    WHERE ${terminalArchiveWhereSql}
      AND COALESCE(fs.completed_at, fs.started_at)::date >= :fromDate::date
      AND COALESCE(fs.completed_at, fs.started_at)::date <= :toDate::date
    GROUP BY COALESCE(fs.completed_at, fs.started_at)::date
    ORDER BY date ASC
    `,
    {
      replacements: { userId, fromDate, toDate, minSessionSeconds },
      type: QueryTypes.SELECT,
    },
  );
};

export const aggregateSubjectStats = async (
  userId,
  { fromDate = null, toDate = null } = {},
) => {
  return sequelize.query(
    `
    SELECT
      fs.subject_id AS "subjectId",
      s.name AS "subjectName",
      s.color AS "subjectColor",
      COUNT(*) FILTER (WHERE fs.status = 'completed')::int AS session_count,
      COUNT(*) FILTER (WHERE fs.status = 'completed')::int AS completed_count,
      COUNT(*) FILTER (WHERE fs.status = 'cancelled')::int AS abandoned_count,
      COALESCE(SUM(
        CASE
          WHEN fs.status = 'completed' THEN ${qualifyingCompletedSecondsSql}
          ELSE 0
        END
      ), 0)::bigint AS focus_seconds,
      COALESCE(AVG(${qualifyingCompletedSecondsSql}) FILTER (
        WHERE fs.status = 'completed'
          AND COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0) >= :minSessionSeconds
      ), 0)::float AS avg_session_seconds
    FROM "${SCHEMA}"."focus_sessions" fs
    INNER JOIN "${SCHEMA}"."subjects" s ON s.id = fs.subject_id
    WHERE ${terminalArchiveWhereSql}
    ${dateFilterSql("COALESCE(fs.completed_at, fs.started_at)")}
    GROUP BY fs.subject_id, s.name, s.color
    HAVING COUNT(*) FILTER (WHERE fs.status = 'completed') > 0
       OR COUNT(*) FILTER (WHERE fs.status = 'cancelled') > 0
    ORDER BY focus_seconds DESC
    `,
    {
      replacements: {
        userId,
        fromDate,
        toDate,
        minSessionSeconds: FOCUS_ANALYTICS.MIN_SESSION_SECONDS,
      },
      type: QueryTypes.SELECT,
    },
  );
};

export const aggregateDailyStreakData = async (userId, { fromDate, toDate }) => {
  return sequelize.query(
    `
    SELECT
      TO_CHAR(COALESCE(fs.completed_at, fs.started_at)::date, 'YYYY-MM-DD') AS date,
      COALESCE(SUM(${qualifyingCompletedSecondsSql}), 0)::bigint AS focus_seconds
    FROM "${SCHEMA}"."focus_sessions" fs
    WHERE ${productivityWhereSql}
      AND COALESCE(fs.completed_at, fs.started_at)::date >= :fromDate::date
      AND COALESCE(fs.completed_at, fs.started_at)::date <= :toDate::date
    GROUP BY COALESCE(fs.completed_at, fs.started_at)::date
    ORDER BY date ASC
    `,
    {
      replacements: {
        userId,
        fromDate,
        toDate,
        minSessionSeconds: FOCUS_ANALYTICS.MIN_SESSION_SECONDS,
      },
      type: QueryTypes.SELECT,
    },
  );
};

export const aggregatePlannerInsights = async (userId, { weekStartDate }) => {
  return sequelize.query(
    `
    SELECT
      ps.id AS "plannerSessionId",
      ps.title AS "plannerTitle",
      ps.day_of_week AS "dayOfWeek",
      ps.start_hour AS "startHour",
      ps.duration_hours AS "durationHours",
      ps.subject_id AS "subjectId",
      s.name AS "subjectName",
      COUNT(fs.id) FILTER (WHERE fs.status = 'completed')::int AS focus_session_count,
      COUNT(fs.id) FILTER (WHERE fs.status = 'completed')::int AS completed_focus_count,
      COALESCE(SUM(
        CASE
          WHEN fs.id IS NOT NULL
            AND fs.status = 'completed'
            AND COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0) >= :minSessionSeconds
          THEN COALESCE(fs.work_elapsed_seconds, fs.actual_work_minutes * 60, 0)
          ELSE 0
        END
      ), 0)::bigint AS actual_focus_seconds,
      (ps.duration_hours * 3600)::bigint AS planned_seconds
    FROM "${SCHEMA}"."planner_sessions" ps
    LEFT JOIN "${SCHEMA}"."subjects" s ON s.id = ps.subject_id
    LEFT JOIN "${SCHEMA}"."focus_sessions" fs
      ON fs.planner_session_id = ps.id
      AND fs.user_id = ps.user_id
    WHERE ps.user_id = :userId
      AND ps.week_start_date = :weekStartDate::date
    GROUP BY ps.id, ps.title, ps.day_of_week, ps.start_hour, ps.duration_hours, ps.subject_id, s.name
    ORDER BY ps.day_of_week ASC, ps.start_hour ASC
    `,
    {
      replacements: {
        userId,
        weekStartDate,
        minSessionSeconds: FOCUS_ANALYTICS.MIN_SESSION_SECONDS,
      },
      type: QueryTypes.SELECT,
    },
  );
};

export const findHistoryFiltered = async (userId, options = {}) => {
  const { FocusSession, Subject } = sequelize.models;
  const { Op } = sequelize.Sequelize;

  const {
    status,
    subjectId,
    fromDate,
    toDate,
    limit = FOCUS_ANALYTICS.DEFAULT_HISTORY_LIMIT,
    offset = 0,
  } = options;

  const conditions = [{ userId }];

  if (status) {
    conditions.push({ status });
  }

  if (subjectId) {
    conditions.push({ subjectId });
  }

  if (fromDate) {
    conditions.push(
      sequelize.where(
        sequelize.fn(
          "DATE",
          sequelize.fn(
            "COALESCE",
            sequelize.col("FocusSession.completed_at"),
            sequelize.col("FocusSession.started_at"),
          ),
        ),
        { [Op.gte]: fromDate },
      ),
    );
  }

  if (toDate) {
    conditions.push(
      sequelize.where(
        sequelize.fn(
          "DATE",
          sequelize.fn(
            "COALESCE",
            sequelize.col("FocusSession.completed_at"),
            sequelize.col("FocusSession.started_at"),
          ),
        ),
        { [Op.lte]: toDate },
      ),
    );
  }

  const { count, rows } = await FocusSession.findAndCountAll({
    where: { [Op.and]: conditions },
    include: [
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name", "color"],
      },
    ],
    order: [["started_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  return { count, rows };
};

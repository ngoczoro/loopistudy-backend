/**
 * Migration 004 — Frontend-aligned schema foundation (greenfield dev).
 *
 * Drops deprecated tables and creates the approved architecture.
 * Preserves users / refresh_tokens / otp_codes when present (ALTER-safe).
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

const q = (sequelize, sql, transaction) =>
  sequelize.query(sql, { transaction });

export async function up(sequelize) {
  const s = schema();
  const transaction = await sequelize.transaction();

  try {
    await q(
      sequelize,
      `CREATE SCHEMA IF NOT EXISTS "${s}"`,
      transaction,
    );

    // --- Drop deprecated / replaced tables (order: dependents first) ---
    const deprecated = [
      "quiz_answers",
      "quiz_questions",
      "notes",
      "documents",
      "study_sessions",
      "study_plans",
      "pomodoro_sessions",
      "streaks",
      "user_badges",
      "badges",
      "focus_sessions",
      "planner_sessions",
      "content_items",
      "blocked_slots",
      "user_preferences",
      "user_streaks",
      "quiz_attempts",
      "quizzes",
      "study_goals",
      "tasks",
      "subjects",
      "violations",
      "ai_requests",
      "notifications",
    ];

    for (const table of deprecated) {
      await q(
        sequelize,
        `DROP TABLE IF EXISTS "${s}"."${table}" CASCADE`,
        transaction,
      );
    }

    // --- users (create or align) ---
    await q(
      sequelize,
      `
      CREATE TABLE IF NOT EXISTS "${s}"."users" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name VARCHAR(100),
        avatar_url TEXT,
        role VARCHAR(20) NOT NULL DEFAULT 'student'
          CHECK (role IN ('admin', 'student')),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING', 'ACTIVE', 'BANNED', 'LOCKED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );

    await q(
      sequelize,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON "${s}"."users" (email)`,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX IF NOT EXISTS idx_users_role_status ON "${s}"."users" (role, status)`,
      transaction,
    );

    // --- refresh_tokens ---
    await q(
      sequelize,
      `
      CREATE TABLE IF NOT EXISTS "${s}"."refresh_tokens" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON "${s}"."refresh_tokens" (user_id)`,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON "${s}"."refresh_tokens" (token_hash) WHERE revoked = FALSE`,
      transaction,
    );

    // --- otp_codes ---
    await q(
      sequelize,
      `
      CREATE TABLE IF NOT EXISTS "${s}"."otp_codes" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        email VARCHAR(150) NOT NULL,
        code VARCHAR(10) NOT NULL,
        otp_hash TEXT,
        type VARCHAR(30) CHECK (type IN ('REGISTER', 'FORGOT_PASSWORD')),
        expired_at TIMESTAMPTZ NOT NULL,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON "${s}"."otp_codes" (email, is_used)`,
      transaction,
    );

    // --- user_preferences ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."user_preferences" (
        user_id UUID PRIMARY KEY REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        pomodoro_duration_min INTEGER NOT NULL DEFAULT 25,
        break_duration_min INTEGER NOT NULL DEFAULT 5,
        notify_task_reminders BOOLEAN NOT NULL DEFAULT TRUE,
        notify_session_reminders BOOLEAN NOT NULL DEFAULT TRUE,
        notify_deadline_alerts BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );

    // --- blocked_slots ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."blocked_slots" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        hour SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, day_of_week, hour)
      )
      `,
      transaction,
    );

    // --- subjects ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."subjects" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        credits SMALLINT,
        difficulty VARCHAR(10) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
        exam_date DATE,
        color VARCHAR(30),
        priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')),
        required_hours_per_week DECIMAL(4,1),
        progress DECIMAL(5,2) NOT NULL DEFAULT 0,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_subjects_user ON "${s}"."subjects" (user_id) WHERE deleted_at IS NULL`,
      transaction,
    );

    // --- content_items ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."content_items" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES "${s}"."subjects"(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('note', 'file', 'link')),
        content TEXT,
        file_url TEXT,
        file_mime VARCHAR(100),
        file_size_bytes BIGINT,
        is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_content_items_user ON "${s}"."content_items" (user_id) WHERE deleted_at IS NULL`,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_content_items_subject ON "${s}"."content_items" (user_id, subject_id) WHERE deleted_at IS NULL`,
      transaction,
    );

    // --- tasks ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."tasks" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES "${s}"."subjects"(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        priority VARCHAR(10) NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high')),
        task_date DATE NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_tasks_user_date ON "${s}"."tasks" (user_id, task_date)`,
      transaction,
    );

    // --- planner_sessions ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."planner_sessions" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES "${s}"."subjects"(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_hour DECIMAL(4,2) NOT NULL,
        duration_hours DECIMAL(4,2) NOT NULL,
        color VARCHAR(30),
        week_start_date DATE,
        source VARCHAR(20) NOT NULL DEFAULT 'manual'
          CHECK (source IN ('manual', 'ics_import', 'ai_plan')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_planner_sessions_user ON "${s}"."planner_sessions" (user_id, week_start_date, day_of_week)`,
      transaction,
    );

    // --- focus_sessions ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."focus_sessions" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        subject_id UUID NOT NULL REFERENCES "${s}"."subjects"(id) ON DELETE CASCADE,
        planner_session_id UUID REFERENCES "${s}"."planner_sessions"(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'running'
          CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
        session_number SMALLINT NOT NULL DEFAULT 1,
        planned_work_minutes INTEGER,
        planned_break_minutes INTEGER,
        actual_work_minutes INTEGER,
        started_at TIMESTAMPTZ,
        paused_at TIMESTAMPTZ,
        total_paused_seconds INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_focus_sessions_user_started ON "${s}"."focus_sessions" (user_id, started_at)`,
      transaction,
    );

    // --- quizzes ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."quizzes" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES "${s}"."subjects"(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        source VARCHAR(20) NOT NULL DEFAULT 'manual'
          CHECK (source IN ('manual', 'ai_generated')),
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_quizzes_user ON "${s}"."quizzes" (user_id) WHERE deleted_at IS NULL`,
      transaction,
    );

    // --- quiz_attempts ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."quiz_attempts" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES "${s}"."quizzes"(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        time_spent_seconds INTEGER,
        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_quiz_attempts_quiz_user ON "${s}"."quiz_attempts" (quiz_id, user_id)`,
      transaction,
    );

    // --- study_goals ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."study_goals" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        target_value DECIMAL(10,2) NOT NULL,
        current_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit VARCHAR(20) NOT NULL CHECK (unit IN ('hrs', 'tasks', 'chapters', 'min')),
        period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly')),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );

    // --- user_streaks ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."user_streaks" (
        user_id UUID PRIMARY KEY REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_study_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );

    // --- badges ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."badges" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );

    // --- user_badges ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."user_badges" (
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        badge_id UUID NOT NULL REFERENCES "${s}"."badges"(id) ON DELETE CASCADE,
        earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, badge_id)
      )
      `,
      transaction,
    );

    // --- notifications ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."notifications" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        audience VARCHAR(10) NOT NULL DEFAULT 'user'
          CHECK (audience IN ('user', 'admin')),
        type VARCHAR(30) NOT NULL
          CHECK (type IN ('reminder', 'deadline', 'ai', 'streak', 'session', 'moderation')),
        title VARCHAR(200) NOT NULL,
        body TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_notifications_user_read ON "${s}"."notifications" (user_id, is_read, created_at DESC)`,
      transaction,
    );

    // --- violations ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."violations" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        content_item_id UUID REFERENCES "${s}"."content_items"(id) ON DELETE SET NULL,
        content_title VARCHAR(200),
        content_type VARCHAR(20),
        type VARCHAR(30) NOT NULL
          CHECK (type IN ('spam', 'inappropriate', 'irrelevant')),
        severity VARCHAR(10) NOT NULL DEFAULT 'medium'
          CHECK (severity IN ('low', 'medium', 'high')),
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        resolved_by UUID REFERENCES "${s}"."users"(id) ON DELETE SET NULL,
        resolved_at TIMESTAMPTZ,
        detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_violations_resolved ON "${s}"."violations" (resolved, detected_at DESC)`,
      transaction,
    );

    // --- ai_requests ---
    await q(
      sequelize,
      `
      CREATE TABLE "${s}"."ai_requests" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${s}"."users"(id) ON DELETE CASCADE,
        content_item_id UUID REFERENCES "${s}"."content_items"(id) ON DELETE SET NULL,
        subject_id UUID REFERENCES "${s}"."subjects"(id) ON DELETE SET NULL,
        type VARCHAR(30) NOT NULL
          CHECK (type IN ('quiz_generate', 'summarize', 'study_plan', 'suggest_materials', 'moderate')),
        input_text TEXT,
        result_json JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'completed', 'failed')),
        provider VARCHAR(50),
        latency_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
      transaction,
    );
    await q(
      sequelize,
      `CREATE INDEX idx_ai_requests_user ON "${s}"."ai_requests" (user_id, created_at DESC)`,
      transaction,
    );

    await transaction.commit();
    console.log(`✓ Migration 004 completed for schema "${s}"`);
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Migration 004 failed:", error);
    throw error;
  }
}

export async function down(sequelize) {
  console.log("↩ Migration 004 down is intentionally a no-op (destructive rebuild)");
}

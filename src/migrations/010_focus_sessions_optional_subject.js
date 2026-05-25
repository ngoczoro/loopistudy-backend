/**
 * Allow focus sessions without a linked subject (general-purpose timer).
 */

const schema = () => process.env.DB_SCHEMA || "learning_app";

export async function up(sequelize) {
  const s = schema();
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    ALTER COLUMN subject_id DROP NOT NULL
  `);
}

export async function down(sequelize) {
  const s = schema();
  await sequelize.query(`
    ALTER TABLE "${s}"."focus_sessions"
    ALTER COLUMN subject_id SET NOT NULL
  `);
}

export const SCHEMA = process.env.DB_SCHEMA || "learning_app";

/**
 * Standard Sequelize model options for learning_app schema.
 */
export const modelOptions = (tableName, { paranoid = false } = {}) => ({
  tableName,
  schema: SCHEMA,
  underscored: true,
  timestamps: true,
  paranoid,
});

/**
 * Migration: Normalize auth role/status enums and ensure refresh_tokens table.
 */

export async function up(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const schema = process.env.DB_SCHEMA || "learning_app";
  const transaction = await sequelize.transaction();

  try {
    await sequelize.query(
      `UPDATE "${schema}"."users"
       SET role = 'student'
       WHERE LOWER(role) IN ('user', 'student')
         OR role IN ('USER', 'STUDENT')`,
      { transaction },
    );

    await sequelize.query(
      `UPDATE "${schema}"."users"
       SET role = 'admin'
       WHERE LOWER(role) = 'admin' OR role = 'ADMIN'`,
      { transaction },
    );

    await sequelize.query(
      `UPDATE "${schema}"."users"
       SET status = 'PENDING'
       WHERE LOWER(status) IN ('pending') OR status = 'PENDING'`,
      { transaction },
    );

    await sequelize.query(
      `UPDATE "${schema}"."users"
       SET status = 'ACTIVE'
       WHERE LOWER(status) IN ('active', 'warned')
         OR status IN ('ACTIVE', 'active')`,
      { transaction },
    );

    await sequelize.query(
      `UPDATE "${schema}"."users"
       SET status = 'BANNED'
       WHERE LOWER(status) = 'banned' OR status = 'BANNED'`,
      { transaction },
    );

    await sequelize.query(
      `UPDATE "${schema}"."users"
       SET status = 'LOCKED'
       WHERE LOWER(status) IN ('locked', 'inactive')
         OR status = 'LOCKED'`,
      { transaction },
    );

    const tables = await queryInterface.showAllTables({ transaction });
    const tableNames = tables.map((t) =>
      typeof t === "object" ? t.tableName || t.table_name : t,
    );

    if (!tableNames.includes("refresh_tokens")) {
      await queryInterface.createTable(
        "refresh_tokens",
        {
          id: {
            type: sequelize.Sequelize.UUID,
            defaultValue: sequelize.Sequelize.UUIDV4,
            primaryKey: true,
          },
          user_id: {
            type: sequelize.Sequelize.UUID,
            allowNull: false,
            references: { model: { tableName: "users", schema }, key: "id" },
            onDelete: "CASCADE",
          },
          token_hash: {
            type: sequelize.Sequelize.TEXT,
            allowNull: false,
          },
          expires_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false,
          },
          revoked: {
            type: sequelize.Sequelize.BOOLEAN,
            defaultValue: false,
          },
          created_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { schema, transaction },
      );

      await queryInterface.addIndex(
        { tableName: "refresh_tokens", schema },
        ["user_id"],
        { transaction },
      );

      await queryInterface.addIndex(
        { tableName: "refresh_tokens", schema },
        ["token_hash"],
        { transaction },
      );
    }

    await transaction.commit();
    console.log("✓ Migration completed: auth enums normalized, refresh_tokens ensured");
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Migration failed:", error);
    throw error;
  }
}

export async function down(sequelize) {
  console.log("↩ Down migration for 003 is a no-op (data normalization is not reversed)");
}

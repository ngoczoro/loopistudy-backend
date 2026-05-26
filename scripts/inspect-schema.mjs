import "../src/config/loadEnv.js";
import sequelize from "../src/config/database.js";

const schema = process.env.DB_SCHEMA || "learning_app";

const listColumns = async (table) => {
  const rows = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = :schema AND table_name = :table
     ORDER BY ordinal_position`,
    {
      replacements: { schema, table },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows.map((r) => r.column_name);
};

const tables = ["focus_sessions", "content_items"];
for (const table of tables) {
  const cols = await listColumns(table);
  console.log(`${table}:`, cols.join(", "));
}

await sequelize.close();

import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

console.log("DB_NAME =", process.env.DB_NAME);
console.log("DB_SCHEMA =", process.env.DB_SCHEMA);
console.log("DB_HOST =", process.env.DB_HOST);

const sequelize = new Sequelize(
  process.env.DB_NAME || "loopi_study",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "postgres",
  {
    host: process.env.DB_HOST || "localhost",

    port: process.env.DB_PORT || 5432,

    dialect: "postgres",

    logging: process.env.NODE_ENV === "development" ? console.log : false,

    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },

    define: {
      schema: process.env.DB_SCHEMA || "learning_app",
      underscored: true,
      timestamps: true,
    },

    dialectOptions: {
      ssl: false,
    },

    schema: process.env.DB_SCHEMA || "learning_app",

    searchPath: process.env.DB_SCHEMA || "learning_app",
  },
);

export default sequelize;

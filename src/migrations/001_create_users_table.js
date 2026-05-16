/**
 * Database Migration Example
 * This file shows how to create database migrations using Sequelize
 *
 * Usage:
 * npx sequelize migration:generate --name create_users_table
 * npx sequelize db:migrate
 */

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     * Return a promise to correctly handle asynchronicity.
     *
     * Example:
     * return queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.createTable("users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING(255),
        unique: true,
      },
      password_hash: {
        allowNull: false,
        type: Sequelize.STRING(255),
      },
      full_name: {
        type: Sequelize.STRING(255),
      },
      avatar_url: {
        type: Sequelize.STRING(500),
      },
      role: {
        allowNull: false,
        type: Sequelize.ENUM("user", "admin"),
        defaultValue: "user",
      },
      status: {
        type: Sequelize.ENUM("active", "warned", "banned", "inactive"),
        defaultValue: "active",
      },
      last_login_at: {
        type: Sequelize.DATE,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      deleted_at: {
        type: Sequelize.DATE,
      },
    });

    // Create indexes
    await queryInterface.addIndex("users", ["email"]);
    await queryInterface.addIndex("users", ["role"]);
    await queryInterface.addIndex("users", ["status"]);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     * Return a promise to correctly handle asynchronicity.
     *
     * Example:
     * return queryInterface.dropTable('users');
     */

    await queryInterface.dropTable("users");
  },
};

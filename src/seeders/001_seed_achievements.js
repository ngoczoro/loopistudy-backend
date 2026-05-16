/**
 * Database Seeder Example
 * This file shows how to seed initial data into the database
 *
 * Usage:
 * npx sequelize seed:generate --name 001_seed_achievements
 * npx sequelize db:seed:all
 */

"use strict";
import { hashPassword } from "../utils/password.js";

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('Users', [{
     *   email: 'demo@example.com',
     *   created_at: new Date(),
     *   updated_at: new Date()
     * }, ...], {});
     */

    const achievements = [
      {
        achievement_key: "first_subject",
        name: "First Subject",
        description: "Create your first subject",
        threshold: 1,
        achievement_type: "subjects",
        created_at: new Date(),
      },
      {
        achievement_key: "five_subjects",
        name: "Subject Master",
        description: "Complete 5 subjects",
        threshold: 5,
        achievement_type: "subjects",
        created_at: new Date(),
      },
      {
        achievement_key: "ten_hours",
        name: "Dedicated Learner",
        description: "Study for 10 hours",
        threshold: 10,
        achievement_type: "study_hours",
        created_at: new Date(),
      },
      {
        achievement_key: "hundred_hours",
        name: "Study Beast",
        description: "Study for 100 hours",
        threshold: 100,
        achievement_type: "study_hours",
        created_at: new Date(),
      },
      {
        achievement_key: "seven_day_streak",
        name: "Weekly Warrior",
        description: "Maintain a 7-day study streak",
        threshold: 7,
        achievement_type: "streak",
        created_at: new Date(),
      },
      {
        achievement_key: "thirty_day_streak",
        name: "Unstoppable",
        description: "Maintain a 30-day study streak",
        threshold: 30,
        achievement_type: "streak",
        created_at: new Date(),
      },
      {
        achievement_key: "perfect_quiz",
        name: "Quiz Master",
        description: "Score 100% on a quiz",
        threshold: 100,
        achievement_type: "quiz_score",
        created_at: new Date(),
      },
      {
        achievement_key: "ten_notes",
        name: "Note Taker",
        description: "Create 10 notes",
        threshold: 10,
        achievement_type: "notes",
        created_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert("achievements", achievements, {});
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('Users', null, {});
     */

    await queryInterface.bulkDelete("achievements", null, {});
  },
};

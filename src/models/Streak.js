import { DataTypes } from 'sequelize';

export const defineStreakModel = (sequelize) => {
  return sequelize.define('Streak', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_streak',
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'longest_streak',
    },
    lastStudyDate: {
      type: DataTypes.DATEONLY,
      field: 'last_study_date',
    },
  }, {
    tableName: 'streaks',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Streak = sequelize.define('Streak', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      field: 'user_id',
    },
    currentStreakDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_streak_days',
    },
    longestStreakDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'longest_streak_days',
    },
    lastActivityDate: {
      type: DataTypes.DATEONLY,
      field: 'last_activity_date',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  }, {
    tableName: 'streaks',
    timestamps: true,
    underscored: true,
  });

  return Streak;
};

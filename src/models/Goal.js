import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Goal = sequelize.define('Goal', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'user_id',
    },
    goalType: {
      type: DataTypes.ENUM('study_hours', 'streak', 'subject_completion', 'quiz_score'),
      allowNull: false,
      field: 'goal_type',
    },
    targetValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'target_value',
    },
    currentValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'current_value',
    },
    period: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'weekly',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATEONLY,
      field: 'end_date',
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_completed',
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
    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at',
    },
  }, {
    tableName: 'goals',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return Goal;
};

import { DataTypes } from 'sequelize';

export const defineStudyGoalModel = (sequelize) => {
  return sequelize.define('StudyGoal', {
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
    targetHoursPerWeek: {
      type: DataTypes.INTEGER,
      field: 'target_hours_per_week',
    },
    currentHours: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_hours',
    },
  }, {
    tableName: 'study_goals',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

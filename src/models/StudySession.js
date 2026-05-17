import { DataTypes } from 'sequelize';

export const defineStudySessionModel = (sequelize) => {
  return sequelize.define('StudySession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studyPlanId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'study_plan_id',
    },
    sessionDate: {
      type: DataTypes.DATEONLY,
      field: 'session_date',
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      field: 'duration_minutes',
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending',
    },
  }, {
    tableName: 'study_sessions',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

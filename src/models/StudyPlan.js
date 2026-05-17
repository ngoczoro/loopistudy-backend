import { DataTypes } from 'sequelize';

export const defineStudyPlanModel = (sequelize) => {
  return sequelize.define('StudyPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'subject_id',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    startTime: {
      type: DataTypes.DATE,
      field: 'start_time',
    },
    endTime: {
      type: DataTypes.DATE,
      field: 'end_time',
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending',
    },
  }, {
    tableName: 'study_plans',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

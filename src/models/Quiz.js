import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Quiz = sequelize.define('Quiz', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    subjectId: {
      type: DataTypes.BIGINT,
      field: 'subject_id',
    },
    createdByAdminId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'created_by_admin_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      field: 'total_questions',
    },
    timeLimitMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      field: 'time_limit_minutes',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_published',
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_approved',
    },
    passingScore: {
      type: DataTypes.INTEGER,
      defaultValue: 70,
      field: 'passing_score',
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
    tableName: 'quizzes',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return Quiz;
};

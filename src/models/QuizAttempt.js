import { DataTypes } from 'sequelize';

export const defineQuizAttemptModel = (sequelize) => {
  return sequelize.define('QuizAttempt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quizId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'quiz_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    score: {
      type: DataTypes.INTEGER,
    },
    completedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'completed_at',
    },
  }, {
    tableName: 'quiz_attempts',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

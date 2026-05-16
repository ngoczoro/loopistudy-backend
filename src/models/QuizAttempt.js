import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const QuizAttempt = sequelize.define('QuizAttempt', {
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
    quizId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'quiz_id',
    },
    score: {
      type: DataTypes.INTEGER,
    },
    maxScore: {
      type: DataTypes.INTEGER,
      field: 'max_score',
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
    },
    timeTakenSeconds: {
      type: DataTypes.INTEGER,
      field: 'time_taken_seconds',
    },
    attemptedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'attempted_at',
    },
    isPassed: {
      type: DataTypes.BOOLEAN,
      field: 'is_passed',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  }, {
    tableName: 'quiz_attempts',
    timestamps: false,
    underscored: true,
  });

  return QuizAttempt;
};

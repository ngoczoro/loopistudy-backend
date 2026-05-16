import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const QuizAttemptAnswer = sequelize.define('QuizAttemptAnswer', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    attemptId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'attempt_id',
    },
    questionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'question_id',
    },
    selectedOptionId: {
      type: DataTypes.BIGINT,
      field: 'selected_option_id',
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      field: 'is_correct',
    },
    timeSpentSeconds: {
      type: DataTypes.INTEGER,
      field: 'time_spent_seconds',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  }, {
    tableName: 'quiz_attempt_answers',
    timestamps: false,
    underscored: true,
  });

  return QuizAttemptAnswer;
};

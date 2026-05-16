import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const QuizQuestion = sequelize.define('QuizQuestion', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    quizId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'quiz_id',
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'question_text',
    },
    questionType: {
      type: DataTypes.ENUM('multiple_choice', 'true_false', 'short_answer'),
      defaultValue: 'multiple_choice',
      field: 'question_type',
    },
    explanation: {
      type: DataTypes.TEXT,
    },
    questionOrder: {
      type: DataTypes.INTEGER,
      field: 'question_order',
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
    tableName: 'quiz_questions',
    timestamps: true,
    underscored: true,
  });

  return QuizQuestion;
};

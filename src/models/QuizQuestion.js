import { DataTypes } from 'sequelize';

export const defineQuizQuestionModel = (sequelize) => {
  return sequelize.define('QuizQuestion', {
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
    questionText: {
      type: DataTypes.TEXT,
      field: 'question_text',
    },
    optionA: {
      type: DataTypes.TEXT,
      field: 'option_a',
    },
    optionB: {
      type: DataTypes.TEXT,
      field: 'option_b',
    },
    optionC: {
      type: DataTypes.TEXT,
      field: 'option_c',
    },
    optionD: {
      type: DataTypes.TEXT,
      field: 'option_d',
    },
    correctAnswer: {
      type: DataTypes.CHAR(1),
      field: 'correct_answer',
    },
    explanation: {
      type: DataTypes.TEXT,
      field: 'explanation_text',
    },
  }, {
    tableName: 'quiz_questions',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

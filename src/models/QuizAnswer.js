import { DataTypes } from 'sequelize';

export const defineQuizAnswerModel = (sequelize) => {
  return sequelize.define('QuizAnswer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    attemptId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'attempt_id',
    },
    questionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'question_id',
    },
    selectedOption: {
      type: DataTypes.CHAR(1),
      field: 'selected_option',
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      field: 'is_correct',
    },
  }, {
    tableName: 'quiz_answers',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

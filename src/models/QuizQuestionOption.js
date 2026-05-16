import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const QuizQuestionOption = sequelize.define('QuizQuestionOption', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    questionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'question_id',
    },
    optionText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'option_text',
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_correct',
    },
    optionOrder: {
      type: DataTypes.INTEGER,
      field: 'option_order',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  }, {
    tableName: 'quiz_question_options',
    timestamps: false,
    underscored: true,
  });

  return QuizQuestionOption;
};

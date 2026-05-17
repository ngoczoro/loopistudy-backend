import { DataTypes } from 'sequelize';

export const defineAIRequestModel = (sequelize) => {
  return sequelize.define('AIRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'document_id',
    },
    type: {
      type: DataTypes.STRING(50),
    },
    queryText: {
      type: DataTypes.TEXT,
      field: 'query_text',
    },
    resultJson: {
      type: DataTypes.JSON,
      field: 'result_json',
    },
  }, {
    tableName: 'ai_requests',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

import { DataTypes } from 'sequelize';

export const defineNoteModel = (sequelize) => {
  return sequelize.define('Note', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'document_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    content: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'notes',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

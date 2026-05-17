import { DataTypes } from 'sequelize';

export const defineDocumentModel = (sequelize) => {
  return sequelize.define('Document', {
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
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'subject_id',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    fileUrl: {
      type: DataTypes.TEXT,
      field: 'file_url',
    },
    fileType: {
      type: DataTypes.STRING(50),
      field: 'file_type',
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at',
    },
  }, {
    tableName: 'documents',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

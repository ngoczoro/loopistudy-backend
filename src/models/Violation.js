import { DataTypes } from 'sequelize';

export const defineViolationModel = (sequelize) => {
  return sequelize.define('Violation', {
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
    type: {
      type: DataTypes.STRING(50),
    },
    contentType: {
      type: DataTypes.STRING(50),
      field: 'content_type',
    },
    contentRefId: {
      type: DataTypes.UUID,
      field: 'content_ref_id',
    },
    severity: {
      type: DataTypes.STRING(50),
    },
  }, {
    tableName: 'violations',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

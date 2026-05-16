import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UserWarning = sequelize.define('UserWarning', {
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
    issuedByAdminId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'issued_by_admin_id',
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    description: {
      type: DataTypes.TEXT,
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_resolved',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      field: 'resolved_at',
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
    tableName: 'user_warnings',
    timestamps: true,
    underscored: true,
  });

  return UserWarning;
};

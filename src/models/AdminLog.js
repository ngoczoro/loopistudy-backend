import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const AdminLog = sequelize.define('AdminLog', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    adminId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'admin_id',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(50),
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.BIGINT,
      field: 'entity_id',
    },
    oldValues: {
      type: DataTypes.JSONB,
      field: 'old_values',
    },
    newValues: {
      type: DataTypes.JSONB,
      field: 'new_values',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  }, {
    tableName: 'admin_logs',
    timestamps: false,
    underscored: true,
  });

  return AdminLog;
};

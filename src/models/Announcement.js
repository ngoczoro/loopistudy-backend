import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    createdByAdminId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'created_by_admin_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_published',
    },
    publishedAt: {
      type: DataTypes.DATE,
      field: 'published_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
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
    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at',
    },
  }, {
    tableName: 'announcements',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return Announcement;
};

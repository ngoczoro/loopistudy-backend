import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Achievement = sequelize.define('Achievement', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    achievementKey: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      field: 'achievement_key',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    iconUrl: {
      type: DataTypes.STRING(500),
      field: 'icon_url',
    },
    threshold: {
      type: DataTypes.INTEGER,
    },
    achievementType: {
      type: DataTypes.ENUM('study_hours', 'streak', 'quiz_score', 'notes', 'subjects'),
      field: 'achievement_type',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  }, {
    tableName: 'achievements',
    timestamps: false,
    underscored: true,
  });

  return Achievement;
};

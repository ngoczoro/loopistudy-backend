import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UserAchievement = sequelize.define('UserAchievement', {
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      field: 'user_id',
    },
    achievementId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      field: 'achievement_id',
    },
    unlockedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'unlocked_at',
    },
  }, {
    tableName: 'user_achievements',
    timestamps: false,
    underscored: true,
  });

  return UserAchievement;
};

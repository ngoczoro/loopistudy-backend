import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GoalProgress = sequelize.define('GoalProgress', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    goalId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'goal_id',
    },
    progressDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'progress_date',
    },
    valueAdded: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'value_added',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  }, {
    tableName: 'goal_progress',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['goal_id', 'progress_date'],
      },
    ],
  });

  return GoalProgress;
};

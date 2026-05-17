import { DataTypes } from 'sequelize';

export const defineTaskModel = (sequelize) => {
  return sequelize.define('Task', {
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
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.STRING(10),
    },
    taskDate: {
      type: DataTypes.DATEONLY,
      field: 'task_date',
    },
  }, {
    tableName: 'tasks',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

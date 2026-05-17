import { DataTypes } from 'sequelize';

export const definePomodoroSessionModel = (sequelize) => {
  return sequelize.define('PomodoroSession', {
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
    startTime: {
      type: DataTypes.DATE,
      field: 'start_time',
    },
    endTime: {
      type: DataTypes.DATE,
      field: 'end_time',
    },
    duration: {
      type: DataTypes.INTEGER,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'pomodoro_sessions',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

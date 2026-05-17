import { DataTypes } from 'sequelize';

export const defineSubjectModel = (sequelize) => {
  return sequelize.define('Subject', {
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
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    credits: {
      type: DataTypes.INTEGER,
    },
    difficulty: {
      type: DataTypes.INTEGER,
    },
    examDate: {
      type: DataTypes.DATEONLY,
      field: 'exam_date',
    },
    note: {
      type: DataTypes.TEXT,
    },
    requiredHoursPerWeek: {
      type: DataTypes.INTEGER,
      field: 'required_hours_per_week',
    },
    priority: {
      type: DataTypes.STRING(10),
    },
  }, {
    tableName: 'subjects',
    schema: 'learning_app',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const NoteTag = sequelize.define('NoteTag', {
    noteId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      field: 'note_id',
    },
    tag: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
  }, {
    tableName: 'note_tags',
    timestamps: false,
    underscored: true,
  });

  return NoteTag;
};

/**
 * Migration: Allow subjectId to be null in notes table
 * Description: Updates notes table to allow global notes without a subject
 */

export async function up(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    // Alter the subject_id column to allow NULL
    await queryInterface.changeColumn(
      'notes',
      'subject_id',
      {
        type: sequelize.Sequelize.DataTypes.BIGINT,
        allowNull: true,
      },
      { transaction }
    );

    await transaction.commit();
    console.log('✓ Migration completed: notes.subject_id is now nullable');
  } catch (error) {
    await transaction.rollback();
    console.error('✗ Migration failed:', error);
    throw error;
  }
}

export async function down(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    // Revert: Make subject_id NOT NULL again
    await queryInterface.changeColumn(
      'notes',
      'subject_id',
      {
        type: sequelize.Sequelize.DataTypes.BIGINT,
        allowNull: false,
      },
      { transaction }
    );

    await transaction.commit();
    console.log('✓ Rollback completed: notes.subject_id is NOT nullable again');
  } catch (error) {
    await transaction.rollback();
    console.error('✗ Rollback failed:', error);
    throw error;
  }
}

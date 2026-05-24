import sequelize from "../../config/database.js";

const models = () => sequelize.models;

export const findUserById = async (userId) => {
  const { User } = models();
  return User.findByPk(userId);
};

export const findUserByEmail = async (email) => {
  const { User } = models();
  return User.findOne({ where: { email } });
};

export const updateUser = async (user, data) => {
  return user.update(data);
};

export const findPreferencesByUserId = async (userId) => {
  const { UserPreference } = models();
  return UserPreference.findByPk(userId);
};

export const findOrCreatePreferences = async (userId, defaults = {}) => {
  const { UserPreference } = models();
  const [prefs] = await UserPreference.findOrCreate({
    where: { userId },
    defaults: { userId, ...defaults },
  });
  return prefs;
};

export const updatePreferences = async (prefs, data) => {
  return prefs.update(data);
};

export const findAllBlockedSlotsByUserId = async (userId) => {
  const { BlockedSlot } = models();
  return BlockedSlot.findAll({
    where: { userId },
    order: [
      ["day_of_week", "ASC"],
      ["hour", "ASC"],
    ],
  });
};

export const replaceBlockedSlotsForUser = async (userId, slotRows) => {
  const { BlockedSlot } = models();
  const transaction = await sequelize.transaction();

  try {
    await BlockedSlot.destroy({ where: { userId }, transaction });

    if (slotRows.length > 0) {
      await BlockedSlot.bulkCreate(
        slotRows.map((row) => ({
          userId,
          dayOfWeek: row.dayOfWeek,
          hour: row.hour,
        })),
        { transaction },
      );
    }

    await transaction.commit();
    return findAllBlockedSlotsByUserId(userId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

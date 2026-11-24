import { Op } from "sequelize";
import sequelize from "../../config/database.js";

const StudyGroup = () => sequelize.models.StudyGroup;

const MEET_ATTRIBUTES = ["id", "backupMeetUrl", "activeMeetUrl", "activeMeetBy", "activeMeetAt"];

export const findGroupMeet = async (groupId) =>
  StudyGroup().findByPk(groupId, { attributes: MEET_ATTRIBUTES });

/**
 * Sets the group's active Meet only if it has none (or the old one expired), so two
 * members starting a Meet at the same moment end up in the same one.
 * Returns true when this call won.
 */
export const claimActiveMeet = async (groupId, { url, userId, expiredBefore }) => {
  const [count] = await StudyGroup().update(
    { activeMeetUrl: url, activeMeetBy: userId, activeMeetAt: new Date() },
    {
      where: {
        id: groupId,
        [Op.or]: [{ activeMeetUrl: null }, { activeMeetAt: { [Op.lt]: expiredBefore } }],
      },
    },
  );
  return count > 0;
};

export const clearActiveMeet = async (groupId) =>
  StudyGroup().update(
    { activeMeetUrl: null, activeMeetBy: null, activeMeetAt: null },
    { where: { id: groupId } },
  );

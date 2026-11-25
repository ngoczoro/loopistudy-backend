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

// ---------- Running Loopi call ----------

const GroupMember = () => sequelize.models.GroupMember;

export const findCallState = async (groupId) =>
  StudyGroup().findByPk(groupId, { attributes: ["id", "name", "callStartedAt", "callStartedBy"] });

/** Groups the server believes are in a call. */
export const findActiveCalls = async () =>
  StudyGroup().findAll({
    attributes: ["id", "name", "callStartedAt", "callStartedBy"],
    where: { callStartedAt: { [Op.ne]: null } },
  });

/** Marks the call as started only if none is recorded. Returns true when this call won. */
export const claimCallStart = async (groupId, { userId, startedAt }) => {
  const [count] = await StudyGroup().update(
    { callStartedAt: startedAt, callStartedBy: userId },
    { where: { id: groupId, callStartedAt: null } },
  );
  return count > 0;
};

/** Clears the call only if it is still the one that started at `startedAt`. */
export const clearCallStart = async (groupId, startedAt) => {
  const [count] = await StudyGroup().update(
    { callStartedAt: null, callStartedBy: null },
    { where: { id: groupId, callStartedAt: startedAt } },
  );
  return count > 0;
};

/** Members to tell about the call, with their mute setting. */
export const findCallRecipients = async (groupId) =>
  GroupMember().findAll({ attributes: ["userId", "muted"], where: { groupId }, raw: true });

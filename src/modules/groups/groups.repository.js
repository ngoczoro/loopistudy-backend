import sequelize from "../../config/database.js";

const StudyGroup = () => sequelize.models.StudyGroup;
const GroupMember = () => sequelize.models.GroupMember;
const User = () => sequelize.models.User;

const USER_SUMMARY_ATTRIBUTES = ["id", "fullName", "avatarUrl"];
const MEMBER_USER_ATTRIBUTES = ["id", "fullName", "email", "avatarUrl"];

const groupWithOwner = () => ({
  model: StudyGroup(),
  as: "group",
  required: true,
  include: [{ model: User(), as: "owner", attributes: USER_SUMMARY_ATTRIBUTES }],
});

export const findMembershipsByUser = async (userId) =>
  GroupMember().findAll({
    where: { userId },
    include: [groupWithOwner()],
  });

export const findMembership = async (groupId, userId) =>
  GroupMember().findOne({
    where: { groupId, userId },
    include: [groupWithOwner()],
  });

export const findGroupById = async (groupId) => StudyGroup().findByPk(groupId);

export const findGroupByInviteCode = async (inviteCode) =>
  StudyGroup().findOne({ where: { inviteCode } });

export const inviteCodeExists = async (inviteCode) => {
  const count = await StudyGroup().count({
    where: { inviteCode },
    paranoid: false,
  });
  return count > 0;
};

export const countMembersByGroupIds = async (groupIds) => {
  if (groupIds.length === 0) return new Map();

  const rows = await GroupMember().findAll({
    attributes: ["groupId", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    where: { groupId: groupIds },
    group: ["groupId"],
    raw: true,
  });

  return new Map(rows.map((row) => [row.groupId, Number(row.count)]));
};

export const createGroupWithOwner = async (groupData, ownerId) =>
  sequelize.transaction(async (transaction) => {
    const group = await StudyGroup().create(
      { ...groupData, ownerId },
      { transaction },
    );
    const now = new Date();
    await GroupMember().create(
      {
        groupId: group.id,
        userId: ownerId,
        role: "owner",
        joinedAt: now,
        lastReadAt: now,
      },
      { transaction },
    );
    return group;
  });

export const updateGroup = async (group, data) => group.update(data);

export const softDeleteGroup = async (group) => group.destroy();

export const addMember = async (groupId, userId) => {
  const now = new Date();
  return GroupMember().create({
    groupId,
    userId,
    role: "member",
    joinedAt: now,
    lastReadAt: now,
  });
};

export const updateMembership = async (membership, data) =>
  membership.update(data);

export const removeMember = async (groupId, userId) =>
  GroupMember().destroy({ where: { groupId, userId } });

export const listMembers = async (groupId) =>
  GroupMember().findAll({
    where: { groupId },
    include: [{ model: User(), as: "user", attributes: MEMBER_USER_ATTRIBUTES }],
    order: [["joinedAt", "ASC"]],
  });

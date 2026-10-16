import { Op, QueryTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { SCHEMA } from "../../models/shared.js";

const GroupMessage = () => sequelize.models.GroupMessage;
const GroupMessageAttachment = () => sequelize.models.GroupMessageAttachment;
const User = () => sequelize.models.User;

const SENDER_ATTRIBUTES = ["id", "fullName", "avatarUrl"];

const senderInclude = () => ({
  model: User(),
  as: "sender",
  attributes: SENDER_ATTRIBUTES,
});

const attachmentsInclude = () => ({
  model: GroupMessageAttachment(),
  as: "attachments",
  separate: true,
  order: [["position", "ASC"]],
});

const visibleWhere = (groupId, clearedAt) => ({
  groupId,
  ...(clearedAt ? { createdAt: { [Op.gt]: clearedAt } } : {}),
});

export const findMessageInGroup = async (groupId, messageId) =>
  GroupMessage().findOne({
    where: { id: messageId, groupId },
    attributes: ["id", "createdAt"],
  });

/** Newest first; caller reverses. Returns up to `limit + 1` rows to detect more pages. */
export const listMessagesPage = async ({ groupId, clearedAt, before, limit }) => {
  const where = visibleWhere(groupId, clearedAt);
  if (before) {
    where[Op.and] = [
      {
        [Op.or]: [
          { createdAt: { [Op.lt]: before.createdAt } },
          { createdAt: before.createdAt, id: { [Op.lt]: before.id } },
        ],
      },
    ];
  }

  return GroupMessage().findAll({
    where,
    include: [senderInclude(), attachmentsInclude()],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit: limit + 1,
  });
};

export const findMessageById = async (messageId) =>
  GroupMessage().findByPk(messageId, {
    include: [senderInclude(), attachmentsInclude()],
  });

export const createMessage = async ({ groupId, senderId, content, attachments }) =>
  sequelize.transaction(async (transaction) => {
    const message = await GroupMessage().create(
      { groupId, senderId, content },
      { transaction },
    );
    if (attachments.length > 0) {
      await GroupMessageAttachment().bulkCreate(
        attachments.map((attachment, position) => ({
          ...attachment,
          messageId: message.id,
          groupId,
          position,
        })),
        { transaction },
      );
    }
    return message;
  });

/** Latest visible message per group for `userId`, with sender + attachment count. */
export const findLastMessages = async (userId, groupIds) => {
  if (groupIds.length === 0) return [];

  return sequelize.query(
    `
    SELECT DISTINCT ON (m.group_id)
      m.id, m.group_id AS "groupId", m.content, m.created_at AS "createdAt",
      u.id AS "senderId", u.name AS "senderName", u.avatar_url AS "senderAvatarUrl",
      (SELECT COUNT(*)::int FROM "${SCHEMA}"."group_message_attachments" a
        WHERE a.message_id = m.id) AS "attachmentCount"
    FROM "${SCHEMA}"."group_messages" m
    JOIN "${SCHEMA}"."study_group_members" gm
      ON gm.group_id = m.group_id AND gm.user_id = :userId
    LEFT JOIN "${SCHEMA}"."users" u ON u.id = m.sender_id
    WHERE m.group_id IN (:groupIds)
      AND (gm.cleared_at IS NULL OR m.created_at > gm.cleared_at)
    ORDER BY m.group_id, m.created_at DESC, m.id DESC
    `,
    { replacements: { userId, groupIds }, type: QueryTypes.SELECT },
  );
};

/** Messages from others after the caller's `lastReadAt` (and `clearedAt`). */
export const countUnreadByGroup = async (userId, groupIds) => {
  if (groupIds.length === 0) return new Map();

  const rows = await sequelize.query(
    `
    SELECT m.group_id AS "groupId", COUNT(*)::int AS count
    FROM "${SCHEMA}"."group_messages" m
    JOIN "${SCHEMA}"."study_group_members" gm
      ON gm.group_id = m.group_id AND gm.user_id = :userId
    WHERE m.group_id IN (:groupIds)
      AND m.sender_id IS DISTINCT FROM :userId
      AND m.created_at > gm.last_read_at
      AND (gm.cleared_at IS NULL OR m.created_at > gm.cleared_at)
    GROUP BY m.group_id
    `,
    { replacements: { userId, groupIds }, type: QueryTypes.SELECT },
  );

  return new Map(rows.map((row) => [row.groupId, row.count]));
};

export const listAttachmentsByKind = async ({ groupId, clearedAt, kind, limit }) =>
  GroupMessageAttachment().findAll({
    where: {
      groupId,
      kind,
      ...(clearedAt ? { createdAt: { [Op.gt]: clearedAt } } : {}),
    },
    include: [
      {
        model: GroupMessage(),
        as: "message",
        attributes: ["id", "createdAt"],
        include: [senderInclude()],
      },
    ],
    order: [
      ["createdAt", "DESC"],
      ["position", "ASC"],
    ],
    limit,
  });

export const listMessagesWithLinks = async ({ groupId, clearedAt, limit }) =>
  GroupMessage().findAll({
    where: {
      ...visibleWhere(groupId, clearedAt),
      content: { [Op.iRegexp]: "https?://" },
    },
    include: [senderInclude()],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit,
  });

import { Op, fn, col, QueryTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { CONTENT_TYPE } from "../../config/constants.js";
import { MESSAGE_ROLE } from "./assistant.constants.js";
import { SCHEMA } from "../../models/shared.js";

const Conversation = () => sequelize.models.AssistantConversation;
const Message = () => sequelize.models.AssistantMessage;
const ContentItem = () => sequelize.models.ContentItem;
const Subject = () => sequelize.models.Subject;
const DocumentIndexStatus = () => sequelize.models.DocumentIndexStatus;

export const listConversationsByUser = async (userId) =>
  Conversation().findAll({
    where: { userId },
    order: [
      ["updatedAt", "DESC"],
      ["id", "DESC"],
    ],
  });

export const findConversationForUser = async (conversationId, userId) =>
  Conversation().findOne({ where: { id: conversationId, userId } });

export const createConversation = async (data) => Conversation().create(data);

export const updateConversation = async (conversation, data, options = {}) =>
  conversation.update(data, options);

export const deleteConversation = async (conversation) => conversation.destroy();

export const listMessages = async (conversationId) =>
  Message().findAll({
    where: { conversationId },
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
  });

/** Latest N messages, returned oldest → newest for prompt context. */
export const listRecentMessages = async (conversationId, limit) => {
  const rows = await Message().findAll({
    where: { conversationId },
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit,
  });
  return rows.reverse();
};

export const createMessage = async (data, options = {}) => Message().create(data, options);

export const countMessagesByConversationIds = async (conversationIds) => {
  if (conversationIds.length === 0) return new Map();
  const rows = await Message().findAll({
    attributes: [
      "conversationId",
      [fn("COUNT", col("id")), "messageCount"],
      [fn("MAX", col("created_at")), "lastMessageAt"],
    ],
    where: { conversationId: { [Op.in]: conversationIds } },
    group: ["conversationId"],
    raw: true,
  });
  return new Map(
    rows.map((row) => [
      row.conversationId,
      {
        messageCount: Number(row.messageCount) || 0,
        lastMessageAt: row.lastMessageAt,
      },
    ]),
  );
};

/** User questions in the last hour (rate limit). */
export const countUserQuestionsSince = async (userId, since) => {
  const rows = await sequelize.query(
    `
    SELECT COUNT(*)::int AS count
    FROM "${SCHEMA}"."assistant_messages" m
    INNER JOIN "${SCHEMA}"."assistant_conversations" c
      ON c.id = m.conversation_id
    WHERE c.user_id = :userId
      AND m.role = :role
      AND m.created_at >= :since
    `,
    {
      replacements: { userId, role: MESSAGE_ROLE.USER, since },
      type: QueryTypes.SELECT,
    },
  );
  return rows[0]?.count ?? 0;
};

export const listAskableContent = async (userId) =>
  ContentItem().findAll({
    where: {
      userId,
      type: { [Op.in]: [CONTENT_TYPE.NOTE, CONTENT_TYPE.FILE] },
    },
    include: [
      { model: Subject(), as: "subject", attributes: ["id", "name"], required: false },
      { model: DocumentIndexStatus(), as: "indexStatus", required: false },
    ],
    order: [
      ["updatedAt", "DESC"],
      ["id", "DESC"],
    ],
  });

export const countContentBySubject = async (userId, subjectId) =>
  ContentItem().count({
    where: {
      userId,
      subjectId,
      type: { [Op.in]: [CONTENT_TYPE.NOTE, CONTENT_TYPE.FILE] },
    },
  });

export const findOwnedContentIds = async (userId, ids) => {
  if (ids.length === 0) return [];
  const rows = await ContentItem().findAll({
    where: {
      userId,
      id: { [Op.in]: ids },
      type: { [Op.in]: [CONTENT_TYPE.NOTE, CONTENT_TYPE.FILE] },
    },
    attributes: ["id"],
    raw: true,
  });
  return rows.map((row) => row.id);
};

export const subjectExistsForUser = async (userId, subjectId) => {
  const SubjectModel = Subject();
  const count = await SubjectModel.count({ where: { id: subjectId, userId } });
  return count > 0;
};

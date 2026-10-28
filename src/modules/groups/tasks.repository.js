import { Op, QueryTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { SCHEMA } from "../../models/shared.js";
import { TASK_STATUS } from "./groups.constants.js";

const GroupGoal = () => sequelize.models.GroupGoal;
const GroupTask = () => sequelize.models.GroupTask;
const StudyGroup = () => sequelize.models.StudyGroup;
const User = () => sequelize.models.User;
const UserPreference = () => sequelize.models.UserPreference;

const USER_SUMMARY_ATTRIBUTES = ["id", "fullName", "avatarUrl"];

const userInclude = (as) => ({
  model: User(),
  as,
  attributes: USER_SUMMARY_ATTRIBUTES,
});

const taskIncludes = () => [userInclude("assignee"), userInclude("creator")];

// ---------- Goals ----------

export const listGoals = async (groupId) =>
  GroupGoal().findAll({
    where: { groupId },
    include: [userInclude("creator")],
    order: [
      ["startDate", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

export const listGoalsByGroupIds = async (groupIds) =>
  groupIds.length === 0
    ? []
    : GroupGoal().findAll({ where: { groupId: { [Op.in]: groupIds } } });

export const findGoal = async (groupId, goalId) =>
  GroupGoal().findOne({ where: { id: goalId, groupId } });

export const findGoalWithCreator = async (goalId) =>
  GroupGoal().findByPk(goalId, { include: [userInclude("creator")] });

export const createGoal = async (data) => GroupGoal().create(data);

export const updateGoal = async (goal, data) => goal.update(data);

export const deleteGoal = async (goal) => goal.destroy();

export const findTaskOutsideRange = async (goalId, startDate, endDate) =>
  GroupTask().findOne({
    where: {
      goalId,
      dueAt: { [Op.ne]: null, [Op.or]: [{ [Op.lt]: startDate }, { [Op.gt]: endDate }] },
    },
  });

// ---------- Tasks ----------

export const listTasks = async (groupId, filters = {}) => {
  const where = { groupId };
  if (filters.status) where.status = filters.status;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;

  return GroupTask().findAll({
    where,
    include: taskIncludes(),
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
  });
};

/** Lean rows for progress math (no user includes). */
export const listTasksByGroupIds = async (groupIds) =>
  groupIds.length === 0
    ? []
    : GroupTask().findAll({
        where: { groupId: { [Op.in]: groupIds } },
        attributes: ["id", "groupId", "goalId", "title", "assigneeId", "status", "dueAt", "dependsOnTaskId"],
      });

export const findTask = async (groupId, taskId) =>
  GroupTask().findOne({ where: { id: taskId, groupId } });

export const findTaskWithUsers = async (taskId) =>
  GroupTask().findByPk(taskId, { include: taskIncludes() });

/** `{ id, dependsOnTaskId }` for every task in the group, used for cycle checks. */
export const listDependencyEdges = async (groupId) =>
  GroupTask().findAll({
    where: { groupId },
    attributes: ["id", "dependsOnTaskId"],
    raw: true,
  });

export const createTask = async (data) => GroupTask().create(data);

export const updateTask = async (task, data) => task.update(data);

export const deleteTask = async (task) => task.destroy();

export const unassignMemberTasks = async (groupId, userId) =>
  GroupTask().update({ assigneeId: null }, { where: { groupId, assigneeId: userId } });

/**
 * Sets `lastRemindedAt` only if the cooldown has passed, so two concurrent
 * remind clicks cannot both succeed.
 */
export const claimReminder = async (taskId, remindedAt, cooldownStartedBefore) => {
  const [affected] = await GroupTask().update(
    { lastRemindedAt: remindedAt },
    {
      where: {
        id: taskId,
        [Op.or]: [
          { lastRemindedAt: null },
          { lastRemindedAt: { [Op.lte]: cooldownStartedBefore } },
        ],
      },
    },
  );
  return affected > 0;
};

export const findUserSummary = async (userId) =>
  User().findByPk(userId, { attributes: USER_SUMMARY_ATTRIBUTES });

/** Open, assigned tasks in active groups, plus the task each one depends on. */
export const listOpenAssignedTasks = async () =>
  GroupTask().findAll({
    where: {
      status: { [Op.ne]: TASK_STATUS.DONE },
      assigneeId: { [Op.ne]: null },
    },
    include: [
      {
        model: StudyGroup(),
        as: "group",
        attributes: ["id", "name", "ownerId"],
        required: true,
      },
      userInclude("assignee"),
      {
        model: GroupTask(),
        as: "dependsOn",
        attributes: ["id", "title", "status", "dueAt"],
        required: false,
      },
    ],
  });

// ---------- Notification bookkeeping ----------

/**
 * Claims a (type, task, recipient, key) slot. Returns false when it was already taken,
 * which is how reruns of the scheduler avoid duplicate notifications.
 */
export const claimNotificationSlot = async ({ type, taskId, recipientId, dedupeKey }, transaction) => {
  const rows = await sequelize.query(
    `
    INSERT INTO "${SCHEMA}"."group_task_notification_log" (type, task_id, recipient_id, dedupe_key)
    VALUES (:type, :taskId, :recipientId, :dedupeKey)
    ON CONFLICT (type, task_id, recipient_id, dedupe_key) DO NOTHING
    RETURNING id
    `,
    {
      replacements: { type, taskId, recipientId, dedupeKey },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  return rows.length > 0;
};

export const findPreferences = async (userIds) => {
  if (userIds.length === 0) return new Map();
  const rows = await UserPreference().findAll({
    where: { userId: { [Op.in]: userIds } },
    attributes: ["userId", "notifyTaskReminders", "notifyDeadlineAlerts"],
  });
  return new Map(rows.map((row) => [row.userId, row]));
};

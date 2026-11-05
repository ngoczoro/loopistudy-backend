import Joi from "joi";

const uuid = Joi.string().uuid();

const name = Joi.string().trim().min(1).max(100);
const description = Joi.string().trim().max(500).allow("", null);

export const groupIdParamSchema = Joi.object({
  groupId: uuid.required(),
});

export const memberParamSchema = Joi.object({
  groupId: uuid.required(),
  userId: uuid.required(),
});

export const createGroupSchema = Joi.object({
  name: name.required(),
  description: description.optional(),
});

/** Multipart fields arrive as strings; Joi converts "true"/"false" for booleans. */
export const updateGroupSchema = Joi.object({
  name: name.optional(),
  description: description.optional(),
  removeAvatar: Joi.boolean().optional(),
});

export const joinGroupSchema = Joi.object({
  inviteCode: Joi.string().trim().min(1).max(20).required(),
});

export const listMessagesQuerySchema = Joi.object({
  before: uuid.optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

/** Multipart text field; "content or files" is checked in the service. */
export const sendMessageSchema = Joi.object({
  content: Joi.string().allow("").max(2000).optional(),
});

export const listSharedQuerySchema = Joi.object({
  type: Joi.string().valid("media", "file", "link").required(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const resourceParamSchema = Joi.object({
  groupId: uuid.required(),
  resourceId: uuid.required(),
});

export const createResourceSchema = Joi.object({
  type: Joi.string().valid("link", "note", "file").required(),
  title: Joi.string().trim().min(1).max(200).when("type", {
    is: "link",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  description: Joi.string().trim().max(500).allow("", null).optional(),
  url: Joi.when("type", {
    is: "link",
    then: Joi.string().trim().uri({ scheme: ["http", "https"] }).required(),
    otherwise: Joi.valid(null).optional(),
  }),
  refId: Joi.when("type", {
    is: "link",
    then: Joi.valid(null).optional(),
    otherwise: uuid.required(),
  }),
});

export const goalParamSchema = Joi.object({
  groupId: uuid.required(),
  goalId: uuid.required(),
});

export const taskParamSchema = Joi.object({
  groupId: uuid.required(),
  taskId: uuid.required(),
});

const goalTitle = Joi.string().trim().min(1).max(200);
const goalDescription = Joi.string().trim().max(1000).allow("", null);

export const createGoalSchema = Joi.object({
  title: goalTitle.required(),
  description: goalDescription.optional(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref("startDate")).required(),
});

/** Range against the stored dates is checked in the service. */
export const updateGoalSchema = Joi.object({
  title: goalTitle.optional(),
  description: goalDescription.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
}).min(1);

const taskFields = {
  title: Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().max(2000).allow("", null),
  assigneeId: uuid.allow(null),
  dueAt: Joi.date().iso().allow(null),
  dependsOnTaskId: uuid.allow(null),
  goalId: uuid.allow(null),
};

export const createTaskSchema = Joi.object({
  ...taskFields,
  title: taskFields.title.required(),
});

export const updateTaskSchema = Joi.object({
  ...taskFields,
  status: Joi.string().valid("todo", "doing", "done"),
}).min(1);

export const listTasksQuerySchema = Joi.object({
  status: Joi.string().valid("todo", "doing", "done").optional(),
  assigneeId: uuid.optional(),
});

export const updateMySettingsSchema = Joi.object({
  pinned: Joi.boolean().optional(),
  muted: Joi.boolean().optional(),
}).min(1);

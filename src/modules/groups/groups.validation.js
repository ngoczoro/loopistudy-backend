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

export const updateMySettingsSchema = Joi.object({
  pinned: Joi.boolean().optional(),
  muted: Joi.boolean().optional(),
}).min(1);

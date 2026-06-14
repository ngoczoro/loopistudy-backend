import Joi from "joi";

const uuid = Joi.string().uuid();

export const quizIdParamSchema = Joi.object({
  id: uuid.required(),
});

export const updateQuizTitleSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title is required",
    "any.required": "Title is required",
    "string.max": "Title must be at most 200 characters",
  }),
});

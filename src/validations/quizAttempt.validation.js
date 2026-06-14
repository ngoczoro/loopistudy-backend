import Joi from "joi";

const uuid = Joi.string().uuid();

export const quizIdParamSchema = Joi.object({
  quizId: uuid.required(),
});

export const attemptIdParamSchema = Joi.object({
  attemptId: uuid.required(),
});

export const submitQuizAttemptSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionIndex: Joi.number().integer().min(0).required(),
        selectedIndex: Joi.number().integer().min(0).required(),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one answer is required",
      "any.required": "answers is required",
    }),
  startedAt: Joi.date().iso().optional(),
  durationSeconds: Joi.number().integer().min(0).optional(),
});

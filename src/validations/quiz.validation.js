import Joi from "joi";

const uuid = Joi.string().uuid();

export const quizIdParamSchema = Joi.object({
  id: uuid.required(),
});

const titleSchema = Joi.string().trim().min(1).max(200).messages({
  "string.empty": "Title is required",
  "string.min": "Title is required",
  "any.required": "Title is required",
  "string.max": "Title must be at most 200 characters",
});

export const updateQuizTitleSchema = Joi.object({
  title: titleSchema.required(),
});

const questionSchema = Joi.object({
  question: Joi.string().trim().min(1).max(1000).required().messages({
    "string.empty": "Every question needs text",
  }),
  options: Joi.array()
    .items(
      Joi.string().trim().min(1).max(500).messages({
        "string.empty": "Every answer option needs text",
      }),
    )
    .length(4)
    .unique((a, b) => a.toLowerCase() === b.toLowerCase())
    .required()
    .messages({
      "array.length": "Each question needs exactly 4 options",
      "array.unique": "Answer options in a question must be different",
    }),
  correctIndex: Joi.number().integer().min(0).max(3).required(),
  explanation: Joi.string().trim().allow("").max(1000).default(""),
  difficulty: Joi.string().valid("easy", "medium", "hard").default("medium"),
  sourceTopic: Joi.string().trim().allow("").max(200),
});

/** Manual quiz. AI quizzes are created by the /ai routes, never through this payload. */
export const createQuizSchema = Joi.object({
  title: titleSchema.required(),
  description: Joi.string().trim().allow("").max(2000),
  subjectId: uuid.allow(null),
  questions: Joi.array().items(questionSchema).min(1).max(50).required().messages({
    "array.min": "A quiz needs at least one question",
    "any.required": "A quiz needs at least one question",
  }),
});

/** Full edit of a quiz's title and question set (e.g. the review step after AI generation). */
export const updateQuizContentSchema = Joi.object({
  title: titleSchema,
  questions: Joi.array().items(questionSchema).min(1).max(50).messages({
    "array.min": "A quiz needs at least one question",
  }),
}).or("title", "questions");

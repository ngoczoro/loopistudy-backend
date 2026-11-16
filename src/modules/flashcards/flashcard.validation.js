import Joi from "joi";

export const pronunciationSchema = Joi.object({
  text: Joi.string().trim().min(1).max(80).required().messages({
    "string.empty": "Enter a word to pronounce.",
    "string.max": "Enter a shorter word or phrase (80 characters max).",
    "any.required": "Enter a word to pronounce.",
  }),
  lang: Joi.string().valid("en").required().messages({
    "any.only": "Only English pronunciation is available right now.",
  }),
});

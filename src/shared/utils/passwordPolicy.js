import Joi from "joi";

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt silently ignores everything after the first 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;

export const newPasswordField = () =>
  Joi.string()
    .min(PASSWORD_MIN_LENGTH)
    .custom((value, helpers) =>
      Buffer.byteLength(value, "utf8") > PASSWORD_MAX_BYTES
        ? helpers.error("password.tooLong")
        : value,
    )
    .messages({
      "password.tooLong": `Password must be at most ${PASSWORD_MAX_BYTES} bytes (about ${PASSWORD_MAX_BYTES} characters without accents)`,
    });

import { Router } from "express";
import Joi from "joi";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { getStatus, issueToken } from "./calls.controller.js";

const groupIdParamSchema = Joi.object({
  groupId: Joi.string().uuid().required(),
});

const validateGroupId = (req, res, next) => {
  const { error } = groupIdParamSchema.validate({ groupId: req.params.groupId });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details[0].message,
    });
  }
  next();
};

/** Mounted at `/groups/:groupId/call`. */
const router = Router({ mergeParams: true });

router.use(verifyTokenMiddleware);
router.use(validateGroupId);

router.get("/", getStatus);
router.post("/token", issueToken);

export default router;

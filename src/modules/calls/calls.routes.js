import { Router } from "express";
import Joi from "joi";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../validations/schemas.js";
import {
  endMeet,
  getStatus,
  issueToken,
  leaveCall,
  shareMeet,
  startMeet,
} from "./calls.controller.js";

const groupIdParamSchema = Joi.object({
  groupId: Joi.string().uuid().required(),
});

const shareMeetSchema = Joi.object({
  url: Joi.string().trim().max(300).required(),
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
// Sent when someone presses Leave, so the last one out ends the call right away.
router.post("/leave", leaveCall);

// Google Meet fallback: create through the API, share a pasted link, or end it.
router.post("/meet", startMeet);
router.put("/meet", validateBody(shareMeetSchema), shareMeet);
router.delete("/meet", endMeet);

export default router;

import { Router } from "express";
import { verifyTokenMiddleware } from "../../middlewares/authMiddleware.js";
import { suggestPronunciations, uploadCardImage } from "./flashcard.controller.js";
import { uploadCardImage as uploadCardImageFile } from "./flashcard.upload.js";
import { pronunciationSchema } from "./flashcard.validation.js";

const validatePronunciation = (req, res, next) => {
  const { error, value } = pronunciationSchema.validate(req.body ?? {}, {
    abortEarly: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  req.body = value;
  next();
};

const router = Router();

router.use(verifyTokenMiddleware);

router.post("/images", uploadCardImageFile, uploadCardImage);
router.post("/pronunciations", validatePronunciation, suggestPronunciations);

export default router;

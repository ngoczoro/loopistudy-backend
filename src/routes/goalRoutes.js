import express from 'express';
import { getGoals, createGoal } from '../controllers/goalController.js';
import { verifyTokenMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.route('/')
  .get(getGoals)
  .post(createGoal);

export default router;

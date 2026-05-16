import express from 'express';
import { getQuizzes, getQuizById, createQuiz } from '../controllers/quizController.js';
import { verifyTokenMiddleware, verifyRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.route('/')
  .get(getQuizzes)
  .post(verifyRole('admin'), createQuiz);

router.route('/:id')
  .get(getQuizById);

export default router;

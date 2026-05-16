import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { verifyTokenMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.route('/')
  .get(getNotifications);

router.route('/:id/read')
  .patch(markAsRead);

export default router;

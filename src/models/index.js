import sequelize from "../config/database.js";
import { defineUserModel } from "./User.js";
import { defineSubjectModel } from "./Subject.js";
import { defineStudyPlanModel } from "./StudyPlan.js";
import { defineStudySessionModel } from "./StudySession.js";
import { definePomodoroSessionModel } from "./PomodoroSession.js";
import { defineEmailOtpModel } from "./EmailOtp.js";

import defineNoteModel from "./Note.js";
import defineNoteTagModel from "./NoteTag.js";
import defineQuizModel from "./Quiz.js";
import defineQuizQuestionModel from "./QuizQuestion.js";
import defineQuizQuestionOptionModel from "./QuizQuestionOption.js";
import defineQuizAttemptModel from "./QuizAttempt.js";
import defineQuizAttemptAnswerModel from "./QuizAttemptAnswer.js";
import defineGoalModel from "./Goal.js";
import defineGoalProgressModel from "./GoalProgress.js";
import defineStreakModel from "./Streak.js";
import defineAchievementModel from "./Achievement.js";
import defineUserAchievementModel from "./UserAchievement.js";
import defineNotificationModel from "./Notification.js";
import defineUserWarningModel from "./UserWarning.js";
import defineAdminLogModel from "./AdminLog.js";
import defineRefreshTokenModel from "./RefreshToken.js";
import defineAnnouncementModel from "./Announcement.js";

export const initializeModels = () => {
  const models = {
    User: defineUserModel(sequelize),
    Subject: defineSubjectModel(sequelize),
    StudyPlan: defineStudyPlanModel(sequelize),
    StudySession: defineStudySessionModel(sequelize),
    PomodoroSession: definePomodoroSessionModel(sequelize),
    EmailOtp: defineEmailOtpModel(sequelize),
    Note: defineNoteModel(sequelize),
    NoteTag: defineNoteTagModel(sequelize),
    Quiz: defineQuizModel(sequelize),
    QuizQuestion: defineQuizQuestionModel(sequelize),
    QuizQuestionOption: defineQuizQuestionOptionModel(sequelize),
    QuizAttempt: defineQuizAttemptModel(sequelize),
    QuizAttemptAnswer: defineQuizAttemptAnswerModel(sequelize),
    Goal: defineGoalModel(sequelize),
    GoalProgress: defineGoalProgressModel(sequelize),
    Streak: defineStreakModel(sequelize),
    Achievement: defineAchievementModel(sequelize),
    UserAchievement: defineUserAchievementModel(sequelize),
    Notification: defineNotificationModel(sequelize),
    UserWarning: defineUserWarningModel(sequelize),
    AdminLog: defineAdminLogModel(sequelize),
    RefreshToken: defineRefreshTokenModel(sequelize),
    Announcement: defineAnnouncementModel(sequelize),
  };

  setupAssociations(models);
  return models;
};

const setupAssociations = (models) => {
  const {
    User, Subject, StudyPlan, StudySession, PomodoroSession, EmailOtp,
    Note, NoteTag, Quiz, QuizQuestion, QuizQuestionOption, QuizAttempt, QuizAttemptAnswer,
    Goal, GoalProgress, Streak, Achievement, UserAchievement, Notification, UserWarning,
    AdminLog, RefreshToken, Announcement
  } = models;

  // User associations
  User.hasMany(Subject, { foreignKey: "userId", as: "subjects", onDelete: "CASCADE" });
  User.hasMany(StudyPlan, { foreignKey: "userId", as: "studyPlans", onDelete: "CASCADE" });
  User.hasMany(StudySession, { foreignKey: "userId", as: "studySessions", onDelete: "CASCADE" });
  User.hasMany(PomodoroSession, { foreignKey: "userId", as: "pomodoroSessions", onDelete: "CASCADE" });
  User.hasMany(EmailOtp, { foreignKey: "userId", as: "emailOtps", onDelete: "CASCADE" });
  User.hasMany(Note, { foreignKey: "userId", as: "notes", onDelete: "CASCADE" });
  User.hasMany(Goal, { foreignKey: "userId", as: "goals", onDelete: "CASCADE" });
  User.hasMany(QuizAttempt, { foreignKey: "userId", as: "quizAttempts", onDelete: "CASCADE" });
  User.hasMany(UserWarning, { foreignKey: "userId", as: "warnings", onDelete: "CASCADE" });
  User.hasMany(Notification, { foreignKey: "userId", as: "notifications", onDelete: "CASCADE" });
  User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens", onDelete: "CASCADE" });
  User.hasMany(AdminLog, { foreignKey: "adminId", as: "adminLogs" });
  User.hasOne(Streak, { foreignKey: "userId", as: "streak", onDelete: "CASCADE" });
  User.belongsToMany(Achievement, { through: UserAchievement, foreignKey: 'userId', as: 'achievements' });

  // Subject associations
  Subject.belongsTo(User, { foreignKey: "userId", as: "user" });
  Subject.hasMany(StudySession, { foreignKey: "subjectId", as: "sessions", onDelete: "CASCADE" });
  Subject.hasMany(Note, { foreignKey: "subjectId", as: "notes", onDelete: "CASCADE" });
  Subject.hasMany(Quiz, { foreignKey: "subjectId", as: "quizzes", onDelete: "CASCADE" });

  // StudyPlan
  StudyPlan.belongsTo(User, { foreignKey: "userId", as: "user" });
  StudyPlan.hasMany(StudySession, { foreignKey: "studyPlanId", as: "sessions", onDelete: "SET NULL" });

  // StudySession
  StudySession.belongsTo(User, { foreignKey: "userId", as: "user" });
  StudySession.belongsTo(StudyPlan, { foreignKey: "studyPlanId", as: "studyPlan" });
  StudySession.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });
  StudySession.hasMany(PomodoroSession, { foreignKey: "studySessionId", as: "pomodoroSessions", onDelete: "CASCADE" });

  // PomodoroSession
  PomodoroSession.belongsTo(User, { foreignKey: "userId", as: "user" });
  PomodoroSession.belongsTo(StudySession, { foreignKey: "studySessionId", as: "studySession" });

  // EmailOtp
  EmailOtp.belongsTo(User, { foreignKey: "userId", as: "user", onDelete: "CASCADE" });

  // Note
  Note.belongsTo(User, { foreignKey: "userId", as: "user" });
  Note.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });
  Note.hasMany(NoteTag, { foreignKey: "noteId", as: "tags", onDelete: "CASCADE" });
  NoteTag.belongsTo(Note, { foreignKey: "noteId", as: "note" });

  // Quiz
  Quiz.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });
  Quiz.belongsTo(User, { foreignKey: "createdByAdminId", as: "createdByAdmin" });
  Quiz.hasMany(QuizQuestion, { foreignKey: "quizId", as: "questions", onDelete: "CASCADE" });
  Quiz.hasMany(QuizAttempt, { foreignKey: "quizId", as: "attempts", onDelete: "CASCADE" });

  // QuizQuestion
  QuizQuestion.belongsTo(Quiz, { foreignKey: "quizId", as: "quiz" });
  QuizQuestion.hasMany(QuizQuestionOption, { foreignKey: "questionId", as: "options", onDelete: "CASCADE" });
  QuizQuestionOption.belongsTo(QuizQuestion, { foreignKey: "questionId", as: "question" });

  // QuizAttempt
  QuizAttempt.belongsTo(User, { foreignKey: "userId", as: "user" });
  QuizAttempt.belongsTo(Quiz, { foreignKey: "quizId", as: "quiz" });
  QuizAttempt.hasMany(QuizAttemptAnswer, { foreignKey: "attemptId", as: "answers", onDelete: "CASCADE" });
  QuizAttemptAnswer.belongsTo(QuizAttempt, { foreignKey: "attemptId", as: "attempt" });
  QuizAttemptAnswer.belongsTo(QuizQuestion, { foreignKey: "questionId", as: "question" });
  QuizAttemptAnswer.belongsTo(QuizQuestionOption, { foreignKey: "selectedOptionId", as: "selectedOption" });

  // Goal
  Goal.belongsTo(User, { foreignKey: "userId", as: "user" });
  Goal.hasMany(GoalProgress, { foreignKey: "goalId", as: "progress", onDelete: "CASCADE" });
  GoalProgress.belongsTo(Goal, { foreignKey: "goalId", as: "goal" });

  // Streak
  Streak.belongsTo(User, { foreignKey: "userId", as: "user" });

  // Achievement
  Achievement.belongsToMany(User, { through: UserAchievement, foreignKey: 'achievementId', as: 'users' });

  // Notification
  Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

  // UserWarning
  UserWarning.belongsTo(User, { foreignKey: "userId", as: "user" });
  UserWarning.belongsTo(User, { foreignKey: "issuedByAdminId", as: "issuedByAdmin" });

  // AdminLog
  AdminLog.belongsTo(User, { foreignKey: "adminId", as: "admin" });

  // RefreshToken
  RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  // Announcement
  Announcement.belongsTo(User, { foreignKey: "createdByAdminId", as: "createdByAdmin" });
};

export default sequelize;

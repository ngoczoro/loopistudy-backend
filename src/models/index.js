import sequelize from "../config/database.js";
import { defineUserModel } from "./User.js";
import { defineSubjectModel } from "./Subject.js";
import { defineDocumentModel } from "./Document.js";
import { defineNoteModel } from "./Note.js";
import { defineQuizModel } from "./Quiz.js";
import { defineQuizQuestionModel } from "./QuizQuestion.js";
import { defineQuizAttemptModel } from "./QuizAttempt.js";
import { defineQuizAnswerModel } from "./QuizAnswer.js";
import { defineTaskModel } from "./Task.js";
import { defineStudyPlanModel } from "./StudyPlan.js";
import { defineStudySessionModel } from "./StudySession.js";
import { definePomodoroSessionModel } from "./PomodoroSession.js";
import { defineStudyGoalModel } from "./StudyGoal.js";
import { defineStreakModel } from "./Streak.js";
import { defineNotificationModel } from "./Notification.js";
import { defineAIRequestModel } from "./AIRequest.js";
import { defineViolationModel } from "./Violation.js";
import { defineRefreshTokenModel } from "./RefreshToken.js";
import { defineOtpCodeModel } from "./OtpCode.js";

export const initializeModels = () => {
  const models = {
    User: defineUserModel(sequelize),
    Subject: defineSubjectModel(sequelize),
    Document: defineDocumentModel(sequelize),
    Note: defineNoteModel(sequelize),
    Quiz: defineQuizModel(sequelize),
    QuizQuestion: defineQuizQuestionModel(sequelize),
    QuizAttempt: defineQuizAttemptModel(sequelize),
    QuizAnswer: defineQuizAnswerModel(sequelize),
    Task: defineTaskModel(sequelize),
    StudyPlan: defineStudyPlanModel(sequelize),
    StudySession: defineStudySessionModel(sequelize),
    PomodoroSession: definePomodoroSessionModel(sequelize),
    StudyGoal: defineStudyGoalModel(sequelize),
    Streak: defineStreakModel(sequelize),
    Notification: defineNotificationModel(sequelize),
    AIRequest: defineAIRequestModel(sequelize),
    Violation: defineViolationModel(sequelize),
    RefreshToken: defineRefreshTokenModel(sequelize),
    EmailOtp: defineOtpCodeModel(sequelize), // alias as EmailOtp for backwards compatibility in authController
  };

  const {
    User, Subject, Document, Note, Quiz, QuizQuestion, QuizAttempt, QuizAnswer,
    Task, StudyPlan, StudySession, PomodoroSession, StudyGoal, Streak,
    Notification, AIRequest, RefreshToken, Violation, EmailOtp
  } = models;

  // --- USER ASSOCIATIONS ---
  User.hasMany(Subject, { foreignKey: 'user_id', as: 'subjects' });
  User.hasMany(Document, { foreignKey: 'user_id', as: 'documents' });
  User.hasMany(Task, { foreignKey: 'user_id', as: 'tasks' });
  User.hasMany(PomodoroSession, { foreignKey: 'user_id', as: 'pomodoroSessions' });
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
  User.hasMany(QuizAttempt, { foreignKey: 'user_id', as: 'quizAttempts' });
  User.hasMany(Quiz, { foreignKey: 'user_id', as: 'quizzes' });
  User.hasMany(AIRequest, { foreignKey: 'user_id', as: 'aiRequests' });
  User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
  User.hasMany(EmailOtp, { foreignKey: 'user_id', as: 'emailOtps' });
  User.hasOne(StudyGoal, { foreignKey: 'user_id', as: 'studyGoal' });
  User.hasOne(Streak, { foreignKey: 'user_id', as: 'streak' });

  // --- SUBJECT ASSOCIATIONS ---
  Subject.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Subject.hasMany(Document, { foreignKey: 'subject_id', as: 'documents' });
  Subject.hasMany(Task, { foreignKey: 'subject_id', as: 'tasks' });
  Subject.hasMany(StudyPlan, { foreignKey: 'subject_id', as: 'studyPlans' });
  Subject.hasMany(PomodoroSession, { foreignKey: 'subject_id', as: 'pomodoroSessions' });

  // --- DOCUMENT ASSOCIATIONS ---
  Document.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Document.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
  Document.hasMany(Note, { foreignKey: 'document_id', as: 'notes' });
  Document.hasMany(Quiz, { foreignKey: 'document_id', as: 'quizzes' });
  Document.hasMany(AIRequest, { foreignKey: 'document_id', as: 'aiRequests' });

  // --- NOTE ASSOCIATIONS ---
  Note.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
  Note.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // --- QUIZ ASSOCIATIONS ---
  Quiz.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
  Quiz.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Quiz.hasMany(QuizQuestion, { foreignKey: 'quiz_id', as: 'questions' });
  Quiz.hasMany(QuizAttempt, { foreignKey: 'quiz_id', as: 'attempts' });

  QuizQuestion.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
  QuizQuestion.hasMany(QuizAnswer, { foreignKey: 'question_id', as: 'answers' });
  
  QuizAttempt.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  QuizAttempt.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
  QuizAttempt.hasMany(QuizAnswer, { foreignKey: 'attempt_id', as: 'answers' });
  
  QuizAnswer.belongsTo(QuizAttempt, { foreignKey: 'attempt_id', as: 'attempt' });
  QuizAnswer.belongsTo(QuizQuestion, { foreignKey: 'question_id', as: 'question' });

  // --- TASK ASSOCIATIONS ---
  Task.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Task.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

  // --- STUDY PLAN & SESSION ---
  StudyPlan.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
  StudyPlan.hasMany(StudySession, { foreignKey: 'study_plan_id', as: 'sessions' });
  StudySession.belongsTo(StudyPlan, { foreignKey: 'study_plan_id', as: 'studyPlan' });

  // --- POMODORO ---
  PomodoroSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  PomodoroSession.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

  // --- OTHERS ---
  StudyGoal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Streak.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  AIRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  AIRequest.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
  RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  EmailOtp.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Alias for backward compatibility in authController
  sequelize.models.EmailOtp = sequelize.models.OtpCode;

  return models;
};

export default sequelize;

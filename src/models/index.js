import sequelize from "../config/database.js";
import { defineUserModel } from "./User.js";
import { defineSubjectModel } from "./Subject.js";
import { defineStudyPlanModel } from "./StudyPlan.js";
import { defineStudySessionModel } from "./StudySession.js";
import { definePomodoroSessionModel } from "./PomodoroSession.js";
import { defineEmailOtpModel } from "./EmailOtp.js";

/**
 * Initialize all models
 */
export const initializeModels = () => {
  const models = {
    User: defineUserModel(sequelize),
    Subject: defineSubjectModel(sequelize),
    StudyPlan: defineStudyPlanModel(sequelize),
    StudySession: defineStudySessionModel(sequelize),
    PomodoroSession: definePomodoroSessionModel(sequelize),
    EmailOtp: defineEmailOtpModel(sequelize),
    // Add more models here as they are created
  };

  // Define associations
  setupAssociations(models);

  return models;
};

/**
 * Setup model associations
 */
const setupAssociations = (models) => {
  const { User, Subject, StudyPlan, StudySession, PomodoroSession, EmailOtp } =
    models;

  // User associations
  User.hasMany(Subject, {
    foreignKey: "userId",
    as: "subjects",
    onDelete: "CASCADE",
  });
  User.hasMany(StudyPlan, {
    foreignKey: "userId",
    as: "studyPlans",
    onDelete: "CASCADE",
  });
  User.hasMany(StudySession, {
    foreignKey: "userId",
    as: "studySessions",
    onDelete: "CASCADE",
  });
  User.hasMany(PomodoroSession, {
    foreignKey: "userId",
    as: "pomodoroSessions",
    onDelete: "CASCADE",
  });
  User.hasMany(EmailOtp, {
    foreignKey: "userId",
    as: "emailOtps",
    onDelete: "CASCADE",
  });

  // Subject associations
  Subject.belongsTo(User, { foreignKey: "userId", as: "user" });
  Subject.hasMany(StudySession, {
    foreignKey: "subjectId",
    as: "sessions",
    onDelete: "CASCADE",
  });

  // StudyPlan associations
  StudyPlan.belongsTo(User, { foreignKey: "userId", as: "user" });
  StudyPlan.hasMany(StudySession, {
    foreignKey: "studyPlanId",
    as: "sessions",
    onDelete: "SET NULL",
  });

  // StudySession associations
  StudySession.belongsTo(User, { foreignKey: "userId", as: "user" });
  StudySession.belongsTo(StudyPlan, {
    foreignKey: "studyPlanId",
    as: "studyPlan",
  });
  StudySession.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });
  StudySession.hasMany(PomodoroSession, {
    foreignKey: "studySessionId",
    as: "pomodoroSessions",
    onDelete: "CASCADE",
  });

  // PomodoroSession associations
  PomodoroSession.belongsTo(User, { foreignKey: "userId", as: "user" });
  PomodoroSession.belongsTo(StudySession, {
    foreignKey: "studySessionId",
    as: "studySession",
  });

  // EmailOtp associations
  EmailOtp.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
  });
};

export default sequelize;

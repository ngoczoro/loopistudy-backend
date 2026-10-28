import sequelize from "../config/database.js";
import { defineUserModel } from "./User.js";
import { defineRefreshTokenModel } from "./RefreshToken.js";
import { defineOtpCodeModel } from "./OtpCode.js";
import { defineUserPreferenceModel } from "./UserPreference.js";
import { defineBlockedSlotModel } from "./BlockedSlot.js";
import { defineSubjectModel } from "./Subject.js";
import { defineContentItemModel } from "./ContentItem.js";
import { defineTaskModel } from "./Task.js";
import { definePlannerSessionModel } from "./PlannerSession.js";
import { defineFocusSessionModel } from "./FocusSession.js";
import { defineQuizModel } from "./Quiz.js";
import { defineQuizAttemptModel } from "./QuizAttempt.js";
import { defineStudyGoalModel } from "./StudyGoal.js";
import { defineUserStreakModel } from "./UserStreak.js";
import { defineBadgeModel } from "./Badge.js";
import { defineUserBadgeModel } from "./UserBadge.js";
import { defineNotificationModel } from "./Notification.js";
import { defineViolationModel } from "./Violation.js";
import { defineAIRequestModel } from "./AIRequest.js";
import { defineDocumentSummaryModel } from "./DocumentSummary.js";
import { defineAiResourceRecommendationHistoryModel } from "./AiResourceRecommendationHistory.js";
import { defineSavedLearningResourceModel } from "./SavedLearningResource.js";
import { defineStudyGroupModel } from "./StudyGroup.js";
import { defineGroupMemberModel } from "./GroupMember.js";
import { defineGroupMessageModel } from "./GroupMessage.js";
import { defineGroupMessageAttachmentModel } from "./GroupMessageAttachment.js";
import { defineGroupResourceModel } from "./GroupResource.js";
import { defineGroupGoalModel } from "./GroupGoal.js";
import { defineGroupTaskModel } from "./GroupTask.js";

export const initializeModels = () => {
  const User = defineUserModel(sequelize);
  const RefreshToken = defineRefreshTokenModel(sequelize);
  const OtpCode = defineOtpCodeModel(sequelize);
  const UserPreference = defineUserPreferenceModel(sequelize);
  const BlockedSlot = defineBlockedSlotModel(sequelize);
  const Subject = defineSubjectModel(sequelize);
  const ContentItem = defineContentItemModel(sequelize);
  const Task = defineTaskModel(sequelize);
  const PlannerSession = definePlannerSessionModel(sequelize);
  const FocusSession = defineFocusSessionModel(sequelize);
  const Quiz = defineQuizModel(sequelize);
  const QuizAttempt = defineQuizAttemptModel(sequelize);
  const StudyGoal = defineStudyGoalModel(sequelize);
  const UserStreak = defineUserStreakModel(sequelize);
  const Badge = defineBadgeModel(sequelize);
  const UserBadge = defineUserBadgeModel(sequelize);
  const Notification = defineNotificationModel(sequelize);
  const Violation = defineViolationModel(sequelize);
  const AIRequest = defineAIRequestModel(sequelize);
  const DocumentSummary = defineDocumentSummaryModel(sequelize);
  const AiResourceRecommendationHistory =
    defineAiResourceRecommendationHistoryModel(sequelize);
  const SavedLearningResource = defineSavedLearningResourceModel(sequelize);
  const StudyGroup = defineStudyGroupModel(sequelize);
  const GroupMember = defineGroupMemberModel(sequelize);
  const GroupMessage = defineGroupMessageModel(sequelize);
  const GroupMessageAttachment = defineGroupMessageAttachmentModel(sequelize);
  const GroupResource = defineGroupResourceModel(sequelize);
  const GroupGoal = defineGroupGoalModel(sequelize);
  const GroupTask = defineGroupTaskModel(sequelize);

  // --- User ownership graph ---
  User.hasMany(RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
  RefreshToken.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(OtpCode, { foreignKey: "user_id", as: "otpCodes" });
  OtpCode.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasOne(UserPreference, { foreignKey: "user_id", as: "preferences" });
  UserPreference.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(BlockedSlot, { foreignKey: "user_id", as: "blockedSlots" });
  BlockedSlot.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(Subject, { foreignKey: "user_id", as: "subjects" });
  Subject.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(ContentItem, { foreignKey: "user_id", as: "contentItems" });
  ContentItem.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(Task, { foreignKey: "user_id", as: "tasks" });
  Task.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(PlannerSession, {
    foreignKey: "user_id",
    as: "plannerSessions",
  });
  PlannerSession.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(FocusSession, { foreignKey: "user_id", as: "focusSessions" });
  FocusSession.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(Quiz, { foreignKey: "user_id", as: "quizzes" });
  Quiz.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(QuizAttempt, { foreignKey: "user_id", as: "quizAttempts" });
  QuizAttempt.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(StudyGoal, { foreignKey: "user_id", as: "studyGoals" });
  StudyGoal.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasOne(UserStreak, { foreignKey: "user_id", as: "streak" });
  UserStreak.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.belongsToMany(Badge, {
    through: UserBadge,
    foreignKey: "user_id",
    otherKey: "badge_id",
    as: "badges",
  });
  Badge.belongsToMany(User, {
    through: UserBadge,
    foreignKey: "badge_id",
    otherKey: "user_id",
    as: "users",
  });

  User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(Violation, { foreignKey: "user_id", as: "violations" });
  Violation.belongsTo(User, { foreignKey: "user_id", as: "user" });

  User.hasMany(Violation, {
    foreignKey: "resolved_by",
    as: "resolvedViolations",
  });
  Violation.belongsTo(User, { foreignKey: "resolved_by", as: "resolver" });

  User.hasMany(AIRequest, { foreignKey: "user_id", as: "aiRequests" });
  AIRequest.belongsTo(User, { foreignKey: "user_id", as: "user" });

  // --- Subject relations ---
  Subject.hasMany(ContentItem, {
    foreignKey: "subject_id",
    as: "contentItems",
  });
  ContentItem.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });

  Subject.hasMany(Task, { foreignKey: "subject_id", as: "tasks" });
  Task.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });

  Subject.hasMany(PlannerSession, {
    foreignKey: "subject_id",
    as: "plannerSessions",
  });
  PlannerSession.belongsTo(Subject, {
    foreignKey: "subject_id",
    as: "subject",
  });

  Subject.hasMany(FocusSession, {
    foreignKey: "subject_id",
    as: "focusSessions",
  });
  FocusSession.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });

  Subject.hasMany(Quiz, { foreignKey: "subject_id", as: "quizzes" });
  Quiz.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });

  ContentItem.hasMany(Quiz, {
    foreignKey: "source_document_id",
    as: "sourceQuizzes",
  });
  Quiz.belongsTo(ContentItem, {
    foreignKey: "source_document_id",
    as: "sourceDocument",
  });

  Subject.hasMany(AIRequest, { foreignKey: "subject_id", as: "aiRequests" });
  AIRequest.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });

  // --- Planner → Focus ---
  PlannerSession.hasMany(FocusSession, {
    foreignKey: "planner_session_id",
    as: "focusSessions",
  });
  FocusSession.belongsTo(PlannerSession, {
    foreignKey: "planner_session_id",
    as: "plannerSession",
  });

  // --- Quiz attempts ---
  Quiz.hasMany(QuizAttempt, { foreignKey: "quiz_id", as: "attempts" });
  QuizAttempt.belongsTo(Quiz, { foreignKey: "quiz_id", as: "quiz" });

  // --- Content moderation & AI ---
  ContentItem.hasMany(Violation, {
    foreignKey: "content_item_id",
    as: "violations",
  });
  Violation.belongsTo(ContentItem, {
    foreignKey: "content_item_id",
    as: "contentItem",
  });

  ContentItem.hasMany(AIRequest, {
    foreignKey: "content_item_id",
    as: "aiRequests",
  });
  AIRequest.belongsTo(ContentItem, {
    foreignKey: "content_item_id",
    as: "contentItem",
  });

  ContentItem.hasOne(DocumentSummary, {
    foreignKey: "document_id",
    as: "documentSummary",
  });
  DocumentSummary.belongsTo(ContentItem, {
    foreignKey: "document_id",
    as: "contentItem",
  });

  User.hasMany(DocumentSummary, {
    foreignKey: "created_by",
    as: "documentSummaries",
  });
  DocumentSummary.belongsTo(User, {
    foreignKey: "created_by",
    as: "creator",
  });

  User.hasMany(AiResourceRecommendationHistory, {
    foreignKey: "user_id",
    as: "resourceRecommendationHistories",
  });
  AiResourceRecommendationHistory.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });
  Subject.hasMany(AiResourceRecommendationHistory, {
    foreignKey: "subject_id",
    as: "resourceRecommendationHistories",
  });
  AiResourceRecommendationHistory.belongsTo(Subject, {
    foreignKey: "subject_id",
    as: "subject",
  });

  User.hasMany(SavedLearningResource, {
    foreignKey: "user_id",
    as: "savedLearningResources",
  });
  SavedLearningResource.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });
  Subject.hasMany(SavedLearningResource, {
    foreignKey: "subject_id",
    as: "savedLearningResources",
  });
  SavedLearningResource.belongsTo(Subject, {
    foreignKey: "subject_id",
    as: "subject",
  });

  // --- Study groups ---
  User.hasMany(StudyGroup, { foreignKey: "ownerId", as: "ownedGroups" });
  StudyGroup.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

  StudyGroup.hasMany(GroupMember, { foreignKey: "groupId", as: "members" });
  GroupMember.belongsTo(StudyGroup, { foreignKey: "groupId", as: "group" });

  User.hasMany(GroupMember, { foreignKey: "userId", as: "groupMemberships" });
  GroupMember.belongsTo(User, { foreignKey: "userId", as: "user" });

  StudyGroup.hasMany(GroupMessage, { foreignKey: "groupId", as: "messages" });
  GroupMessage.belongsTo(StudyGroup, { foreignKey: "groupId", as: "group" });
  GroupMessage.belongsTo(User, { foreignKey: "senderId", as: "sender" });

  GroupMessage.hasMany(GroupMessageAttachment, {
    foreignKey: "messageId",
    as: "attachments",
  });
  GroupMessageAttachment.belongsTo(GroupMessage, {
    foreignKey: "messageId",
    as: "message",
  });

  StudyGroup.hasMany(GroupResource, { foreignKey: "groupId", as: "resources" });
  GroupResource.belongsTo(StudyGroup, { foreignKey: "groupId", as: "group" });
  GroupResource.belongsTo(User, { foreignKey: "sharedBy", as: "sharer" });

  StudyGroup.hasMany(GroupGoal, { foreignKey: "groupId", as: "goals" });
  GroupGoal.belongsTo(StudyGroup, { foreignKey: "groupId", as: "group" });
  GroupGoal.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  StudyGroup.hasMany(GroupTask, { foreignKey: "groupId", as: "tasks" });
  GroupTask.belongsTo(StudyGroup, { foreignKey: "groupId", as: "group" });
  GroupTask.belongsTo(GroupGoal, { foreignKey: "goalId", as: "goal" });
  GroupTask.belongsTo(User, { foreignKey: "assigneeId", as: "assignee" });
  GroupTask.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  GroupTask.belongsTo(GroupTask, { foreignKey: "dependsOnTaskId", as: "dependsOn" });

  // Backward-compatible alias for auth layer
  sequelize.models.EmailOtp = OtpCode;

  return {
    User,
    RefreshToken,
    OtpCode,
    EmailOtp: OtpCode,
    UserPreference,
    BlockedSlot,
    Subject,
    ContentItem,
    Task,
    PlannerSession,
    FocusSession,
    Quiz,
    QuizAttempt,
    StudyGoal,
    UserStreak,
    Badge,
    UserBadge,
    Notification,
    Violation,
    AIRequest,
    DocumentSummary,
    AiResourceRecommendationHistory,
    SavedLearningResource,
    StudyGroup,
    GroupMember,
    GroupMessage,
    GroupMessageAttachment,
    GroupResource,
    GroupGoal,
    GroupTask,
  };
};

export default sequelize;

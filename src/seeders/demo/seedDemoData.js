import { FOCUS_SESSION_STATUS } from "../../config/constants.js";
import { getStreak } from "../../modules/focus/focus.analytics.service.js";
import {
  DEMO_PASSWORD,
  DEMO_SEED_KEY,
  DEMO_USERS,
  EXTRA_BADGE_ROWS,
  SUBJECT_TEMPLATES,
} from "./constants.js";
import {
  addDays,
  atHourOnDate,
  clearAllDemoUsersData,
  daysAgo,
  ensureDemoUser,
  getWeekStartDate,
  hashDemoPassword,
  hoursAgo,
  toDateOnly,
  upsertExtraBadges,
  withSeedMetadata,
} from "./helpers.js";

const QUALIFYING_WORK_SECONDS = 1500;
const SAMPLE_QUIZ_QUESTIONS = [
  {
    question: "What is the determinant of a 2×2 identity matrix?",
    options: ["0", "1", "2", "-1"],
    correctIndex: 1,
    explanation: "The identity matrix has determinant 1.",
    difficulty: "easy",
  },
  {
    question: "Which data structure uses FIFO ordering?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correctIndex: 1,
    explanation: "Queues are first-in, first-out.",
    difficulty: "easy",
  },
  {
    question: "Photosynthesis primarily occurs in which organelle?",
    options: ["Mitochondria", "Nucleus", "Chloroplast", "Ribosome"],
    correctIndex: 2,
    explanation: "Chloroplasts capture light energy.",
    difficulty: "medium",
  },
];

const seedUserPreferences = async (sequelize, userId) => {
  const { UserPreference } = sequelize.models;

  await UserPreference.upsert({
    userId,
    pomodoroDurationMin: 25,
    breakDurationMin: 5,
    maxStudyHoursPerDay: 4,
    notifyTaskReminders: true,
    notifySessionReminders: true,
    notifyDeadlineAlerts: true,
  });
};

const seedBlockedSlots = async (sequelize, userId) => {
  const { BlockedSlot } = sequelize.models;
  const slots = [
    { dayOfWeek: 0, hour: 20 },
    { dayOfWeek: 5, hour: 10 },
    { dayOfWeek: 5, hour: 11 },
  ];

  for (const slot of slots) {
    await BlockedSlot.findOrCreate({
      where: { userId, dayOfWeek: slot.dayOfWeek, hour: slot.hour },
      defaults: { userId, ...slot },
    });
  }
};

const seedSubjectsForUser = async (sequelize, userId, templates) => {
  const { Subject } = sequelize.models;
  const today = toDateOnly(new Date());
  const created = {};

  for (const template of templates) {
    const subject = await Subject.create({
      userId,
      name: template.name,
      credits: template.credits,
      difficulty: template.difficulty,
      priority: template.priority,
      color: template.color,
      requiredHoursPerWeek: template.requiredHoursPerWeek,
      progress: template.progress,
      examDate: addDays(today, template.examDateOffsetDays),
    });
    created[template.key] = subject;
  }

  return created;
};

const seedContentForUser = async (sequelize, userId, subjects, profile) => {
  const { ContentItem } = sequelize.models;
  const rows = [];

  if (profile === "primary") {
    rows.push(
      {
        title: "Eigenvalues Cheat Sheet",
        type: "note",
        subjectId: subjects.linear_algebra.id,
        content:
          "Summary of eigenvalues, eigenvectors, and diagonalization steps for exam review.",
        createdAt: hoursAgo(6),
      },
      {
        title: "Binary Trees — Lecture Notes",
        type: "note",
        subjectId: subjects.computer_science.id,
        content: "Traversal algorithms, BST properties, and balancing overview.",
        createdAt: hoursAgo(30),
      },
      {
        title: "Khan Academy — Cellular Respiration",
        type: "link",
        subjectId: subjects.biology.id,
        content: "https://www.khanacademy.org/science/biology",
        createdAt: hoursAgo(52),
      },
    );
  } else if (profile === "secondary") {
    rows.push(
      {
        title: "Probability Distributions",
        type: "note",
        subjectId: subjects.statistics.id,
        content: "Normal, binomial, and Poisson distribution reference.",
        createdAt: hoursAgo(14),
      },
      {
        title: "Poetry Analysis Guide",
        type: "note",
        subjectId: subjects.english.id,
        content: "Themes, meter, and close-reading checklist.",
        createdAt: hoursAgo(40),
      },
    );
  } else if (profile === "flagged") {
    rows.push(
      {
        title: "Organic Chemistry Reaction Map",
        type: "note",
        subjectId: subjects.chemistry.id,
        content: "Legitimate study notes for substitution and elimination reactions.",
        createdAt: hoursAgo(20),
      },
      {
        title: "BUY CHEAP STUDY HACKS NOW!!!",
        type: "note",
        subjectId: null,
        content: "Spam content kept for admin moderation demo.",
        createdAt: hoursAgo(3),
      },
    );
  } else if (profile === "locked") {
    rows.push({
      title: "Historical Timeline Draft",
      type: "note",
      subjectId: subjects.history.id,
      content: "Draft notes before account lock.",
      createdAt: hoursAgo(120),
    });
  }

  const created = [];
  for (const row of rows) {
    const item = await ContentItem.create({
      userId,
      subjectId: row.subjectId,
      title: row.title,
      type: row.type,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    });
    created.push(item);
  }

  return created;
};

const seedTasksForUser = async (sequelize, userId, subjects, profile) => {
  const { Task } = sequelize.models;
  const today = toDateOnly(new Date());
  const specs = [];

  if (profile === "primary") {
    const subjectIds = Object.values(subjects).map((s) => s.id);
    for (let i = 0; i < 12; i += 1) {
      specs.push({
        title: `Study task ${i + 1}`,
        subjectId: subjectIds[i % subjectIds.length],
        taskDate: addDays(today, i % 2 === 0 ? 0 : -1),
        completed: true,
        completedAt: hoursAgo(24 + i * 2),
        priority: i % 3 === 0 ? "high" : "medium",
      });
    }
    specs.push(
      {
        title: "Review linear algebra problem set",
        subjectId: subjects.linear_algebra.id,
        taskDate: today,
        completed: false,
        priority: "high",
      },
      {
        title: "Watch biology lab prep video",
        subjectId: subjects.biology.id,
        taskDate: addDays(today, 1),
        completed: false,
        priority: "medium",
      },
    );
  } else if (profile === "secondary") {
    specs.push(
      {
        title: "Finish statistics homework",
        subjectId: subjects.statistics.id,
        taskDate: today,
        completed: false,
        priority: "high",
      },
      {
        title: "Read poetry anthology chapter",
        subjectId: subjects.english.id,
        taskDate: addDays(today, 1),
        completed: false,
        priority: "low",
      },
      {
        title: "Practice quiz questions",
        subjectId: subjects.statistics.id,
        taskDate: addDays(today, -1),
        completed: true,
        completedAt: hoursAgo(10),
        priority: "medium",
      },
    );
  } else {
    const firstSubject = Object.values(subjects)[0];
    if (!firstSubject) return;

    specs.push({
      title:
        profile === "locked"
          ? "Review chapter outline"
          : "Review chemistry flashcards",
      subjectId: firstSubject.id,
      taskDate: today,
      completed: false,
      priority: "medium",
    });
  }

  for (const spec of specs) {
    await Task.create({
      userId,
      subjectId: spec.subjectId,
      title: spec.title,
      taskDate: spec.taskDate,
      completed: spec.completed,
      completedAt: spec.completedAt ?? null,
      priority: spec.priority,
    });
  }
};

const seedPlannerSessions = async (sequelize, userId, subjects, profile) => {
  if (profile !== "primary" && profile !== "secondary") return;

  const { PlannerSession } = sequelize.models;
  const weekStartDate = getWeekStartDate(new Date());
  const subjectList = Object.values(subjects);

  const sessions =
    profile === "primary"
      ? [
          {
            title: "Linear Algebra — Problem Set",
            dayOfWeek: 1,
            startHour: 9,
            durationHours: 2,
            subjectId: subjects.linear_algebra.id,
            color: subjects.linear_algebra.color,
          },
          {
            title: "CS — Project Work",
            dayOfWeek: 3,
            startHour: 14,
            durationHours: 1.5,
            subjectId: subjects.computer_science.id,
            color: subjects.computer_science.color,
          },
          {
            title: "Biology — Reading",
            dayOfWeek: 5,
            startHour: 10,
            durationHours: 1,
            subjectId: subjects.biology.id,
            color: subjects.biology.color,
          },
        ]
      : [
          {
            title: "Statistics — Practice",
            dayOfWeek: 2,
            startHour: 11,
            durationHours: 1.5,
            subjectId: subjectList[0].id,
            color: subjectList[0].color,
          },
        ];

  for (const session of sessions) {
    await PlannerSession.create({
      userId,
      subjectId: session.subjectId,
      title: session.title,
      dayOfWeek: session.dayOfWeek,
      startHour: session.startHour,
      durationHours: session.durationHours,
      color: session.color,
      weekStartDate,
      source: "manual",
    });
  }
};

const seedFocusSessionsForUser = async (sequelize, userId, subjects, profile) => {
  const { FocusSession } = sequelize.models;
  const subjectList = Object.values(subjects);
  const pickSubject = (index) => subjectList[index % subjectList.length]?.id ?? null;

  const createCompleted = async (dateKey, hour, subjectIndex, workSeconds) => {
    const startedAt = atHourOnDate(dateKey, hour);
    const completedAt = new Date(startedAt.getTime() + workSeconds * 1000);

    await FocusSession.create({
      userId,
      subjectId: pickSubject(subjectIndex),
      status: FOCUS_SESSION_STATUS.COMPLETED,
      plannedWorkMinutes: Math.round(workSeconds / 60),
      plannedBreakMinutes: 5,
      actualWorkMinutes: Math.round(workSeconds / 60),
      workElapsedSeconds: workSeconds,
      startedAt,
      completedAt,
      currentPhase: "work",
      sessionNumber: 1,
    });
  };

  if (profile === "primary") {
    for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
      const dateKey = daysAgo(dayOffset);
      await createCompleted(dateKey, 9, dayOffset, QUALIFYING_WORK_SECONDS);
      await createCompleted(dateKey, 15, dayOffset + 1, 1200);
    }
    return;
  }

  if (profile === "secondary") {
    for (let dayOffset = 2; dayOffset >= 0; dayOffset -= 1) {
      const dateKey = daysAgo(dayOffset);
      await createCompleted(dateKey, 10, dayOffset, QUALIFYING_WORK_SECONDS);
    }
    await createCompleted(daysAgo(4), 16, 0, 1200);
    return;
  }

  if (profile === "flagged") {
    await createCompleted(daysAgo(1), 13, 0, QUALIFYING_WORK_SECONDS);
  }
};

const seedStudyGoals = async (sequelize, userId, profile) => {
  if (profile !== "primary") return;

  const { StudyGoal } = sequelize.models;

  await StudyGoal.bulkCreate([
    {
      userId,
      title: "Study 10 hours this week",
      targetValue: 10,
      currentValue: 0,
      unit: "hrs",
      period: "weekly",
      metricKey: "focus_seconds",
      active: true,
    },
    {
      userId,
      title: "Complete 5 tasks this week",
      targetValue: 5,
      currentValue: 0,
      unit: "tasks",
      period: "weekly",
      metricKey: "tasks_completed",
      active: true,
    },
    {
      userId,
      title: "Read 3 textbook chapters",
      targetValue: 3,
      currentValue: 1,
      unit: "chapters",
      period: "monthly",
      metricKey: "manual",
      active: true,
    },
  ]);
};

const seedQuizzes = async (sequelize, userId, subjects, profile) => {
  if (profile !== "primary" && profile !== "secondary") return;

  const { Quiz } = sequelize.models;
  const subject = Object.values(subjects)[0];

  await Quiz.create({
    userId,
    subjectId: subject.id,
    title:
      profile === "primary"
        ? "Linear Algebra — Quick Review"
        : "Statistics — Pop Quiz",
    questions: SAMPLE_QUIZ_QUESTIONS,
    source: "manual",
    description: "Demo quiz generated for showcase.",
  });
};

const seedViolations = async (sequelize, userId, contentItems) => {
  const { Violation } = sequelize.models;
  const spamNote = contentItems.find((item) =>
    item.title.includes("BUY CHEAP"),
  );

  await Violation.bulkCreate([
    {
      userId,
      contentItemId: spamNote?.id ?? null,
      contentTitle: spamNote?.title ?? "BUY CHEAP STUDY HACKS NOW!!!",
      contentType: "note",
      type: "spam",
      severity: "high",
      resolved: false,
      detectedAt: hoursAgo(2),
    },
    {
      userId,
      contentItemId: null,
      contentTitle: "offensive quiz topic attempt",
      contentType: "quiz",
      type: "inappropriate",
      severity: "medium",
      resolved: false,
      detectedAt: hoursAgo(26),
    },
  ]);
};

const seedNotifications = async (sequelize, userId, profile) => {
  const { Notification } = sequelize.models;

  const rows =
    profile === "primary"
      ? [
          {
            type: "streak",
            title: "7-Day Streak! 🔥",
            body: "You have studied 7 days in a row. Keep the momentum going!",
            isRead: false,
          },
          {
            type: "reminder",
            title: "Study reminder",
            body: "You planned a Linear Algebra session at 9:00 AM today.",
            isRead: false,
          },
          {
            type: "deadline",
            title: "Exam approaching",
            body: "Biology exam is in 30 days. Review your notes this week.",
            isRead: true,
          },
          {
            type: "session",
            title: "Focus session completed",
            body: "Great work — you finished a 25-minute focus block.",
            isRead: true,
          },
        ]
      : profile === "secondary"
        ? [
            {
              type: "reminder",
              title: "Task due today",
              body: "Finish statistics homework before tonight.",
              isRead: false,
            },
          ]
        : [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const createdAt = hoursAgo((rows.length - i) * 5);

    await Notification.create({
      userId,
      audience: "user",
      type: row.type,
      title: row.title,
      body: row.body,
      isRead: row.isRead,
      metadata: withSeedMetadata({ slot: `notification_${i}` }),
      createdAt,
      updatedAt: createdAt,
    });
  }
};

const unlockBadges = async (sequelize, userId, codes) => {
  const { Badge, UserBadge } = sequelize.models;
  const earnedAt = hoursAgo(48);

  for (const code of codes) {
    const badge = await Badge.findOne({ where: { code } });
    if (!badge) continue;

    await UserBadge.findOrCreate({
      where: { userId, badgeId: badge.id },
      defaults: { userId, badgeId: badge.id, earnedAt },
    });
  }
};

const seedUserBundle = async (sequelize, user, profile, userKey) => {
  const templates = SUBJECT_TEMPLATES[userKey] ?? [];

  await seedUserPreferences(sequelize, user.id);
  if (profile === "primary") {
    await seedBlockedSlots(sequelize, user.id);
  }

  const subjects = await seedSubjectsForUser(sequelize, user.id, templates);
  const contentItems = await seedContentForUser(
    sequelize,
    user.id,
    subjects,
    profile,
  );
  await seedTasksForUser(sequelize, user.id, subjects, profile);
  await seedPlannerSessions(sequelize, user.id, subjects, profile);
  await seedFocusSessionsForUser(sequelize, user.id, subjects, profile);
  await seedStudyGoals(sequelize, user.id, profile);
  await seedQuizzes(sequelize, user.id, subjects, profile);
  await seedNotifications(sequelize, user.id, profile);

  if (profile === "flagged") {
    await seedViolations(sequelize, user.id, contentItems);
  }

  await getStreak(user.id);

  if (profile === "primary") {
    await unlockBadges(sequelize, user.id, [
      "first_focus_session",
      "3_day_streak",
      "seven_day_streak",
      "ten_tasks_completed",
      "first_task_completed",
      "10_completed_sessions",
    ]);
  } else if (profile === "secondary") {
    await unlockBadges(sequelize, user.id, ["first_focus_session", "3_day_streak"]);
  }
};

export const runDemoSeed = async (sequelize, { fresh = true } = {}) => {
  const passwordHash = await hashDemoPassword(DEMO_PASSWORD);

  if (fresh) {
    await clearAllDemoUsersData(
      sequelize,
      DEMO_USERS.map((user) => user.email),
    );
  }

  const createdUsers = [];

  for (const spec of DEMO_USERS) {
    const user = await ensureDemoUser(sequelize, spec, passwordHash);
    createdUsers.push({ user, profile: spec.profile });

    if (fresh) {
      await seedUserBundle(sequelize, user, spec.profile, spec.key);
    } else {
      const { Subject } = sequelize.models;
      const existingSubjects = await Subject.count({ where: { userId: user.id } });
      if (existingSubjects === 0) {
        await seedUserBundle(sequelize, user, spec.profile, spec.key);
      }
    }
  }

  return {
    seedKey: DEMO_SEED_KEY,
    password: DEMO_PASSWORD,
    users: createdUsers.map(({ user, profile }) => ({
      email: user.email,
      fullName: user.fullName,
      profile,
      status: user.status,
    })),
  };
};

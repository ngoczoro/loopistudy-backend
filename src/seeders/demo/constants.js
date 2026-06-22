/** Stable marker on seeded rows that support JSON metadata. */
export const DEMO_SEED_KEY = "loopi_demo_v1";

export const DEMO_PASSWORD = "Demo1234!";

/** Demo accounts — safe to reset with `npm run db:seed:demo -- --fresh`. */
export const DEMO_USERS = [
  {
    key: "alex",
    email: "alex.demo@loopi.com",
    fullName: "Alex Morgan",
    role: "student",
    status: "ACTIVE",
    profile: "primary",
  },
  {
    key: "jamie",
    email: "jamie.demo@loopi.com",
    fullName: "Jamie Lee",
    role: "student",
    status: "ACTIVE",
    profile: "secondary",
  },
  {
    key: "riley",
    email: "riley.demo@loopi.com",
    fullName: "Riley Chen",
    role: "student",
    status: "ACTIVE",
    profile: "flagged",
  },
  {
    key: "sam",
    email: "sam.demo@loopi.com",
    fullName: "Sam Rivera",
    role: "student",
    status: "LOCKED",
    lockedReason: "Repeated policy violations during demo period",
    profile: "locked",
  },
];

export const EXTRA_BADGE_ROWS = [
  {
    code: "ten_tasks_completed",
    name: "10 Tasks Done",
    description: "Complete 10 tasks in your planner",
  },
];

export const SUBJECT_TEMPLATES = {
  alex: [
    {
      key: "linear_algebra",
      name: "Linear Algebra",
      credits: 3,
      difficulty: "Hard",
      priority: "high",
      color: "340 82% 59%",
      requiredHoursPerWeek: 6,
      progress: 42,
      examDateOffsetDays: 45,
    },
    {
      key: "computer_science",
      name: "Computer Science",
      credits: 4,
      difficulty: "Medium",
      priority: "medium",
      color: "210 80% 60%",
      requiredHoursPerWeek: 5,
      progress: 58,
      examDateOffsetDays: 60,
    },
    {
      key: "biology",
      name: "Biology",
      credits: 3,
      difficulty: "Easy",
      priority: "low",
      color: "142 45% 55%",
      requiredHoursPerWeek: 4,
      progress: 25,
      examDateOffsetDays: 30,
    },
  ],
  jamie: [
    {
      key: "statistics",
      name: "Statistics",
      credits: 3,
      difficulty: "Medium",
      priority: "medium",
      color: "35 90% 60%",
      requiredHoursPerWeek: 4,
      progress: 35,
      examDateOffsetDays: 40,
    },
    {
      key: "english",
      name: "English Literature",
      credits: 2,
      difficulty: "Easy",
      priority: "low",
      color: "280 60% 65%",
      requiredHoursPerWeek: 3,
      progress: 20,
      examDateOffsetDays: 55,
    },
  ],
  riley: [
    {
      key: "chemistry",
      name: "Chemistry",
      credits: 3,
      difficulty: "Hard",
      priority: "high",
      color: "12 80% 58%",
      requiredHoursPerWeek: 5,
      progress: 15,
      examDateOffsetDays: 25,
    },
  ],
  sam: [
    {
      key: "history",
      name: "World History",
      credits: 3,
      difficulty: "Medium",
      priority: "medium",
      color: "45 70% 55%",
      requiredHoursPerWeek: 3,
      progress: 10,
      examDateOffsetDays: 70,
    },
  ],
};

import { ROLES, USER_STATUS } from "../../config/constants.js";

export const normalizeRole = (role) => {
  if (!role) return ROLES.STUDENT;
  const value = String(role).toLowerCase();
  if (value === ROLES.ADMIN) return ROLES.ADMIN;
  return ROLES.STUDENT;
};

export const normalizeStatus = (status) => {
  if (!status) return USER_STATUS.PENDING;

  const upper = String(status).toUpperCase();
  if (Object.values(USER_STATUS).includes(upper)) {
    return upper;
  }

  const legacyMap = {
    active: USER_STATUS.ACTIVE,
    pending: USER_STATUS.PENDING,
    banned: USER_STATUS.BANNED,
    locked: USER_STATUS.LOCKED,
    inactive: USER_STATUS.LOCKED,
    warned: USER_STATUS.ACTIVE,
  };

  return legacyMap[String(status).toLowerCase()] || USER_STATUS.PENDING;
};

export const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: normalizeRole(user.role),
  status: normalizeStatus(user.status),
  avatarUrl: user.avatarUrl || null,
});

export const serializeResendOtp = (email) => ({
  email,
  message: "New OTP sent. Expires in 5 minutes.",
});

export const serializeLogin = (user, accessToken, refreshToken) => ({
  user: serializeUser(user),
  accessToken,
  refreshToken,
});

export const serializeRefreshTokens = (accessToken, refreshToken) => ({
  accessToken,
  refreshToken,
});

export const serializeUserPreferences = (prefs) => ({
  pomodoroDuration: prefs?.pomodoroDurationMin ?? 25,
  breakDuration: prefs?.breakDurationMin ?? 5,
  maxStudyHoursPerDay: Number(prefs?.maxStudyHoursPerDay ?? 4),
  notifications: {
    taskReminders: prefs?.notifyTaskReminders ?? true,
    sessionReminders: prefs?.notifySessionReminders ?? true,
    deadlineAlerts: prefs?.notifyDeadlineAlerts ?? true,
  },
});

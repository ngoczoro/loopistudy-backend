import {
  serializeUser,
  serializeUserPreferences,
} from "../auth/auth.serializer.js";
import { dayNumberToLabel } from "./user.constants.js";

export { serializeUser, serializeUserPreferences };

export const serializeBlockedSlot = (slot) => ({
  day: dayNumberToLabel(slot.dayOfWeek),
  hour: slot.hour,
});

export const serializeBlockedSlotList = (slots) =>
  slots.map(serializeBlockedSlot);

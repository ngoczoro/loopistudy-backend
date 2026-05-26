import {
  buildAccountLockEmail,
  buildAccountUnlockEmail,
} from "./accountNotification.templates.js";
import { sendMailSafe } from "./emailSender.js";

const fromAddress = () =>
  `"Loopi Study" <${process.env.EMAIL_USER || "noreply@loopi-study.com"}>`;

export const sendAccountLockNotification = async ({
  email,
  userName,
  reason,
}) => {
  if (!email) {
    console.warn("[email] Skipped lock notification — missing recipient email");
    return { ok: false, error: "missing_email" };
  }

  const template = buildAccountLockEmail({ userName, reason });

  return sendMailSafe({
    from: fromAddress(),
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

export const sendAccountUnlockNotification = async ({ email, userName }) => {
  if (!email) {
    console.warn("[email] Skipped unlock notification — missing recipient email");
    return { ok: false, error: "missing_email" };
  }

  const template = buildAccountUnlockEmail({ userName });

  return sendMailSafe({
    from: fromAddress(),
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

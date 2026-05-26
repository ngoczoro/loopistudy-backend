import { getEmailTransporter } from "../../../utils/email.js";

/**
 * Send email without throwing — account status changes must not depend on SMTP.
 */
export const sendMailSafe = async (mailOptions) => {
  try {
    const transporter = getEmailTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log("✓ Email sent:", info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    console.warn("✗ Email send failed (non-blocking):", error.message);
    return { ok: false, error: error.message };
  }
};

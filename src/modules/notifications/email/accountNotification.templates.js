/** Escape user-provided text for safe HTML email bodies. */
export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const emailLayout = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { padding: 32px; color: #333; font-size: 16px; line-height: 1.6; }
      .reason-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px; }
      .footer { background: #f8f9fa; padding: 16px; text-align: center; color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>Loopi Study</h1><p>${escapeHtml(title)}</p></div>
      <div class="content">${bodyHtml}</div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Loopi Study. All rights reserved.</p>
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  </body>
</html>
`;

export const buildAccountLockEmail = ({ userName, reason }) => {
  const safeName = escapeHtml(userName || "User");
  const safeReason = escapeHtml(reason);

  const html = emailLayout(
    "Account Temporarily Blocked",
    `
      <p>Hello ${safeName},</p>
      <p>Your Loopi Study account has been temporarily blocked by the administration team due to a violation of our platform policies.</p>
      <div class="reason-box">
        <p><strong>Reason:</strong></p>
        <p>${safeReason}</p>
      </div>
      <p>If you believe this action was incorrect, please contact support or the administration team.</p>
      <p>Regards,<br><strong>Loopi Study Administration</strong></p>
    `,
  );

  const text = `Hello ${userName || "User"},

Your Loopi Study account has been temporarily blocked by the administration team due to a violation of our platform policies.

Reason:
${reason}

If you believe this action was incorrect, please contact support or the administration team.

Regards,
Loopi Study Administration`;

  return {
    subject: "Your Loopi Study Account Has Been Temporarily Blocked",
    html,
    text,
  };
};

export const buildAccountUnlockEmail = ({ userName }) => {
  const safeName = escapeHtml(userName || "User");

  const html = emailLayout(
    "Account Reactivated",
    `
      <p>Hello ${safeName},</p>
      <p>Your Loopi Study account has been reviewed and reactivated by the administration team.</p>
      <p>You may now access the platform normally again.</p>
      <p>Please continue following the platform community guidelines to avoid future restrictions.</p>
      <p>Regards,<br><strong>Loopi Study Administration</strong></p>
    `,
  );

  const text = `Hello ${userName || "User"},

Your Loopi Study account has been reviewed and reactivated by the administration team.

You may now access the platform normally again.

Please continue following the platform community guidelines to avoid future restrictions.

Regards,
Loopi Study Administration`;

  return {
    subject: "Your Loopi Study Account Has Been Reactivated",
    html,
    text,
  };
};

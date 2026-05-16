import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Email Transporter Configuration
 * Using Gmail SMTP with App Password
 */
let transporter;

export const initializeEmailTransporter = () => {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
};

export const getEmailTransporter = () => {
  if (!transporter) {
    return initializeEmailTransporter();
  }
  return transporter;
};

/**
 * Send OTP Email
 * @param {string} recipientEmail - Email to send OTP to
 * @param {string} otp - 6-digit OTP
 * @returns {Promise}
 */
export const sendOtpEmail = async (recipientEmail, otp) => {
  try {
    const emailTransporter = getEmailTransporter();

    const mailOptions = {
      from: `"Loopi Study" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: "Your Loopi Study Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
              }
              .content {
                padding: 40px;
              }
              .content p {
                color: #333;
                font-size: 16px;
                line-height: 1.6;
                margin: 15px 0;
              }
              .otp-box {
                background-color: #f8f9fa;
                border: 2px solid #667eea;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
              }
              .otp-code {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                letter-spacing: 2px;
                font-family: 'Courier New', monospace;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .warning p {
                margin: 5px 0;
                color: #856404;
              }
              .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎓 Loopi Study</h1>
                <p>Email Verification</p>
              </div>
              
              <div class="content">
                <p>Hello,</p>
                
                <p>Thank you for signing up for Loopi Study! To complete your registration, please verify your email address using the code below:</p>
                
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                
                <p><strong>This code will expire in 5 minutes.</strong></p>
                
                <div class="warning">
                  <p>⚠️ <strong>Security Notice:</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Never share this code with anyone</li>
                    <li>Loopi Study staff will never ask for this code</li>
                    <li>If you didn't request this code, you can ignore this email</li>
                  </ul>
                </div>
                
                <p>Questions? Contact our support team at support@loopi-study.com</p>
                
                <p>Best regards,<br><strong>The Loopi Study Team</strong></p>
              </div>
              
              <div class="footer">
                <p>&copy; 2026 Loopi Study. All rights reserved.</p>
                <p>This is an automated email. Please do not reply to this message.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Your Loopi Study verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log("✓ OTP email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("✗ Failed to send OTP email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Verify Email Transporter Connection
 */
export const verifyEmailConnection = async () => {
  try {
    const emailTransporter = getEmailTransporter();
    await emailTransporter.verify();
    console.log("✓ Email transporter ready");
    return true;
  } catch (error) {
    console.error("✗ Email transporter error:", error);
    return false;
  }
};

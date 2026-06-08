const nodemailer = require('nodemailer');

const sendResetEmail = async (email, resetUrl) => {
  console.log('--- PASSWORD RESET EMAIL SIMULATOR ---');
  console.log(`To: ${email}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log('--------------------------------------');

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort == 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"ATSify Support" <${smtpUser}>`,
        to: email,
        subject: 'ATSify Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; text-align: center;">ATSify Password Reset</h2>
            <p>Hello,</p>
            <p>You requested a password reset for your ATSify account. Please click the button below to reset your password. This link is valid for 1 hour.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p>If the button doesn't work, copy and paste the link below into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">${resetUrl}</p>
            <p>If you did not request a password reset, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; text-align: center;">ATSify Team &copy; 2026</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Real email successfully sent to ${email}`);
      return { success: true, method: 'smtp' };
    } catch (error) {
      console.error('Failed to send email via SMTP, falling back to log:', error);
      return { success: true, method: 'fallback', error: error.message };
    }
  } else {
    console.log('SMTP configuration missing. Reset link printed to terminal for local testing.');
    return { success: true, method: 'terminal' };
  }
};

module.exports = {
  sendResetEmail,
};

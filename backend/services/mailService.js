import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * StudySniper Email Engine
 * Optimized for high deliverability, SaaS-standard aesthetics, and Gmail inbox placement.
 */
export const mailService = {
  
  async sendOTP(email, otp) {
    const mailOptions = {
      from: `"StudySniper Support" <${process.env.EMAIL_USER}>`,
      to: email,
      replyTo: process.env.EMAIL_USER,
      subject: `Verify your email: ${otp}`,
      text: `Your StudySniper verification code is: ${otp}. This code expires in 10 minutes.`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: auto; padding: 40px; background-color: #ffffff; color: #111111; border: 1px solid #e5e7eb; border-radius: 16px;">
          <div style="margin-bottom: 30px; text-align: left;">
            <p style="font-size: 18px; font-weight: 800; color: #000; margin: 0; letter-spacing: -0.5px;">StudySniper</p>
          </div>
          
          <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #000;">Verify your email address</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
            To complete your registration and activate your intelligent study engine, please use the following verification code.
          </p>
          
          <div style="background: #f9fafb; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 30px; border: 1px solid #f3f4f6;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #000; font-family: monospace;">${otp}</span>
          </div>
          
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 40px; line-height: 1.5;">
            This code will expire in 10 minutes. If you did not request this email, you can safely ignore it.
          </p>
          
          <div style="border-top: 1px solid #f3f4f6; padding-top: 24px; text-align: left;">
            <p style="font-size: 11px; color: #9ca3af; margin: 0;">&copy; 2026 StudySniper AI. All rights reserved.</p>
            <p style="font-size: 11px; color: #d1d5db; margin-top: 4px;">Intelligence for Scholars</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      throw new Error('Failed to send verification email');
    }
  },

  async sendPremiumResetLink(email, resetLink) {
    const mailOptions = {
      from: `"StudySniper Support" <${process.env.EMAIL_USER}>`,
      to: email,
      replyTo: process.env.EMAIL_USER,
      subject: 'Reset your password - StudySniper',
      text: `Follow this link to reset your password: ${resetLink}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: auto; padding: 40px; background-color: #ffffff; color: #111111; border: 1px solid #e5e7eb; border-radius: 16px;">
          <div style="margin-bottom: 30px; text-align: left;">
            <p style="font-size: 18px; font-weight: 800; color: #000; margin: 0; letter-spacing: -0.5px;">StudySniper</p>
          </div>

          <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #000;">Password reset request</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>

          <a href="${resetLink}" style="display: block; background: #000000; color: #ffffff; text-align: center; padding: 14px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">Reset password</a>

          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; line-height: 1.5;">
            If you didn't mean to reset your password, you can ignore this email. Your current password will not change.
          </p>

          <div style="border-top: 1px solid #f3f4f6; padding-top: 24px; margin-top: 40px; text-align: left;">
            <p style="font-size: 11px; color: #9ca3af; margin: 0;">&copy; 2026 StudySniper AI. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      throw new Error('Failed to send restoration link');
    }
  },

  async sendDailyBriefing(email, tasks) {
    const taskList = tasks.map(t => `
      <div style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
        <p style="margin: 0; font-size: 13px; font-weight: 500; color: #374151;">${t}</p>
      </div>
    `).join('');

    const mailOptions = {
      from: `"StudySniper Briefing" <${process.env.EMAIL_USER}>`,
      to: email,
      replyTo: process.env.EMAIL_USER,
      subject: 'Your daily study briefing is ready',
      text: `Your tasks for today: ${tasks.join(', ')}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: auto; padding: 40px; background-color: #ffffff; color: #111111; border: 1px solid #e5e7eb; border-radius: 16px;">
          <div style="margin-bottom: 30px; text-align: left;">
            <p style="font-size: 18px; font-weight: 800; color: #000; margin: 0; letter-spacing: -0.5px;">StudySniper</p>
          </div>
          
          <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #000;">Today's Objectives</h1>
          
          <div style="margin-bottom: 30px;">
            ${taskList}
          </div>

          <div style="border-top: 1px solid #f3f4f6; padding-top: 24px; margin-top: 30px;">
            <p style="font-size: 11px; color: #9ca3af; margin: 0;">&copy; 2026 StudySniper AI. Intelligence for Scholars.</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('❌ Briefing Failed:', error.message);
    }
  }
};

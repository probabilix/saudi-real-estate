import { Resend } from 'resend';
import { UserRole } from '@saudi-re/shared';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');
const SYSTEM_EMAIL = 'onboarding@resend.dev'; // Default Resend test email. Replace with verified domain in prod.

export class EmailService {
  /**
   * Send Welcome Email to new users
   */
  static async sendWelcomeEmail(email: string, name: string, role: UserRole) {
    try {
      await resend.emails.send({
        from: `Saudi Real Estate Project <${SYSTEM_EMAIL}>`,
        to: email,
        subject: 'Welcome to the Saudi Real Estate Platform!',
        html: `
          <h1>Welcome, ${name}!</h1>
          <p>We are excited to have you as a <strong>${role}</strong> on our platform.</p>
          ${role === 'BUYER' 
            ? '<p>Start exploring luxury properties across the Kingdom now.</p>'
            : '<p>Our admin team will review your registration details. We will notify you once your listing permissions are active.</p>'}
          <br/>
          <p>Best Regards,<br/>Development Team</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  /**
   * Notify Admin about a new Broker/Firm registration
   */
  static async sendAdminVerificationAlert(userData: { id: string; name: string; role: string; email: string; regaLicence?: string }) {
    try {
      await resend.emails.send({
        from: `System Alerts <${SYSTEM_EMAIL}>`,
        to: process.env.ADMIN_EMAIL || 'admin@saudiproject.com',
        subject: `New Verification Request: ${userData.name}`,
        html: `
          <h2>New Registration Alert</h2>
          <p><strong>Name:</strong> ${userData.name}</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Role:</strong> ${userData.role}</p>
          <p><strong>REGA License:</strong> ${userData.regaLicence || 'N/A'}</p>
          <hr/>
          <p>Please log in to the admin console to verify and approve this user.</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send admin alert:', error);
    }
  }

  /**
   * Send Approval Notification to the user
   */
  static async sendApprovalEmail(email: string, name: string) {
    try {
      await resend.emails.send({
        from: `Saudi Real Estate Support <${SYSTEM_EMAIL}>`,
        to: email,
        subject: 'Account Approved - Start Listing Properties!',
        html: `
          <h1>Great news, ${name}!</h1>
          <p>Your account has been successfully verified. You now have full permissions to post property listings and manage your profile.</p>
          <a href="${process.env.FRONTEND_URL}/login">Login to your dashboard</a>
          <br/><br/>
          <p>Best Regards,<br/>Verification Team</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }
  }

  /**
   * Send Password Reset Link
   */
  static async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    try {
      await resend.emails.send({
        from: `Security Team <${SYSTEM_EMAIL}>`,
        to: email,
        subject: 'Reset your password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Hi ${name}, click the link below to securely reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send reset email:', error);
    }
  }
}

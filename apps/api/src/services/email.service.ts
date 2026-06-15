import { Resend } from 'resend';
import { UserRole } from '@saudi-re/shared';
import { SystemService } from './system.service';

const DEFAULT_SYSTEM_EMAIL = 'onboarding@resend.dev'; // Default Resend test email. Replace with verified domain in prod.

async function getResendClient() {
  const apiKey = await SystemService.getSetting('resend_api_key', process.env.RESEND_API_KEY || 're_placeholder_key');
  return new Resend(apiKey);
}

export class EmailService {
  /**
   * Send Welcome Email to new users
   */
  static async sendWelcomeEmail(email: string, name: string, role: UserRole) {
    try {
      const resend = await getResendClient();
      await resend.emails.send({
        from: `Saudi Real Estate Project <${DEFAULT_SYSTEM_EMAIL}>`,
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
      const resend = await getResendClient();
      await resend.emails.send({
        from: `System Alerts <${DEFAULT_SYSTEM_EMAIL}>`,
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
      const resend = await getResendClient();
      await resend.emails.send({
        from: `Saudi Real Estate Support <${DEFAULT_SYSTEM_EMAIL}>`,
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
   * Send Rejection Notification to the user
   */
  static async sendRejectionEmail(email: string, name: string) {
    try {
      const resend = await getResendClient();
      await resend.emails.send({
        from: `Saudi Real Estate Support <${DEFAULT_SYSTEM_EMAIL}>`,
        to: email,
        subject: 'Broker Application Status Update',
        html: `
          <h1>Hello ${name},</h1>
          <p>Thank you for submitting your application to become a certified Broker on our platform.</p>
          <p>After reviewing your REGA Falcon license credentials, we regret to inform you that your application has been rejected at this time.</p>
          <p>Please note that your user account remains active. You can still log in to search, view, and save properties as a buyer. If you wish to apply again, please update your profile details and resubmit the form with a valid license.</p>
          <br/>
          <p>Best Regards,<br/>Verification Team</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }
  }

  /**
   * Send CRM Access Approval Notification to the user
   */
  static async sendCrmAccessApprovalEmail(email: string, name: string) {
    try {
      const resend = await getResendClient();
      const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || 'http://localhost:3003';
      await resend.emails.send({
        from: `Saudi Real Estate Support <${DEFAULT_SYSTEM_EMAIL}>`,
        to: email,
        subject: 'CRM Access Approved - Start Managing Properties & Leads!',
        html: `
          <h1>Great news, ${name}!</h1>
          <p>Your request has been manually reviewed and approved. You have been granted full access to the <strong>Saudi RE CRM Workspace</strong>.</p>
          <p>You can now log in using your normal website credentials to manage your inventory, buy credit packages, feature listings, and track qualified leads.</p>
          <p style="margin: 20px 0;">
            <a href="${crmUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Go to CRM Workspace
            </a>
          </p>
          <p>If you have any questions, feel free to contact our support team.</p>
          <br/>
          <p>Best Regards,<br/>Saudi RE Team</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send CRM approval email:', error);
    }
  }

  /**
   * Send Password Reset Link
   */
  static async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    try {
      const resend = await getResendClient();
      await resend.emails.send({
        from: `Security Team <${DEFAULT_SYSTEM_EMAIL}>`,
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

  /**
   * Send Password Reset OTP
   */
  static async sendPasswordResetOTP(email: string, name: string, otp: string) {
    try {
      const resend = await getResendClient();
      await resend.emails.send({
        from: `Security Team <${DEFAULT_SYSTEM_EMAIL}>`,
        to: email,
        subject: 'Your Password Recovery Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px;">
            <h2 style="color: #0d9488; margin-top: 0;">Password Recovery</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Use the secure 6-digit recovery code below to proceed. This code expires in 10 minutes.</p>
            <div style="background-color: #f3f4f6; padding: 15px 30px; font-size: 28px; font-weight: bold; letter-spacing: 5px; text-align: center; color: #1f2937; margin: 20px 0; border-radius: 8px;">
              ${otp}
            </div>
            <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; border-t: 1px solid #f0f0f0; padding-top: 10px;">Security Team</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send reset OTP email:', error);
      throw error;
    }
  }
}

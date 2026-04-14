import { UserRole } from '@saudi-re/shared';
export declare class EmailService {
    /**
     * Send Welcome Email to new users
     */
    static sendWelcomeEmail(email: string, name: string, role: UserRole): Promise<void>;
    /**
     * Notify Admin about a new Broker/Firm registration
     */
    static sendAdminVerificationAlert(userData: {
        id: string;
        name: string;
        role: string;
        email: string;
        regaLicence?: string;
    }): Promise<void>;
    /**
     * Send Approval Notification to the user
     */
    static sendApprovalEmail(email: string, name: string): Promise<void>;
    /**
     * Send Password Reset Link
     */
    static sendPasswordResetEmail(email: string, name: string, token: string): Promise<void>;
}
//# sourceMappingURL=email.service.d.ts.map
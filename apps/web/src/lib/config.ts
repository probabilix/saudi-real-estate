/**
 * Global application configuration for Saudi Real Estate platform.
 * 
 * MANAGED_MODE: 
 * When true, the platform shifts from a public marketplace to a managed portal.
 * Public users cannot list properties, and features like packages/dashboard are hidden.
 */
export const MANAGED_MODE = true;

/**
 * Whitelisted users who can still access listing and management features
 * even when MANAGED_MODE is enabled.
 * 
 * These represent the "Firm" (Admin) and the "3 Brokers" under the firm.
 */
export const WHITELISTED_USERS = [
  'admin@saudi-re.com', // The main Firm/Admin account
  'broker1@saudi-re.com',
  'broker2@saudi-re.com',
  'broker3@saudi-re.com',
];

/**
 * Helper to check if a user has management access
 */
export const hasManagementAccess = (user: any) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return WHITELISTED_USERS.includes(user.email);
};

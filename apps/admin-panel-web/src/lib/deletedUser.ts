/**
 * Helper functions for handling soft-deleted users in the UI.
 *
 * Soft-deleted users have their email replaced with:
 * deleted_<timestamp>_<uuid>@deleted.local
 */

/**
 * Check if a user is soft-deleted based on their email pattern.
 * @param email - The user's email address
 * @returns true if the email indicates a deleted user
 */
export function isDeletedUser(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.startsWith('deleted_') || email.endsWith('@deleted.local');
}

/**
 * Format email for display - shows "Deleted User" for soft-deleted users.
 * @param email - The user's email address
 * @returns The display text for the email field
 */
export function formatEmailDisplay(email: string | undefined | null): string {
  if (!email) return 'N/A';
  if (isDeletedUser(email)) return 'Deleted User';
  return email;
}

/**
 * Get the effective active status for a user.
 * Deleted users should always show as Inactive.
 * @param email - The user's email address
 * @param isActive - The user's isActive flag from the API
 * @returns The effective active status
 */
export function getEffectiveActiveStatus(
  email: string | undefined | null,
  isActive: boolean,
): boolean {
  if (isDeletedUser(email)) return false;
  return isActive;
}

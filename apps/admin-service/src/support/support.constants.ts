/**
 * Canonical support ticket categories.
 *
 * `category` is stored as a plain varchar (not a DB enum) so new categories can
 * be added without a schema migration. This list is the contract shared with:
 *   - job-board-web       (SUPPORT_CATEGORIES in src/app/config/data.ts)
 *   - job-board-admin-panel (filter dropdown + analytics chart labels)
 *
 * The `value` strings are keyed on by the ticket filter and the analytics
 * GROUP BY — never rename an existing value without migrating existing rows.
 */
export const SUPPORT_CATEGORY_VALUES = ['bug', 'technical', 'account', 'payment', 'other'] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORY_VALUES)[number];

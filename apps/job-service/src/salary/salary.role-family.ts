/**
 * Mapping an unfamiliar job title onto a role family we can price.
 *
 * With roughly 53 distinct titles across 57 active jobs, an exact title match
 * almost never finds anything. A title like "ABC Technologies Developer -
 * Urgent" has no twin, but it is plainly a backend developer role, and there
 * are backend developer postings we can price.
 *
 * Ported from `jobboard-ai-engine/app/salary/role_family.py` **without** its
 * LLM fallback. In the Python service a model was allowed to pick a family
 * from the fixed list when the static table missed. Here a miss simply skips
 * that rung of the ladder: guessing a family is the one place a wrong answer
 * turns into a wrong number in front of an employer, and the static table
 * already answers the overwhelming majority of real titles for nothing.
 */

/**
 * The families we are willing to reason about. Kept deliberately broad: a
 * family only has to be specific enough that its postings price similarly.
 */
export const ROLE_FAMILIES: readonly string[] = [
  'full stack developer',
  'frontend developer',
  'backend developer',
  'mobile developer',
  'devops engineer',
  'data engineer',
  'data analyst',
  'machine learning engineer',
  'qa engineer',
  'ui ux designer',
  'graphic designer',
  'product manager',
  'project manager',
  'business analyst',
  'system administrator',
  'database administrator',
  'cyber security engineer',
  'technical support engineer',
  'hr recruiter',
  'sales executive',
  'marketing executive',
  'content writer',
  'accountant',
  'operations executive',
  'customer support executive',
  'teacher',
  'nurse',
  'driver',
  'delivery executive',
  'field technician',
  'electrician',
  'plumber',
  'cook',
  'security guard',
  'warehouse associate',
  // Added after a live "Word Press Engineer" posting found nothing to price
  // itself against. CMS and storefront work is a large share of what agencies
  // on this portal actually post, and none of it had a family.
  'cms developer',
  'receptionist',
  'office assistant',
  'erp consultant',
];

/**
 * Phrase -> family. Longest phrases are matched first so "react native" lands
 * on mobile rather than frontend, and "full stack" beats "stack".
 */
const STATIC_MAP: Record<string, string> = {
  // Engineering
  'full stack': 'full stack developer',
  fullstack: 'full stack developer',
  'full-stack': 'full stack developer',
  mern: 'full stack developer',
  'mean stack': 'full stack developer',
  'react native': 'mobile developer',
  android: 'mobile developer',
  'ios developer': 'mobile developer',
  flutter: 'mobile developer',
  'mobile app': 'mobile developer',
  frontend: 'frontend developer',
  'front end': 'frontend developer',
  'front-end': 'frontend developer',
  'ui developer': 'frontend developer',
  'react developer': 'frontend developer',
  angular: 'frontend developer',
  vue: 'frontend developer',
  backend: 'backend developer',
  'back end': 'backend developer',
  'back-end': 'backend developer',
  'node developer': 'backend developer',
  'nodejs developer': 'backend developer',
  'java developer': 'backend developer',
  'python developer': 'backend developer',
  'php developer': 'backend developer',
  laravel: 'backend developer',
  // CMS and storefront platforms. "word press" as two words is how it arrives
  // from the job form more often than not.
  'word press': 'cms developer',
  wordpress: 'cms developer',
  'wp developer': 'cms developer',
  shopify: 'cms developer',
  magento: 'cms developer',
  drupal: 'cms developer',
  joomla: 'cms developer',
  webflow: 'cms developer',
  wix: 'cms developer',
  woocommerce: 'cms developer',
  receptionist: 'receptionist',
  'front desk': 'receptionist',
  'office assistant': 'office assistant',
  'office boy': 'office assistant',
  'data entry': 'office assistant',
  sap: 'erp consultant',
  'erp consultant': 'erp consultant',
  'oracle erp': 'erp consultant',
  netsuite: 'erp consultant',
  django: 'backend developer',
  'dot net': 'backend developer',
  '.net': 'backend developer',
  golang: 'backend developer',
  'ruby on rails': 'backend developer',
  'api developer': 'backend developer',
  'software engineer': 'backend developer',
  'software developer': 'backend developer',
  'web developer': 'full stack developer',
  // Platform and data
  devops: 'devops engineer',
  'site reliability': 'devops engineer',
  sre: 'devops engineer',
  'cloud engineer': 'devops engineer',
  kubernetes: 'devops engineer',
  'aws engineer': 'devops engineer',
  'platform engineer': 'devops engineer',
  'data engineer': 'data engineer',
  etl: 'data engineer',
  'big data': 'data engineer',
  'data scientist': 'machine learning engineer',
  'machine learning': 'machine learning engineer',
  'ml engineer': 'machine learning engineer',
  'ai engineer': 'machine learning engineer',
  'deep learning': 'machine learning engineer',
  'data analyst': 'data analyst',
  'business intelligence': 'data analyst',
  'power bi': 'data analyst',
  tableau: 'data analyst',
  // Quality, security, ops
  qa: 'qa engineer',
  'quality assurance': 'qa engineer',
  'test engineer': 'qa engineer',
  tester: 'qa engineer',
  sdet: 'qa engineer',
  'automation test': 'qa engineer',
  'cyber security': 'cyber security engineer',
  cybersecurity: 'cyber security engineer',
  'information security': 'cyber security engineer',
  'penetration test': 'cyber security engineer',
  'system administrator': 'system administrator',
  sysadmin: 'system administrator',
  'network engineer': 'system administrator',
  'database administrator': 'database administrator',
  dba: 'database administrator',
  // Design and product
  'ui ux': 'ui ux designer',
  'ui/ux': 'ui ux designer',
  'ux designer': 'ui ux designer',
  'product designer': 'ui ux designer',
  'graphic designer': 'graphic designer',
  'visual designer': 'graphic designer',
  'video editor': 'graphic designer',
  'product manager': 'product manager',
  'product owner': 'product manager',
  'project manager': 'project manager',
  'scrum master': 'project manager',
  'delivery manager': 'project manager',
  'business analyst': 'business analyst',
  // Business functions
  recruiter: 'hr recruiter',
  'talent acquisition': 'hr recruiter',
  'human resource': 'hr recruiter',
  'hr executive': 'hr recruiter',
  'hr manager': 'hr recruiter',
  sales: 'sales executive',
  'business development': 'sales executive',
  'field sales': 'sales executive',
  'digital marketing': 'marketing executive',
  seo: 'marketing executive',
  'social media': 'marketing executive',
  marketing: 'marketing executive',
  'content writer': 'content writer',
  copywriter: 'content writer',
  'technical writer': 'content writer',
  accountant: 'accountant',
  'accounts executive': 'accountant',
  'finance executive': 'accountant',
  bookkeep: 'accountant',
  audit: 'accountant',
  operations: 'operations executive',
  'admin executive': 'operations executive',
  'back office': 'operations executive',
  'customer support': 'customer support executive',
  'customer service': 'customer support executive',
  'customer care': 'customer support executive',
  'call center': 'customer support executive',
  'call centre': 'customer support executive',
  telecaller: 'customer support executive',
  bpo: 'customer support executive',
  'technical support': 'technical support engineer',
  'help desk': 'technical support engineer',
  'service desk': 'technical support engineer',
  // Non-desk roles — the blue-collar side of the board
  teacher: 'teacher',
  tutor: 'teacher',
  faculty: 'teacher',
  lecturer: 'teacher',
  nurse: 'nurse',
  'ward boy': 'nurse',
  caretaker: 'nurse',
  driver: 'driver',
  chauffeur: 'driver',
  delivery: 'delivery executive',
  rider: 'delivery executive',
  courier: 'delivery executive',
  electrician: 'electrician',
  plumber: 'plumber',
  carpenter: 'field technician',
  technician: 'field technician',
  mechanic: 'field technician',
  fitter: 'field technician',
  welder: 'field technician',
  cook: 'cook',
  chef: 'cook',
  kitchen: 'cook',
  'security guard': 'security guard',
  watchman: 'security guard',
  bouncer: 'security guard',
  warehouse: 'warehouse associate',
  packer: 'warehouse associate',
  loader: 'warehouse associate',
  'store keeper': 'warehouse associate',
};

/**
 * Longest first, so more specific phrases win. Ties are broken by insertion
 * order, matching Python's stable `sorted(..., key=len, reverse=True)`.
 */
const ORDERED_PHRASES: string[] = Object.keys(STATIC_MAP)
  .map((phrase, index) => ({ phrase, index }))
  .sort((a, b) => b.phrase.length - a.phrase.length || a.index - b.index)
  .map((entry) => entry.phrase);

/** Family for a title from the static table, or null if nothing matches. */
export function staticRoleFamily(title?: string | null): string | null {
  const text = String(title ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
  if (!text) return null;

  for (const phrase of ORDERED_PHRASES) {
    if (text.includes(phrase)) return STATIC_MAP[phrase];
  }
  return null;
}

/**
 * Family for a title, or null.
 *
 * Deliberately the whole of the resolution: there is no model fallback here.
 * A title the table does not know skips the role-family rung entirely.
 */
export function resolveRoleFamily(title?: string | null): string | null {
  return staticRoleFamily(title);
}

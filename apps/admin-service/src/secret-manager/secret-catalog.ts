/**
 * Allowlist of Tier-2 credentials manageable from the Secret Manager tab.
 *
 * HARD BOUNDARY: only keys in this catalog can ever be written. Tier-1 infra/bootstrap secrets
 * (DATABASE_URL, REDIS_URL, JWT_SECRET, AWS_*, COGNITO_*, S3_BUCKET, SQS_*, *_SERVICE_URL,
 * CORS_ORIGINS, SECRETS_MASTER_KEY, ...) are intentionally absent — they stay in deploy env.
 *
 * `isSecret: true`  -> sensitive, encrypted + masked + reveal requires fresh TOTP.
 * `isSecret: false` -> still encrypted, but a public-ish value (publishable key, sender name, id).
 */
export type SecretCategory = 'payments' | 'email' | 'sms' | 'oauth' | 'video' | 'push';

export interface SecretDef {
  key: string;
  category: SecretCategory;
  label: string;
  isSecret: boolean;
}

export const SECRET_CATALOG: SecretDef[] = [
  // Payments
  {
    key: 'STRIPE_PUBLISHABLE_KEY',
    category: 'payments',
    label: 'Stripe Publishable Key',
    isSecret: false,
  },
  { key: 'STRIPE_SECRET_KEY', category: 'payments', label: 'Stripe Secret Key', isSecret: true },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    category: 'payments',
    label: 'Stripe Webhook Secret',
    isSecret: true,
  },
  { key: 'RAZORPAY_KEY_ID', category: 'payments', label: 'Razorpay Key ID', isSecret: false },
  {
    key: 'RAZORPAY_KEY_SECRET',
    category: 'payments',
    label: 'Razorpay Key Secret',
    isSecret: true,
  },

  // Email (sender identity; AWS_* infra stays in env)
  { key: 'SES_FROM_EMAIL', category: 'email', label: 'Email Sender Address', isSecret: false },
  { key: 'SES_FROM_NAME', category: 'email', label: 'Email Sender Name', isSecret: false },

  // SMS
  { key: 'TWILIO_ACCOUNT_SID', category: 'sms', label: 'Twilio Account SID', isSecret: false },
  { key: 'TWILIO_AUTH_TOKEN', category: 'sms', label: 'Twilio Auth Token', isSecret: true },

  // OAuth
  { key: 'GOOGLE_CLIENT_ID', category: 'oauth', label: 'Google Client ID', isSecret: false },
  { key: 'GOOGLE_CLIENT_SECRET', category: 'oauth', label: 'Google Client Secret', isSecret: true },
  { key: 'LINKEDIN_CLIENT_ID', category: 'oauth', label: 'LinkedIn Client ID', isSecret: false },
  {
    key: 'LINKEDIN_CLIENT_SECRET',
    category: 'oauth',
    label: 'LinkedIn Client Secret',
    isSecret: true,
  },

  // Video conferencing (interviews)
  { key: 'ZOOM_CLIENT_ID', category: 'video', label: 'Zoom Client ID', isSecret: false },
  { key: 'ZOOM_CLIENT_SECRET', category: 'video', label: 'Zoom Client Secret', isSecret: true },
  {
    key: 'TEAMS_CLIENT_ID',
    category: 'video',
    label: 'Microsoft Teams Client ID',
    isSecret: false,
  },
  {
    key: 'TEAMS_CLIENT_SECRET',
    category: 'video',
    label: 'Microsoft Teams Client Secret',
    isSecret: true,
  },

  // Push notifications (Firebase)
  { key: 'FIREBASE_PROJECT_ID', category: 'push', label: 'Firebase Project ID', isSecret: false },
  {
    key: 'FIREBASE_CLIENT_EMAIL',
    category: 'push',
    label: 'Firebase Client Email',
    isSecret: false,
  },
  { key: 'FIREBASE_PRIVATE_KEY', category: 'push', label: 'Firebase Private Key', isSecret: true },
];

const CATALOG_BY_KEY = new Map(SECRET_CATALOG.map((s) => [s.key, s]));

export function getSecretDef(key: string): SecretDef | undefined {
  return CATALOG_BY_KEY.get(key);
}

export function isManagedKey(key: string): boolean {
  return CATALOG_BY_KEY.has(key);
}

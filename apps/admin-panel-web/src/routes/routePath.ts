const routePath = {
  DASHBOARD: '/dashboard',
  AUTH: {
    LOGIN: '/login',
  },
  USER: {
    LIST: '/users/list',
    CREATE: '/users/create',
    EDIT: '/users/edit/:id',
    DETAILS: '/users/details/:id',
  },
  ROLE: {
    LIST: '/roles/list',
    CREATE: '/roles/create',
    EDIT: '/roles/edit/:id',
  },
  MEMBER: {
    LIST: '/members/list',
    CREATE: '/members/create',
    EDIT: '/members/edit/:id',
    DETAILS: '/members/details/:id',
    CANDIDATES: '/members/candidates',
    EMPLOYERS: '/members/employers',
  },
  MODERATION: {
    LIST: '/moderation/list',
    DETAILS: '/moderation/details/:id',
  },
  POST: {
    LIST: '/posts/list',
    CREATE: '/posts/create',
    EDIT: '/posts/edit/:id',
    DETAILS: '/posts/details/:id',
  },
  COMPANY: {
    LIST: '/companies/list',
    CREATE: '/companies/create',
    EDIT: '/companies/edit/:id',
    DETAILS: '/companies/details/:id',
    PROFILE: '/company/profile', // Admin's own company profile
  },
  RESUME_TEMPLATES: {
    LIST: '/resume-templates/list',
    CREATE: '/resume-templates/create',
    EDIT: '/resume-templates/edit/:id',
  },
  VIDEO_RESUME: {
    LIST: '/video-resume/list',
  },
  MASTER_DATA: {
    SKILLS: '/master-data/skills',
    EDUCATION: '/master-data/education',
    JOB_FILTERS: '/master-data/job-filters',
  },
  AVATARS: {
    LIST: '/avatars/list',
  },
  EMAIL_TEMPLATES: {
    LIST: '/email-templates/list',
  },
  EMAIL_SETTINGS: {
    PAGE: '/email-settings',
  },
  PAYMENTS: {
    LIST: '/payments/list',
  },
  REPORTS: {
    PAGE: '/reports',
  },
  SUBSCRIPTIONS: {
    PLANS: '/subscriptions/plans',
    ACTIVE: '/subscriptions/active',
    MANUAL_ACTIVATE: '/subscriptions/manual-activate',
  },
};

export default routePath;

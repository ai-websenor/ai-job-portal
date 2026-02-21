const ENDPOINTS = {
  AUTH: {
    SIGNUP: "/auth/register",
    VERIFY_EMAIL: "/auth/verify-email",
    LOGIN: "/auth/login",
    FORGOT_PASSWORD: "/auth/forgot-password",
    FORGOT_PASSWORD_VERIFY_EMAIL: "/auth/forgot-password/verify",
    RESET_PASSWORD: "/auth/reset-password",
    REFRESH_TOKEN: "/auth/refresh",
  },
  SSO: {
    GOOGLE: "/oauth/google",
    GOOGLE_CALLBACK: "/oauth/google/callback",
  },
  CANDIDATE: {
    PROFILE: "/candidates/profile",
    PROFILE_PHOTO: "/candidates/profile/photo",
    UPDATE_PROFILE: "/candidates/profile",
    UPDATE_EDUCATION: (id: string | number) => `/candidates/education/${id}`,
    UPDATE_EXPERIENCE: (id: string | number) => `/candidates/experiences/${id}`,
    UPDATE_CERTIFICATION: (id: string | number) =>
      `/candidates/certifications/${id}`,
    UPDATE_SKILLS: (skillId: string | number) =>
      `/candidates/skills/${skillId}`,
    ADD_EDUCATION: "/candidates/education",
    GET_EXPERIENCE: "/candidates/experiences",
    ADD_EXPERIENCE: "/candidates/experiences",
    ADD_SKILL: "/candidates/skills",
    ADD_CERTIFICATION: "/candidates/certifications",
    UPDATE_PREFERENCES: "/candidates/preferences",
    SKILLS_LIST: "/skills",
    PROFILE_SKILLS: "/candidates/skills",
    DELETE_EDUCATION: (id: string | number) => `/candidates/education/${id}`,
    DELETE_EXPERIENCE: (id: string | number) => `/candidates/experiences/${id}`,
    DELETE_SKILL: (skillId: string | number) => `/candidates/skills/${skillId}`,
    DELETE_CERTIFICATION: (id: string | number) =>
      `/candidates/certifications/${id}`,
    GET_RESUMES: "/resumes",
    MARK_AS_PRIMARY: (id: string) => `/resumes/${id}/primary`,
    UPLOAD_RESUME: "/resumes/upload",
    DELETE_RESUME: (id: string) => `/resumes/${id}`,
  },
  RESUME_VIDEO: {
    PRE_SIGNED_UPLOAD: "/candidates/profile/video/presign-upload",
    CONFIRM_UPLOAD: "/candidates/profile/video/confirm-upload",
    UPLOAD: "/candidates/profile/video",
    UPDATE: "/candidates/profile/video",
    DELETE: "/candidates/profile/video",
    DOWNLOAD: "/candidates/profile/video/download",
  },
  JOBS: {
    TRENDING: "/search/jobs/trending",
    POPULAR: "/search/jobs/popular",
    SEARCH: "/search/jobs",
    DETAILS: (id: string) => `/jobs/${id}`,
    SAVE: (id: string) => `/jobs/${id}/save`,
    RECOMMENDED: "/jobs/recommended",
    SAVED: "/jobs/user/saved",
  },
  APPLICATIONS: {
    APPLY: "applications",
    QUICK_APPLY: "/applications/quick-apply",
    LIST: "/applications/my-applications",
  },
  TEMPLATES: {
    LIST: "/resumes/templates",
  },
  AVATARS: {
    LIST: "/candidates/avatars",
    CHOOSE: "/candidates/profile/avatar",
  },
  MASTER_DATA: {
    DEGRESS: "/degrees",
    FIELDS_OF_STUDY: (degreeId: string) =>
      `/degrees/${degreeId}/fields-of-study`,
    SKILLS: "/skills",
  },
  EMPLOYER: {
    AUTH: {
      SEND_MOBILE_OTP: "/company/register/send-mobile-otp",
      VERIFY_MOBILE_OTP: "/company/register/verify-mobile-otp",
      SEND_EMAIL_OTP: "/company/register/send-email-otp",
      VERIFY_EMAIL_OTP: "/company/register/verify-email-otp",
      ONBOARDING: {
        USER_DETAILS: "/company/register/basic-details",
        COMPANY_DETAILS: "/company/register/complete",
      },
    },
    PROFILE: "/employers/profile",
    UPDATE_PROFILE_PHOTO: "/employers/profile/photo",
    UPDATE_PROFILE: "/employers/profile",
    COMPANY_PROFILE: "/company/profile",
    UPDATE_COMPANY_PROFILE: "/company/profile",
    MEMBERS: {
      LIST: "/company-employers",
      CREATE: "/company-employers",
      DETAILS: (id: string) => `/company-employers/${id}`,
      UPDATE: (id: string) => `/company-employers/${id}`,
      DELETE: (id: string) => `/company-employers/${id}`,
    },
    PERMISSIONS: {
      GET_ALL: "/company-employers/permissions",
      PERMISSIONS_BY_MEMBER: (id: string) => `/company-employers/${id}/permissions`,
      ASSIGN_PERMISSIONS: (id: string) => `/company-employers/${id}/permissions`,
      EDIT_PERMISSIONS: (id: string) => `/company-employers/${id}/permissions`
    },
  },
};

export default ENDPOINTS;

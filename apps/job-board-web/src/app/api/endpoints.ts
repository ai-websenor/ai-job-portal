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
  OAUTH: {
    GOOGLE_AUTH_URL: "/oauth/google",
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
};

export default ENDPOINTS;

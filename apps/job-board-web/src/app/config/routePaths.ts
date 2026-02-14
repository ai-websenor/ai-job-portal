const routePaths = {
  home: "/",
  aboutUs: "/about-us",
  dashboard: "/dashboard",
  contactUs: "/contact-us",
  cms: (slug: string) => `/cms/${slug}`,
  videoResume: "/auth/video-resume",
  jobs: {
    search: "/jobs/search",
    detail: (id: string) => `/jobs/${id}`,
    apply: (id: string) => `/jobs/apply-job/${id}`,
    applicationSent: (companyName: string) =>
      `/jobs/application-sent/${companyName}`,
  },
  companies: {
    search: "/companies/search",
  },
  auth: {
    login: "/auth/login",
    signup: "/auth/sign-up",
    onboarding: "/auth/onboarding",
    verifyEmail: "/auth/verify-email",
    forgotPassword: "/auth/forgot-password",
    forgotPasswordVerifyEmail: "/auth/forgot-password-verify-email",
    resetPassword: "/auth/reset-password",
  },
  employee: {
    auth: {
      login: "/employee/auth/login",
      signup: "/employee/auth/sign-up",
      mobileOtpVerify: "/employee/auth/mobile-otp-verify",
      emailOtpVerify: "/employee/auth/email-otp-verify",
      onboarding: "/employee/auth/onboarding",
    },
    dashboard: "/employee/dashboard",
  },
  chat: {
    list: "/chat",
    chatDetail: (id: string) => `/chat/${id}`,
  },
  applications: {
    list: "/my-applications",
  },
  savedJobs: {
    list: "/saved-jobs",
  },
  profile: "/profile",
};

export default routePaths;

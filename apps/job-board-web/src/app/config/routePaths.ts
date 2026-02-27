const routePaths = {
  home: '/',
  aboutUs: '/about-us',
  dashboard: '/dashboard',
  contactUs: '/contact-us',
  cms: (slug: string) => `/cms/${slug}`,
  videoResume: '/video-resume',
  jobs: {
    search: '/jobs/search',
    detail: (id: string) => `/jobs/${id}`,
    apply: (id: string) => `/jobs/apply-job/${id}`,
    applicationSent: (companyName: string) => `/jobs/application-sent/${companyName}`,
  },
  companies: {
    search: '/companies/search',
  },
  auth: {
    login: '/auth/login',
    signup: '/auth/sign-up',
    onboarding: '/auth/onboarding',
    verifyEmail: '/auth/verify-email',
    forgotPassword: '/auth/forgot-password',
    forgotPasswordVerifyEmail: '/auth/forgot-password-verify-email',
    resetPassword: '/auth/reset-password',
    googleCallback: '/auth/google/callback',
  },
  employee: {
    auth: {
      login: '/employee/auth/login',
      signup: '/employee/auth/sign-up',
      mobileOtpVerify: '/employee/auth/mobile-otp-verify',
      emailOtpVerify: '/employee/auth/email-otp-verify',
      onboarding: '/employee/auth/onboarding',
      emailOtp: '/employee/auth/email-otp',
      changePassword: '/employee/change-password',
    },
    dashboard: '/employee/dashboard',
    jobs: {
      list: '/employee/jobs',
      create: '/employee/jobs/create',
      update: (id: string) => `/employee/jobs/${id}/update`,
      preview: (id: string) => `/employee/jobs/${id}/preview`,
      applications: (id: string) => `/employee/jobs/${id}/applications`,
      applicantProfile: (applicationId: string, applicantId: string) =>
        `/employee/jobs/${applicationId}/applications/${applicantId}`,
      scheduleInterview: (applicationId: string) => `/employee/jobs/${applicationId}/schedule`,
    },
    members: {
      list: '/employee/members',
      create: '/employee/members/create',
      update: (id: string) => `/employee/members/${id}/update`,
    },
    shortList: '/employee/short-listed',
    profile: '/employee/profile',
    plans: '/employee/plans',
  },
  chat: {
    list: '/chat',
    chatDetail: (id: string) => `/chat/${id}`,
  },
  applications: {
    list: '/my-applications',
  },
  savedJobs: {
    list: '/saved-jobs',
  },
  profile: '/profile',
};

export default routePaths;

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
  auth: {
    login: '/auth/login',
    signup: '/auth/sign-up',
    onboarding: '/auth/onboarding',
    verifyEmail: '/auth/verify-email',
    sendMobileOtp: '/auth/send-mobile-otp',
    verifyMobileOtp: '/auth/verify-mobile-otp',
    forgotPassword: '/auth/forgot-password',
    forgotPasswordVerifyEmail: '/auth/forgot-password-verify-email',
    resetPassword: '/auth/reset-password',
    googleCallback: '/auth/google/callback',
  },
  chat: {
    list: '/chat',
    chatDetail: (id: string) => `/chat/${id}`,
  },
  applications: {
    list: '/my-applications',
    track: (id: string) => `/my-applications/${id}/track`,
  },
  savedJobs: {
    list: '/saved-jobs',
  },
  profile: '/profile',
  templates: {
    build: (templateId: string) => `/templates/${templateId}/build`,
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
      forgotPassword: '/employee/auth/forgot-password',
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
    allApplications: '/employee/all-applications',
    members: {
      list: '/employee/members',
      create: '/employee/members/create',
      update: (id: string) => `/employee/members/${id}/update`,
    },
    profile: '/employee/profile',
    plans: {
      list: '/employee/plans',
      history: '/employee/plans/history',
      usage: '/employee/plans/usage',
    },
    interviews: {
      list: '/employee/interviews',
    },
    transactions: {
      list: '/employee/transactions',
      detail: (id: string) => `/employee/transactions/${id}`,
      invoiceDetails: (id: string) => `/employee/transactions/${id}/invoice`,
    },
  },

  payment: {
    success: '/payment/success',
  },
};

export default routePaths;

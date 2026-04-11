import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import routePath from './routePath';

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

// Dashboard
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));

// Users
const UsersListPage = lazy(() => import('@/pages/users/UsersListPage'));

// Roles
const RolesListPage = lazy(() => import('@/pages/roles/RolesListPage'));
const RolesFormPage = lazy(() => import('@/pages/roles/RolesFormPage'));

// Members
const MembersListPage = lazy(() => import('@/pages/members/MembersListPage'));
const CandidatesListPage = lazy(() => import('@/pages/members/CandidatesListPage'));
const CandidateDetailsPage = lazy(() => import('@/pages/members/CandidateDetailsPage'));
const EmployersListPage = lazy(() => import('@/pages/members/EmployersListPage'));
const EmployerDetailsPage = lazy(() => import('@/pages/members/EmployerDetailsPage'));

// Companies
const CompaniesListPage = lazy(() => import('@/pages/companies/CompaniesListPage'));
const CompanyDetailsPage = lazy(() => import('@/pages/companies/CompanyDetailsPage'));
const AdminCompanyProfilePage = lazy(() => import('@/pages/companies/AdminCompanyProfilePage'));

// Resume Templates
const ResumeTemplatesListPage = lazy(
  () => import('@/pages/resumeTemplates/ResumeTemplatesListPage'),
);

// Video Resume
const VideoResumeListPage = lazy(() => import('@/pages/videoResume/VideoResumeListPage'));

// Master Data
const SkillsListPage = lazy(() => import('@/pages/masterData/SkillsListPage'));
const EducationPage = lazy(() => import('@/pages/masterData/EducationPage'));

// Avatars
const AvatarsListPage = lazy(() => import('@/pages/avatars/AvatarsListPage'));
const JobFiltersListPage = lazy(() => import('@/pages/masterData/JobFiltersListPage'));

// Moderation
const ModerationListPage = lazy(() => import('@/pages/moderation/ModerationListPage'));

// Email Templates
const EmailTemplatesListPage = lazy(() => import('@/pages/emailTemplates/EmailTemplatesListPage'));

// Platform Settings (combined Email Settings + Invoice Config)
const PlatformSettingsPage = lazy(() => import('@/pages/settings/PlatformSettingsPage'));

// Invoices
const InvoicesListPage = lazy(() => import('@/pages/invoices/InvoicesListPage'));

// Payments
const PaymentsListPage = lazy(() => import('@/pages/payments/PaymentsListPage'));

// Legacy settings redirect (kept for backwards compat)
const InvoiceSettingsPage = lazy(() => import('@/pages/settings/PlatformSettingsPage'));

// Subscriptions
const SubscriptionPlansPage = lazy(() => import('@/pages/subscriptions/SubscriptionPlansPage'));
const SubscriptionsListPage = lazy(() => import('@/pages/subscriptions/SubscriptionsListPage'));
const ManualActivationPage = lazy(() => import('@/pages/subscriptions/ManualActivationPage'));

// Reports
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));

// Content Management
const AboutUsPage = lazy(() => import('../pages/contentManagement/AboutUsPage'));
const TermsConditionsPage = lazy(() => import('../pages/contentManagement/TermsConditionsPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/contentManagement/PrivacyPolicyPage'));
const ContactSubmissionsPage = lazy(
  () => import('../pages/contentManagement/ContactSubmissionsPage'),
);

const allRoutes = [
  // Auth routes (no layout)
  {
    path: routePath.AUTH.LOGIN,
    element: <LoginPage />,
    isAuthRoute: true,
  },

  // Protected routes (with app layout)
  {
    path: routePath.DASHBOARD,
    element: <DashboardPage />,
  },
  {
    path: routePath.USER.LIST,
    element: <UsersListPage />,
  },
  {
    path: routePath.ROLE.LIST,
    element: <RolesListPage />,
  },
  {
    path: routePath.ROLE.CREATE,
    element: <RolesFormPage />,
  },
  {
    path: routePath.ROLE.EDIT,
    element: <RolesFormPage />,
  },
  {
    path: routePath.MEMBER.LIST,
    element: <MembersListPage />,
  },
  {
    path: routePath.MEMBER.CANDIDATES,
    element: <CandidatesListPage />,
  },
  {
    path: routePath.MEMBER.CANDIDATE_DETAILS,
    element: <CandidateDetailsPage />,
  },
  {
    path: routePath.MEMBER.EMPLOYERS,
    element: <EmployersListPage />,
  },
  {
    path: routePath.MEMBER.EMPLOYER_DETAILS,
    element: <EmployerDetailsPage />,
  },
  {
    path: routePath.COMPANY.LIST,
    element: <CompaniesListPage />,
  },
  {
    path: routePath.COMPANY.DETAILS,
    element: <CompanyDetailsPage />,
  },
  {
    path: routePath.COMPANY.PROFILE,
    element: <AdminCompanyProfilePage />,
  },
  {
    path: routePath.RESUME_TEMPLATES.LIST,
    element: <ResumeTemplatesListPage />,
  },
  {
    path: routePath.VIDEO_RESUME.LIST,
    element: <VideoResumeListPage />,
  },
  {
    path: routePath.MODERATION.LIST,
    element: <ModerationListPage />,
  },
  {
    path: routePath.MASTER_DATA.SKILLS,
    element: <SkillsListPage />,
  },
  {
    path: routePath.MASTER_DATA.EDUCATION,
    element: <EducationPage />,
  },
  {
    path: routePath.AVATARS.LIST,
    element: <AvatarsListPage />,
  },
  {
    path: routePath.MASTER_DATA.JOB_FILTERS,
    element: <JobFiltersListPage />,
  },
  {
    path: routePath.EMAIL_TEMPLATES.LIST,
    element: <EmailTemplatesListPage />,
  },
  {
    path: routePath.EMAIL_SETTINGS.PAGE,
    element: <PlatformSettingsPage />,
  },
  {
    path: routePath.PAYMENTS.LIST,
    element: <PaymentsListPage />,
  },
  {
    path: routePath.SETTINGS.INVOICE,
    element: <InvoiceSettingsPage />,
  },
  {
    path: routePath.SUBSCRIPTIONS.PLANS,
    element: <SubscriptionPlansPage />,
  },
  {
    path: routePath.SUBSCRIPTIONS.ACTIVE,
    element: <SubscriptionsListPage />,
  },
  {
    path: routePath.SUBSCRIPTIONS.MANUAL_ACTIVATE,
    element: <ManualActivationPage />,
  },
  {
    path: routePath.PAYMENTS.LIST,
    element: <PaymentsListPage />,
  },

  {
    path: routePath.INVOICES.LIST,
    element: <InvoicesListPage />,
  },

  {
    path: routePath.REPORTS.PAGE,
    element: <ReportsPage />,
  },

  // Content Management
  { path: routePath.CONTENT_MANAGEMENT.ABOUT_US, element: <AboutUsPage /> },
  { path: routePath.CONTENT_MANAGEMENT.TERMS_CONDITIONS, element: <TermsConditionsPage /> },
  { path: routePath.CONTENT_MANAGEMENT.PRIVACY_POLICY, element: <PrivacyPolicyPage /> },
  { path: routePath.CONTENT_MANAGEMENT.CONTACT_SUBMISSIONS, element: <ContactSubmissionsPage /> },

  // Redirect root to dashboard
  {
    path: '/',
    element: <Navigate replace to={routePath.DASHBOARD} />,
    noWrapper: true,
  },

  // Catch all 404
  {
    path: '*',
    element: <Navigate replace to={routePath.DASHBOARD} />,
    noWrapper: true,
  },
];

export default allRoutes;

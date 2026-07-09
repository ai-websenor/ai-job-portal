// Employer fields exposed on application responses — internal columns (rbac role,
// subscription, verification/ack flags, timestamps) stay server-side
export const employerPublicColumns = {
  id: true,
  userId: true,
  companyId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  phone: true,
  department: true,
  designation: true,
  profilePhoto: true,
} as const;

// Candidate (users row) fields exposed on application responses — auth/internal
// columns (password, cognitoSub, twoFactorSecret, resumeDetails, ...) stay server-side
export const jobSeekerPublicColumns = {
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  mobile: true,
} as const;

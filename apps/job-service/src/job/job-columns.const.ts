// Employer fields exposed on job responses — internal columns (rbac role,
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

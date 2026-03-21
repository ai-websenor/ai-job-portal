import * as yup from 'yup';
import regex from './regex';
import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input';
import dayjs from 'dayjs';
import { InterviewModes } from '../types/enum';
import APP_CONFIG from '../config/config';

export const signupSchema: any = yup.object().shape({
  firstName: yup.string().trim().required('First name is required'),
  lastName: yup.string().trim().required('Last name is required'),
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  mobile: yup
    .string()
    .required('Phone number is required')
    .test('is-valid-phone', 'Invalid phone number', (value) => {
      if (!value) return false;

      const phoneNumber = parsePhoneNumber(value);

      if (!phoneNumber || !isValidPhoneNumber(value)) {
        return false;
      }

      if (phoneNumber.country === 'IN') {
        return phoneNumber.nationalNumber.length === 10;
      }

      return true;
    }),
  password: yup
    .string()
    .required('Password is required')
    .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

export const verifyEmailValidation: any = yup.object({
  code: yup
    .string()
    .required('OTP is required')
    .min(6, 'OTP must be 6 digits')
    .max(6, 'OTP must be 6 digits'),
});

export const loginValidation: any = yup.object({
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG),
});

export const onboardingValidation: any = {
  '1': yup.object({
    firstName: yup.string().trim().required('First name is required'),
    lastName: yup.string().trim().required('Last name is required'),
    email: yup
      .string()
      .trim()
      .email('Please enter a valid email address')
      .required('Email is required'),
    phone: yup
      .string()
      .required('Phone number is required')
      .test('is-valid-phone', 'Invalid phone number', (value) => {
        if (!value) return false;

        const phoneNumber = parsePhoneNumber(value);

        if (!phoneNumber || !isValidPhoneNumber(value)) {
          return false;
        }

        if (phoneNumber.country === 'IN') {
          return phoneNumber.nationalNumber.length === 10;
        }

        return true;
      }),
    resumes: yup.array().min(1, 'Please upload resume.'),
    summary: yup.string().trim().required('Summary is required'),
    headline: yup.string().trim().required('Headline is required'),
    country: yup.string().trim().required('Country is required'),
    state: yup.string().trim().required('State is required'),
    city: yup.string().trim().required('City is required'),
  }),
  '2': yup.object({
    degree: yup.string().required('Degree is required'),
    institution: yup.string().required('Institution is required'),
  }),
  '3': yup.object({
    skillName: yup.string().required('Skill name is required'),
  }),
  '4': yup.object({
    title: yup.string().trim().required('Title is required'),
    companyName: yup.string().trim().required('Company name is required'),
    employmentType: yup.string().trim().required('Employment type is required'),
    designation: yup.string().trim().required('Designation is required'),
  }),
  '5': yup.object({}),
  '6': yup.object({
    name: yup.string().trim().required('Name is required'),
    issuingOrganization: yup.string().trim().required('Issuing organization is required'),
    credentialUrl: yup
      .string()
      .trim()
      .url('Please enter a valid URL')
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    issueDate: yup
      .mixed()
      .required('Issue date is required')
      .test('is-before', 'Issue date must be before expiry date', function (value: any) {
        const { expiryDate } = this.parent;
        if (!value || !expiryDate) return true;
        return dayjs(value).isBefore(dayjs(expiryDate)) || dayjs(value).isSame(dayjs(expiryDate));
      }),
    expiryDate: yup
      .mixed()
      .required('Expiry date is required')
      .test('is-after', 'Expiry date must be after issue date', function (value: any) {
        const { issueDate } = this.parent;
        if (!value || !issueDate) return true;
        return dayjs(value).isAfter(dayjs(issueDate)) || dayjs(value).isSame(dayjs(issueDate));
      }),
  }),
};

export const forgotPasswordValidation: any = yup.object({
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
});

export const resetPasswordValidation: any = yup.object({
  newPassword: yup
    .string()
    .required('Password is required')
    .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

export const applyJobValidation: any = yup.object({
  resumeId: yup.string().required('Resume is required'),
  agreeConsent: yup.boolean().isTrue('Agree to consent is required'),
});

export const profileEditValidation: any = {
  '1': yup.object({
    firstName: yup.string().trim().required('First name is required'),
    lastName: yup.string().trim().required('Last name is required'),
    country: yup.string().trim().required('Country is required'),
    state: yup.string().trim().required('State is required'),
    city: yup.string().trim().required('City is required'),
  }),
  '2': yup.object({
    degree: yup.string().required('Degree is required'),
    institution: yup.string().required('Institution is required'),
  }),
  '3': yup.object({
    skillName: yup.string().required('Skill name is required'),
  }),
  '4': yup.object({
    title: yup.string().trim().required('Title is required'),
    companyName: yup.string().trim().required('Company name is required'),
    employmentType: yup.string().trim().required('Employment type is required'),
    designation: yup.string().trim().required('Designation is required'),
  }),
  '5': yup.object({}),
  '6': yup.object({}),
  '7': yup.object({}),
} as any;

export const employeeSignupValidation: any = yup.object({
  mobile: yup
    .string()
    .required('Phone number is required')
    .test('is-valid-phone', 'Invalid phone number', (value) => {
      if (!value) return false;

      const phoneNumber = parsePhoneNumber(value);

      if (!phoneNumber || !isValidPhoneNumber(value)) {
        return false;
      }

      if (phoneNumber.country === 'IN') {
        return phoneNumber.nationalNumber.length === 10;
      }

      return true;
    }),
});

export const mobileOtpVerifyValidation: any = yup.object({
  otp: yup.string().required('OTP is required'),
});

export const employeeLoginValidation: any = yup.object({
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG),
});

export const emailOTPVerifyValidation: any = yup.object({
  otp: yup.string().required('OTP is required'),
});

export const employeeOnboardingValidation: any = {
  '1': yup.object({
    firstName: yup.string().trim().required('First name is required'),
    lastName: yup.string().trim().required('Last name is required'),
    country: yup.string().trim().required('Country is required'),
    state: yup.string().trim().required('State is required'),
    city: yup.string().trim().required('City is required'),
    password: yup
      .string()
      .required('Password is required')
      .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG),
    confirmPassword: yup
      .string()
      .required('Please confirm your password')
      .oneOf([yup.ref('password')], 'Passwords must match'),
  }),

  '2': yup.object({
    companyName: yup.string().trim().required('Company name is required'),
    companyType: yup.string().trim().required('Company type is required'),
    panNumber: yup
      .string()
      .trim()
      .required('Pan number is required')
      .matches(regex.validPAN, 'Invalid pan number'),
    gstNumber: yup
      .string()
      .trim()
      .required('Gst number is required')
      .matches(regex.validGST, 'Invalid gst number'),
    cinNumber: yup.mixed().required('CIN number is required'),
  }),
};

export const postJobValidation: any = yup.object({
  title: yup.string().required('Job title is required').min(3, 'Title too short'),
  description: yup
    .string()
    .required('Description is required')
    .min(250, 'Description must be more than or equal 250 characters'),
  categoryId: yup.string().required('Category is required'),
  subCategoryId: yup.string().required('Sub-category is required'),
  jobType: yup.array().of(yup.string()).min(1, 'Select at least one job type'),
  workMode: yup.array().of(yup.string()).min(1, 'Select a work mode'),

  experienceMin: yup.number().typeError('Must be a number').required('Required'),
  experienceMax: yup
    .number()
    .typeError('Must be a number')
    .required('Required')
    .moreThan(yup.ref('experienceMin'), 'Max experience must be greater than min'),

  salaryMin: yup.number().typeError('Must be a number').min(0),
  salaryMax: yup
    .number()
    .typeError('Must be a number')
    .moreThan(yup.ref('salaryMin'), 'Max salary must be greater than min'),
  showSalary: yup.boolean(),

  location: yup.string().required('Location description is required'),

  skills: yup.array().of(yup.string()).min(1, 'Add at least one skill'),
  benefits: yup.string().nullable(),
  deadline: yup.date().required('Deadline is required').nullable(),

  immigrationStatus: yup.string().nullable(),
  payRate: yup.string().nullable(),
  travelRequirements: yup.string().nullable(),
  qualification: yup.string().required('Qualification is required'),
  certification: yup.string().nullable(),
});

export const memberFormValidation: any = yup.object({
  firstName: yup.string().trim().required('First name is required'),
  lastName: yup.string().trim().required('Last name is required'),
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  mobile: yup
    .string()
    .required('Phone number is required')
    .test('is-valid-phone', 'Invalid phone number', (value) => {
      if (!value) return false;

      const phoneNumber = parsePhoneNumber(value);

      if (!phoneNumber || !isValidPhoneNumber(value)) {
        return false;
      }

      if (phoneNumber.country === 'IN') {
        return phoneNumber.nationalNumber.length === 10;
      }

      return true;
    }),

  designation: yup.string().trim().required('Designation is required'),
  department: yup.string().trim().required('Department is required'),

  password: yup
    .string()
    .trim()
    .required('Password is required')
    .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG),
  confirmPassword: yup
    .string()
    .trim()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});

export const memberUpdateValidation: any = {
  '1': yup.object({
    firstName: yup.string().trim().required('First name is required'),
    lastName: yup.string().trim().required('Last name is required'),
    email: yup
      .string()
      .trim()
      .email('Please enter a valid email address')
      .required('Email is required'),
    mobile: yup
      .string()
      .required('Phone number is required')
      .test('is-valid-phone', 'Invalid phone number', (value) => {
        if (!value) return false;

        const phoneNumber = parsePhoneNumber(value);

        if (!phoneNumber || !isValidPhoneNumber(value)) {
          return false;
        }

        if (phoneNumber.country === 'IN') {
          return phoneNumber.nationalNumber.length === 10;
        }

        return true;
      }),

    designation: yup.string().trim().required('Designation is required'),
    department: yup.string().trim().required('Department is required'),
  }),

  '2': yup.object({
    permissionIds: yup
      .array()
      .of(
        yup.object({
          permissionId: yup.string(),
          isEnabled: yup.boolean(),
        }),
      )
      .test('at-least-one-enabled', 'At least one permission must be enabled', (value) => {
        return value && value.some((item) => item.isEnabled === true);
      }),
  }),
};

export const scheduleInterviewSchema: any = yup.object({
  type: yup.string().required('Select interview type'),
  interviewMode: yup.string().required('Select interview mode'),

  duration: yup
    .string()
    .required('Select interview duration')
    .typeError('Select interview duration'),

  interviewTool: yup.string().when('interviewMode', {
    is: InterviewModes.online,
    then: () => yup.string().required('Please select an interview tool'),
  }),

  location: yup.string().when('interviewMode', {
    is: InterviewModes.offline,
    then: () => yup.string().required('Location is required for in-person interviews'),
  }),

  scheduledAt: yup.mixed().required('Please select a date and time'),
});

export const employeeProfileSchema: any = {
  '1': yup.object({
    firstName: yup.string().trim().required('First name is required'),
    lastName: yup.string().trim().required('Last name is required'),
    country: yup.string().trim().required('Country is required'),
    state: yup.string().trim().required('State is required'),
    city: yup.string().trim().required('City is required'),
  }),

  '2': yup.object({
    name: yup.string().trim().required('Company name is required'),
    companyType: yup.string().trim().required('Company type is required'),
  }),
};

export const employeeEmailSignupValidation: any = yup.object({
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .email('Please enter a valid email address'),
});

export const changePasswordValidation: any = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required')
    .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG),
  newPassword: yup
    .string()
    .required('New password is required')
    .matches(regex.validPassword, APP_CONFIG.VALID_PASSWORD_MSG)
    .notOneOf([yup.ref('currentPassword')], 'New password cannot be the same as current password'),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

export const completeInterviewSchema: any = yup.object({});

export const cancelInterviewSchema: any = yup.object({
  reason: yup.string().required('Cancel reason is required').trim().min(50, 'Should be in details'),
});

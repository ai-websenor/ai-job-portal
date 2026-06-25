import * as yup from 'yup';
import regex from './regex';
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';
import dayjs from 'dayjs';
import { InterviewModes, InterviewTypes } from '../types/enum';
import APP_CONFIG from '../config/config';
import { htmlToText } from './htmlToText';

const toDayjsDate = (value: any) => {
  if (!value) return null;

  if (value?.year && value?.month && value?.day) {
    return dayjs(
      `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`,
    );
  }

  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate : null;
};

const isValidInternationalPhoneNumber = (value?: string | null) => {
  if (!value) return false;

  const phoneNumber = parsePhoneNumberFromString(value);

  if (!phoneNumber || !isValidPhoneNumber(value)) {
    return false;
  }

  if (phoneNumber.country === 'IN') {
    return phoneNumber.nationalNumber.length === 10;
  }

  return true;
};

const isOptionalInternationalPhoneNumber = (value?: string | null) => {
  if (!value || value.trim() === '') return true;

  return isValidInternationalPhoneNumber(value);
};

const requiredPersonName = (fieldLabel: string) =>
  yup
    .string()
    .matches(/^\p{L}+$/u, {
      message: `${fieldLabel} can contain letters only`,
      excludeEmptyString: true,
    })
    .required(`${fieldLabel} is required`);

const optionalPersonName = (fieldLabel: string) =>
  yup
    .string()
    .trim()
    .nullable()
    .notRequired()
    .matches(/^[\p{L}\s]*$/u, {
      message: `${fieldLabel} can contain letters only`,
      excludeEmptyString: true,
    });

export const signupSchema: any = yup.object().shape({
  firstName: requiredPersonName('First name'),
  middleName: optionalPersonName('Middle name'),
  lastName: requiredPersonName('Last name'),
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  mobile: yup
    .string()
    .required('Phone number is required')
    .test('is-valid-phone', 'Invalid phone number', (value) => {
      return isValidInternationalPhoneNumber(value);
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

export const verifyMobileOtpValidation: any = yup.object({
  otp: yup
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
    firstName: requiredPersonName('First name'),
    middleName: optionalPersonName('Middle name'),
    lastName: requiredPersonName('Last name'),
    email: yup
      .string()
      .trim()
      .email('Please enter a valid email address')
      .required('Email is required'),
    phone: yup
      .string()
      .required('Phone number is required')
      .test('is-valid-phone', 'Invalid phone number', (value) => {
        return isValidInternationalPhoneNumber(value);
      }),
  }),
  '2': yup.object({
    degree: yup.string().required('Degree is required'),
    institution: yup.string().required('Institution is required'),
    fieldOfStudy: yup.string().required('Field of study is required'),
    grade: yup
      .string()
      .nullable()
      .matches(/^\d*(\.\d{0,2})?$/, {
        message: 'Academic performance can have up to 2 decimal places',
        excludeEmptyString: true,
      })
      .test('grade-range', function (value) {
        if (!value) return true;

        const grade = Number(value);
        if (Number.isNaN(grade)) return false;

        if (this.parent.gradeType === 'percentage') {
          if (grade <= 0) {
            return this.createError({ message: 'Percentage must be greater than 0' });
          }

          return (
            grade <= 100 || this.createError({ message: 'Percentage cannot be greater than 100' })
          );
        }

        if (grade <= 0) {
          return this.createError({ message: 'CGPA must be greater than 0' });
        }

        return grade <= 10 || this.createError({ message: 'CGPA cannot be greater than 10' });
      }),
    gradeType: yup.string().oneOf(['cgpa', 'percentage']).nullable(),
    honors: yup.string().trim().max(100, 'Honors must be at most 100 characters').nullable(),
  }),
  '3': yup.object({
    skillName: yup.string().required('Skill name is required'),
    experienceYears: yup
      .string()
      .nullable()
      .notRequired()
      .test('years-range', 'Years must be between 0 and 30', (value) => {
        if (value === undefined || value === null || value === '') return true;

        const num = Number(value);
        return !isNaN(num) && num >= 0 && num <= 30;
      }),
    experienceMonths: yup
      .string()
      .nullable()
      .notRequired()
      .test('months-range', 'Months must be between 0 and 11', (value) => {
        if (value === undefined || value === null || value === '') return true;

        const num = Number(value);
        return !isNaN(num) && num >= 0 && num <= 11;
      }),
  }),
  '4': yup.object({
    title: yup.string().trim().required('Title is required'),
    companyName: yup.string().trim().required('Company name is required'),
    employmentType: yup.string().trim().required('Employment type is required'),
    designation: yup.string().trim().required('Designation is required'),
    startDate: yup.string().required('Start date is required'),
    isCurrent: yup
      .boolean()
      .transform((value) => (value === '' ? false : value))
      .nullable(),
    endDate: yup.string().when('isCurrent', {
      is: (val: boolean) => val === false || val === undefined,
      then: () => yup.string().required('End date is required'),
      otherwise: () => yup.string().nullable().notRequired(),
    }),
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
    firstName: requiredPersonName('First name'),
    middleName: optionalPersonName('Middle name'),
    lastName: requiredPersonName('Last name'),
    headline: yup.string().trim().required('Headline is required'),
    country: yup.string().trim().required('Country is required'),
    state: yup.string().trim().required('State is required'),
    city: yup.string().trim().required('City is required'),
  }),
  '2': yup.object({
    degree: yup.string().required('Degree is required'),
    institution: yup.string().required('Institution is required'),
    grade: yup
      .string()
      .nullable()
      .matches(/^\d*(\.\d{0,2})?$/, {
        message: 'Academic performance can have up to 2 decimal places',
        excludeEmptyString: true,
      })
      .test('grade-range', function (value) {
        if (!value) return true;

        const grade = Number(value);
        if (Number.isNaN(grade)) return false;

        if (this.parent.gradeType === 'percentage') {
          if (grade <= 0) {
            return this.createError({ message: 'Percentage must be greater than 0' });
          }

          return (
            grade <= 100 || this.createError({ message: 'Percentage cannot be greater than 100' })
          );
        }

        if (grade <= 0) {
          return this.createError({ message: 'CGPA must be greater than 0' });
        }

        return grade <= 10 || this.createError({ message: 'CGPA cannot be greater than 10' });
      }),
    gradeType: yup.string().oneOf(['cgpa', 'percentage']).nullable(),
    honors: yup.string().trim().max(100, 'Honors must be at most 100 characters').nullable(),
    startDate: yup.mixed().required('Start date is required'),
    currentlyStudying: yup
      .boolean()
      .transform((value) => (value === '' ? false : value))
      .nullable(),
    endDate: yup
      .mixed()
      .nullable()
      .test('is-required', 'End date is required', function (value) {
        return this.parent.currentlyStudying || !!value;
      })
      .test('is-after-start', 'End date must be after start date', function (value: any) {
        const { startDate, currentlyStudying } = this.parent;
        if (currentlyStudying || !value || !startDate) return true;

        const start = toDayjsDate(startDate);
        const end = toDayjsDate(value);

        if (!start || !end) return true;
        return end.isAfter(start, 'month');
      }),
  }),
  '3': yup.object({
    skillName: yup.string().required('Skill name is required'),
    proficiencyLevel: yup.string().nullable().notRequired(),
    experienceYears: yup
      .string()
      .nullable()
      .notRequired()
      .test('years-range', 'Years must be between 0 and 30', (value) => {
        if (value === undefined || value === null || value === '') return true;

        const num = Number(value);
        return !isNaN(num) && num >= 0 && num <= 30;
      }),
    experienceMonths: yup
      .string()
      .nullable()
      .notRequired()
      .test('months-range', 'Months must be between 0 and 11', (value) => {
        if (value === undefined || value === null || value === '') return true;

        const num = Number(value);
        return !isNaN(num) && num >= 0 && num <= 11;
      }),
  }),
  '4': yup.object({
    title: yup.string().trim().required('Title is required'),
    companyName: yup.string().trim().required('Company name is required'),
    employmentType: yup.string().trim().required('Employment type is required'),
    designation: yup.string().trim().required('Designation is required'),
    startDate: yup.string().required('Start date is required'),
    isCurrent: yup
      .boolean()
      .transform((value) => (value === '' ? false : value))
      .nullable(),
    endDate: yup.string().when('isCurrent', {
      is: (val: boolean) => val === false || val === undefined,
      then: () => yup.string().required('End date is required'),
      otherwise: () => yup.string().nullable().notRequired(),
    }),
  }),
  '5': yup.object({}),
  '6': yup.object({}),
  '7': yup.object({}),
  '8': yup.object({
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
} as any;

export const employeeSignupValidation: any = yup.object({
  mobile: yup
    .string()
    .required('Phone number is required')
    .test('is-valid-phone', 'Invalid phone number', (value) => {
      return isValidInternationalPhoneNumber(value);
    }),
});

export const mobileOtpVerifyValidation: any = yup.object({
  otp: yup
    .string()
    .required('OTP is required')
    .min(6, 'OTP must be 6 digits')
    .max(6, 'OTP must be 6 digits'),
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
  otp: yup
    .string()
    .required('OTP is required')
    .min(6, 'OTP must be 6 digits')
    .max(6, 'OTP must be 6 digits'),
});

export const employeeOnboardingValidation: any = {
  '1': yup.object({
    companyName: yup.string().trim().required('Company name is required'),
    companyType: yup.string().trim().required('Company type is required'),
    country: yup.string().trim().required('Country is required'),
    state: yup.string().trim().required('State is required'),
    city: yup.string().trim().required('City is required'),
    panNumber: yup
      .string()
      .trim()
      .required('Pan number is required')
      .matches(regex.validPAN, 'Invalid pan number'),
    gstNumber: yup
      .string()
      .trim()
      .nullable()
      .notRequired()
      .transform((value) => (value === '' ? null : value))
      .matches(regex.validGST, { message: 'Invalid gst number', excludeEmptyString: true }),
    cinNumber: yup
      .string()
      .trim()
      .nullable()
      .notRequired()
      .transform((value) => (value === '' ? null : value)),
  }),

  '2': yup.object({
    firstName: requiredPersonName('First name'),
    middleName: optionalPersonName('Middle name'),
    lastName: requiredPersonName('Last name'),
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
};

export const postJobValidation: any = yup.object({
  clientName: yup
    .string()
    .trim()
    .notRequired()
    .test('client-name-length', 'Client name too short', (value) => !value || value.length >= 2),
  title: yup.string().required('Job title is required').min(3, 'Title too short'),
  description: yup
    .string()
    .test('not-empty', 'Description is required', (value) => htmlToText(value).length > 0)
    .test('min-text', 'Description must be more than or equal 250 characters', (value) => {
      const text = htmlToText(value);
      return !text || text.length >= 250;
    })
    .max(20000, 'Description too long'),
  categoryId: yup.string().required('Industry is required'),
  subCategoryId: yup.string().required('Department is required'),
  jobType: yup.array().of(yup.string()).min(1, 'Select at least one job type'),
  workMode: yup.array().of(yup.string()).min(1, 'Select a work mode'),

  experienceMin: yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Must be a number')
    .required('Required'),
  experienceMax: yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Must be a number')
    .notRequired()
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

  validityDays: yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Must be a number')
    .min(1, 'Validity must be at least 1 day')
    .notRequired()
    .nullable(),

  immigrationStatus: yup.string().nullable(),
  payRate: yup.string().nullable(),
  travelRequirements: yup.string().nullable(),
  qualification: yup.string().required('Qualification is required'),
  certification: yup.string().nullable(),
});

export const memberFormValidation: any = yup.object({
  firstName: requiredPersonName('First name'),
  middleName: optionalPersonName('Middle name'),
  lastName: requiredPersonName('Last name'),
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  mobile: yup
    .string()
    .required('Phone number is required')
    .test('is-valid-phone', 'Invalid phone number', (value) => {
      return isValidInternationalPhoneNumber(value);
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
    firstName: requiredPersonName('First name'),
    middleName: optionalPersonName('Middle name'),
    lastName: requiredPersonName('Last name'),
    email: yup
      .string()
      .trim()
      .email('Please enter a valid email address')
      .required('Email is required'),
    mobile: yup
      .string()
      .required('Phone number is required')
      .test('is-valid-phone', 'Invalid phone number', (value) => {
        return isValidInternationalPhoneNumber(value);
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

  customType: yup
    .string()
    .trim()
    .when('type', {
      is: InterviewTypes.Other,
      then: () =>
        yup.string().trim().required('Enter interview type name').max(100, 'Max 100 characters'),
      otherwise: () => yup.string().trim().notRequired(),
    }),

  roundName: yup.string().trim().max(100, 'Max 100 characters').notRequired(),

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
    is: InterviewModes.on_site,
    then: () => yup.string().required('Location is required for in-person interviews'),
  }),

  scheduledAt: yup.mixed().required('Please select a date and time'),
});

export const employeeProfileSchema: any = {
  '1': yup.object({
    firstName: requiredPersonName('First name'),
    middleName: optionalPersonName('Middle name'),
    lastName: requiredPersonName('Last name'),
    country: yup.string().trim().required('Country is required'),
    state: yup.string().trim().required('State is required'),
    city: yup.string().trim().required('City is required'),
  }),

  '2': yup.object({
    name: yup.string().trim().required('Company name is required'),
    companyType: yup.string().trim().required('Company type is required'),
    billingEmail: yup.string().email('Please enter a valid email address').nullable().notRequired(),
    billingPhone: yup.string().test('is-valid-phone', 'Invalid phone number', (value) => {
      return isOptionalInternationalPhoneNumber(value);
    }),
    website: yup
      .string()
      .matches(regex.validURL, 'Enter a valid URL')
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    linkedinUrl: yup
      .string()
      .matches(regex.validURL, 'Enter a valid URL')
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    twitterUrl: yup
      .string()
      .matches(regex.validURL, 'Enter a valid URL')
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    facebookUrl: yup
      .string()
      .matches(regex.validURL, 'Enter a valid URL')
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    instagramUrl: yup
      .string()
      .matches(regex.validURL, 'Enter a valid URL')
      .nullable()
      .transform((value) => (value === '' ? null : value)),
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
  reason: yup.string().required('Cancel reason is required').trim().min(10, 'The cancellation reason must be at least 10 characters long.'),
});

export const contactUsSchema = yup.object({
  name: yup.string().trim().required('Name is required'),
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .email('Please enter a valid email address'),
  message: yup
    .string()
    .trim()
    .required('Message is required')
    .min(10, 'Message should be at least 10 characters long'),
});

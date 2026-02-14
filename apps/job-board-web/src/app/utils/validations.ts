import * as yup from "yup";
import regex from "./regex";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";

export const signupSchema: any = yup.object().shape({
  firstName: yup.string().trim().required("First name is required"),
  lastName: yup.string().trim().required("Last name is required"),
  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email is required"),
  mobile: yup
    .string()
    .required("Phone number is required")
    .test("is-valid-phone", "Invalid phone number", (value) => {
      if (!value) return false;

      const phoneNumber = parsePhoneNumber(value);

      if (!phoneNumber || !isValidPhoneNumber(value)) {
        return false;
      }

      if (phoneNumber.country === "IN") {
        return phoneNumber.nationalNumber.length === 10;
      }

      return true;
    }),
  password: yup
    .string()
    .required("Password is required")
    .matches(
      regex.validPassword,
      "Pasword must be at least 8 characters, one uppercase, one lowercase, one number and one special character",
    ),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

export const verifyEmailValidation: any = yup.object({
  code: yup
    .string()
    .required("OTP is required")
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits"),
});

export const loginValidation: any = yup.object({
  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .matches(
      regex.validPassword,
      "Pasword must be at least 8 characters, one uppercase, one lowercase, one number and one special character",
    ),
});

export const onboardingValidation: any = {
  "1": yup.object({
    firstName: yup.string().trim().required("First name is required"),
    lastName: yup.string().trim().required("Last name is required"),
    email: yup
      .string()
      .trim()
      .email("Please enter a valid email address")
      .required("Email is required"),
    phone: yup
      .string()
      .required("Phone number is required")
      .test("is-valid-phone", "Invalid phone number", (value) => {
        if (!value) return false;

        const phoneNumber = parsePhoneNumber(value);

        if (!phoneNumber || !isValidPhoneNumber(value)) {
          return false;
        }

        if (phoneNumber.country === "IN") {
          return phoneNumber.nationalNumber.length === 10;
        }

        return true;
      }),
    resumes: yup.array().min(1, "Please upload resume."),
    summary: yup.string().trim().required("Summary is required"),
    headline: yup.string().trim().required("Headline is required"),
    country: yup.string().trim().required("Country is required"),
    state: yup.string().trim().required("State is required"),
    city: yup.string().trim().required("City is required"),
  }),
  "2": yup.object({
    degree: yup.string().required("Degree is required"),
    institution: yup.string().required("Institution is required"),
  }),
  "3": yup.object({
    skillName: yup.string().required("Skill name is required"),
    proficiencyLevel: yup.string().required("Proficiency level is required"),
  }),
  "4": yup.object({
    title: yup.string().trim().required("Title is required"),
    companyName: yup.string().trim().required("Company name is required"),
    employmentType: yup.string().trim().required("Employment type is required"),
    designation: yup.string().trim().required("Designation is required"),
    startDate: yup.date().required("Start date is required"),
    endDate: yup.date().required("End date is required"),
  }),
  "5": yup.object({}),
  "6": yup.object({
    name: yup.string().trim().required("Name is required"),
    issuingOrganization: yup
      .string()
      .trim()
      .required("Issuing organization is required"),
    credentialUrl: yup
      .string()
      .trim()
      .url("Please enter a valid URL")
      .nullable()
      .transform((value) => (value === "" ? null : value)),
  }),
};

export const forgotPasswordValidation: any = yup.object({
  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email is required"),
});

export const resetPasswordValidation: any = yup.object({
  newPassword: yup
    .string()
    .required("Password is required")
    .matches(
      regex.validPassword,
      "Pasword must be at least 8 characters, one uppercase, one lowercase, one number and one special character",
    ),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Passwords must match")
    .required("Please confirm your password"),
});

export const applyJobValidation: any = yup.object({
  resumeId: yup.string().required("Resume is required"),
  agreeConsent: yup.boolean().isTrue("Agree to consent is required"),
});

export const profileEditValidation: any = {
  "1": yup.object({
    firstName: yup.string().trim().required("First name is required"),
    lastName: yup.string().trim().required("Last name is required"),
    email: yup
      .string()
      .trim()
      .email("Please enter a valid email address")
      .required("Email is required"),
    phone: yup
      .string()
      .required("Phone number is required")
      .test("is-valid-phone", "Invalid phone number", (value) => {
        if (!value) return false;

        const phoneNumber = parsePhoneNumber(value);

        if (!phoneNumber || !isValidPhoneNumber(value)) {
          return false;
        }

        if (phoneNumber.country === "IN") {
          return phoneNumber.nationalNumber.length === 10;
        }

        return true;
      }),
    country: yup.string().trim().required("Country is required"),
    state: yup.string().trim().required("State is required"),
    city: yup.string().trim().required("City is required"),
  }),
  "2": yup.object({
    degree: yup.string().required("Degree is required"),
    institution: yup.string().required("Institution is required"),
  }),
  "3": yup.object({
    skillName: yup.string().required("Skill name is required"),
    proficiencyLevel: yup.string().required("Proficiency level is required"),
  }),
  "4": yup.object({
    title: yup.string().trim().required("Title is required"),
    companyName: yup.string().trim().required("Company name is required"),
    employmentType: yup.string().trim().required("Employment type is required"),
    designation: yup.string().trim().required("Designation is required"),
    startDate: yup.date().required("Start date is required"),
    endDate: yup.date().required("End date is required"),
  }),
  "5": yup.object({}),
  "6": yup.object({}),
} as any;

export const employeeSignupValidation: any = yup.object({
  mobile: yup
    .string()
    .required("Phone number is required")
    .test("is-valid-phone", "Invalid phone number", (value) => {
      if (!value) return false;

      const phoneNumber = parsePhoneNumber(value);

      if (!phoneNumber || !isValidPhoneNumber(value)) {
        return false;
      }

      if (phoneNumber.country === "IN") {
        return phoneNumber.nationalNumber.length === 10;
      }

      return true;
    }),
});

export const mobileOtpVerifyValidation: any = yup.object({
  code: yup.string().required("OTP is required"),
});

export const employeeLoginValidation: any = yup.object({
  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email is required"),
});

export const emailOTPVerifyValidation: any = yup.object({
  code: yup.string().required("OTP is required"),
});

export const employeeOnboardingValidation: any = yup.object({
  "1": yup.object({}),
  "2": yup.object({}),
});

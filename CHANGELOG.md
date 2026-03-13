# Changelog

All notable changes to the AI Job Portal will be documented in this file.

## [v0.2.0] - 2026-03-13

### Foundation & Core Infrastructure

#### Features
- Employer permissions & granular role management with individual enable/disable states
- Company registration with logo, banner, and GST document uploads
- Push notification phase 1 — Firebase Cloud Messaging with device token registration
- Custom resume template builder with live preview
- Signed URL file upload system (generic for various attachment types)
- Job CRUD with category/subcategory selection and dynamic job preview
- Notification APIs with UI drawer, cards, mark-all-read, and delete
- Notification pagination and unread count
- Change password functionality
- Employee dashboard image assets
- GST document download and pre-signed URL endpoints

#### Fixes
- ECS task definition credential cleanup
- Date validation in education forms
- Response structure standardization with meaningful messages and status codes
- Custom logger issues
- Job service and application service failures
- Thumbnail upload issues
- Hashing removed from GST and PAN numbers

#### Refactoring
- Standardized string literals to single quotes across employee profile components
- Externalized tab state management in MemberForm
- Generalized file upload functionality for various attachment types
- Made `useSignedUrl` hook generic with optional duration parameter

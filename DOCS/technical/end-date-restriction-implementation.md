# End Date Restriction Implementation

This note covers the onboarding experience and education step updates that keep the end date strictly after the start date.

## Behavior

- End date cannot be equal to the start date.
- End date cannot be earlier than the start date.
- The existing UI flow stays the same.
- When the range is invalid, the end date field shows an inline error and the form shows a toast message.

## Updated Files

- `apps/job-board-web/src/app/(auth)/auth/onboarding/steps/ExperienceDetails.tsx`
- `apps/job-board-web/src/app/(auth)/auth/onboarding/steps/EducationDetails.tsx`

## Notes

- The end-date picker is constrained to the next valid day where the component supports a minimum date.
- Submission is blocked when the selected end date does not come after the start date.
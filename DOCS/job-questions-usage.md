# Job Questions API - Usage Examples

## Using Question Type Enums

### Example 1: Work Location Preference (Multiple Choice)

```json
{
  "question": "What is your preferred working style?",
  "type": "multiple_choice",
  "options": ["Remote", "Hybrid", "Onsite"],
  "isMandatory": true
}
```

**Using the enum in TypeScript**:
```typescript
import { QuestionType, WorkLocationOptions } from './enums/question.enums';

const workLocationQuestion = {
  question: "What is your preferred working style?",
  type: QuestionType.MULTIPLE_CHOICE,
  options: Object.values(WorkLocationOptions),
  isMandatory: true
};
```

---

### Example 2: Relocation Willingness (Single Choice)

```json
{
  "question": "Are you willing to relocate?",
  "type": "single_choice",
  "options": ["Yes", "No", "Maybe", "Open to discussion"],
  "isMandatory": true
}
```

**Using the enum**:
```typescript
import { QuestionType, RelocationOptions } from './enums/question.enums';

const relocationQuestion = {
  question: "Are you willing to relocate?",
  type: QuestionType.SINGLE_CHOICE,
  options: Object.values(RelocationOptions),
  isMandatory: true
};
```

---

### Example 3: Notice Period (Single Choice)

```json
{
  "question": "What is your notice period?",
  "type": "single_choice",
  "options": ["Immediate", "15 days", "1 month", "2 months", "3 months", "More than 3 months"],
  "isMandatory": true
}
```

**Using the enum**:
```typescript
import { QuestionType, NoticePeriodOptions } from './enums/question.enums';

const noticePeriodQuestion = {
  question: "What is your notice period?",
  type: QuestionType.SINGLE_CHOICE,
  options: Object.values(NoticePeriodOptions),
  isMandatory: true
};
```

---

### Example 4: Free Text Question

```json
{
  "question": "What is your current CTC?",
  "type": "text",
  "isMandatory": false
}
```

**Using the enum**:
```typescript
import { QuestionType } from './enums/question.enums';

const ctcQuestion = {
  question: "What is your current CTC?",
  type: QuestionType.TEXT,
  isMandatory: false
};
// Note: No options needed for text questions
```

---

### Example 5: Yes/No Question

```json
{
  "question": "Do you have a valid driver's license?",
  "type": "yes_no",
  "isMandatory": true
}
```

**Using the enum**:
```typescript
import { QuestionType } from './enums/question.enums';

const licenseQuestion = {
  question: "Do you have a valid driver's license?",
  type: QuestionType.YES_NO,
  isMandatory: true
};
```

---

### Example 6: Rating Question

```json
{
  "question": "Rate your proficiency in TypeScript (1-5)",
  "type": "rating",
  "isMandatory": false
}
```

---

### Example 7: Date Question

```json
{
  "question": "When can you start?",
  "type": "date",
  "isMandatory": true
}
```

---

## Complete Job Creation Example

```json
{
  "title": "Senior Full Stack Developer",
  "description": "Looking for an experienced developer",
  "skills": ["React", "Node.js", "TypeScript"],
  "salaryMin": 80000,
  "salaryMax": 120000,
  "payRate": "Yearly",
  "state": "California",
  "city": "San Francisco",
  "location": "Hybrid",
  "experienceLevel": "senior",
  "jobType": "full_time",
  "workType": "permanent",
  "applicationDeadline": "2026-03-01",
  "questions": [
    {
      "question": "What is your preferred work location?",
      "type": "single_choice",
      "options": ["Remote", "Hybrid", "Onsite"],
      "isMandatory": true
    },
    {
      "question": "Are you willing to relocate to San Francisco?",
      "type": "single_choice",
      "options": ["Yes", "No", "Maybe", "Open to discussion"],
      "isMandatory": true
    },
    {
      "question": "What is your notice period?",
      "type": "single_choice",
      "options": ["Immediate", "15 days", "1 month", "2 months", "3 months", "More than 3 months"],
      "isMandatory": true
    },
    {
      "question": "Describe your experience with microservices architecture",
      "type": "text",
      "isMandatory": true
    },
    {
      "question": "Rate your React skills (1-5)",
      "type": "rating",
      "isMandatory": false
    }
  ]
}
```

---

## Available Question Types

| Type | Description | Requires Options |
|------|-------------|------------------|
| `text` | Free-form text input | No |
| `single_choice` | Select one option from a list | Yes (min 2) |
| `multiple_choice` | Select multiple options from a list | Yes (min 2) |
| `yes_no` | Binary yes/no question | No |
| `rating` | Numerical rating (e.g., 1-5) | No |
| `date` | Date selection | No |
| `file_upload` | File attachment | No |

---

## Available Common Option Sets

| Enum | Use Case | Values |
|------|----------|--------|
| `WorkLocationOptions` | Work location preference | Remote, Hybrid, Onsite |
| `YesNoOptions` | Binary questions | Yes, No |
| `RelocationOptions` | Relocation willingness | Yes, No, Maybe, Open to discussion |
| `NoticePeriodOptions` | Notice period | Immediate, 15 days, 1 month, 2 months, 3 months, More than 3 months |
| `AvailabilityOptions` | Start date availability | Immediate, Within 2 weeks, Within 1 month, Within 2 months, Within 3 months |
| `EmploymentStatusOptions` | Current employment status | Employed, Unemployed, Student, Freelancer |
| `WorkAuthorizationOptions` | Work authorization | Citizen, Permanent Resident, Work Visa, Need Sponsorship |
| `ExperienceLevelOptions` | Years of experience | 0-1 years, 1-3 years, 3-5 years, 5-10 years, 10+ years |
| `EducationLevelOptions` | Education level | High School, Associate Degree, Bachelor's Degree, Master's Degree, Doctorate, Other |

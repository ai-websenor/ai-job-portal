import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AlertFrequency {
  INSTANT = 'instant',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

const SEARCH_CRITERIA_DESCRIPTION = `
**JSON stringified** object of job search filters. Must be passed as a string using \`JSON.stringify()\`.

---

### Fields inside searchCriteria (all optional)

| Field | Type | Matched against job | Notes |
|---|---|---|---|
| \`keyword\` | string | Job title (case-insensitive substring) | Maps from search param \`query\` |
| \`location\` | string | Job location / city / state | Maps from search param \`location\` |
| \`city\` | string | Job city | Exact city match |
| \`state\` | string | Job state | Exact state match |
| \`categoryId\` | string (UUID) | Job category ID | Exact UUID match |
| \`jobType\` | string[] | Job type array | At least one value must overlap |
| \`workMode\` | string[] | Job work mode array | At least one value must overlap — merge \`workModes\` + \`locationType\` from search URL |
| \`skills\` | string[] | Job skills array | Use skill **names** (not IDs). At least one skill must match |
| \`salaryMin\` | number | Job salary range | Job's max salary must be ≥ this value |
| \`salaryMax\` | number | Job salary range | Job's min salary must be ≤ this value |

---

### Search URL → searchCriteria Mapping

When saving from the job search page, convert URL params as follows:

| Search URL param | searchCriteria key | Action |
|---|---|---|
| \`query\` | \`keyword\` | Rename |
| \`location\` | \`location\` | Keep |
| \`categoryId\` | \`categoryId\` | Keep |
| \`jobType\` | \`jobType\` | Keep (array) |
| \`workModes\` | \`workMode\` | Rename + merge with \`locationType\` |
| \`locationType\` | \`workMode\` | Merge with \`workModes\`, deduplicate |
| \`salaryMin\` | \`salaryMin\` | Keep (number) |
| \`salaryMax\` | \`salaryMax\` | Keep (number) |
| \`skillIds\` | \`skills\` | Resolve IDs → names first |
| \`company\` | ❌ Drop | Not matched |
| \`companyType\` | ❌ Drop | Not matched |
| \`industry\` | ❌ Drop | Not matched |
| \`department\` | ❌ Drop | Not matched |
| \`experienceLevels\` | ❌ Drop | Not matched |
| \`payRate\` | ❌ Drop | Not matched |
| \`postedWithin\` | ❌ Drop | Time filter only |
| \`sortBy\`, \`page\`, \`limit\` | ❌ Drop | Display only |
`.trim();

export class CreateSavedSearchDto {
  @ApiProperty({
    description: 'User-defined label for this saved search / job alert',
    example: 'Full Stack Jobs · Remote · ₹5L–₹15L',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: SEARCH_CRITERIA_DESCRIPTION,
    example: JSON.stringify({
      keyword: 'React Developer',
      location: 'Bangalore',
      jobType: ['full_time'],
      workMode: ['remote', 'hybrid'],
      skills: ['React', 'TypeScript', 'Node.js'],
      salaryMin: 500000,
      salaryMax: 1500000,
    }),
  })
  @IsString()
  searchCriteria: string;

  @ApiPropertyOptional({
    description: 'Enable or disable job alerts for this saved search. Default: true',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @ApiPropertyOptional({
    description: `How often to send alerts when matching jobs are found.
- \`instant\` — alert fires immediately when a matching job is published
- \`daily\` — digest of matching jobs sent once per day
- \`weekly\` — digest of matching jobs sent once per week`,
    enum: AlertFrequency,
    default: AlertFrequency.DAILY,
    example: AlertFrequency.INSTANT,
  })
  @IsOptional()
  @IsEnum(AlertFrequency)
  alertFrequency?: AlertFrequency;

  @ApiPropertyOptional({
    description: `Comma-separated list of notification channels to use for alerts.
Supported values: \`email\`, \`push\`, \`sms\`
Must also match the user's notification preferences to actually send.`,
    example: 'email,push',
  })
  @IsOptional()
  @IsString()
  alertChannels?: string;
}

export class UpdateSavedSearchDto extends PartialType(CreateSavedSearchDto) {
  @ApiPropertyOptional({
    description: 'Set to false to soft-deactivate this saved search without deleting it',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SavedSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Filter list by active status. Omit to return all.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter list by alert enabled status. Omit to return all.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  alertEnabled?: boolean;
}

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public, Roles, RolesGuard } from '@ai-job-portal/common';
import { SkillService } from './skill.service';
import {
  AddProfileSkillDto,
  BulkAddProfileSkillDto,
  UpdateProfileSkillDto,
  SkillQueryDto,
  AdminSkillQueryDto,
  UpdateMasterSkillDto,
} from './dto';

@ApiTags('Skills')
@Controller()
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  // ==========================================================================
  // PUBLIC ENDPOINT — Master skill suggestions (candidate onboarding)
  // ==========================================================================

  @Get('skills')
  @Public()
  @ApiOperation({
    summary: 'List master skills for suggestions',
    description: `
Returns only **master-typed** active skills for use in candidate onboarding typeahead/autocomplete.

**Key behaviour:**
- Only returns skills with \`type: "master-typed"\` and \`isActive: true\`
- User-typed skills (added by candidates and not yet reviewed) are **excluded**
- Results are ordered alphabetically by name
- Supports search and category filtering

**No authentication required.**
    `.trim(),
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'React',
    description: 'Filter skills by name (case-insensitive)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['technical', 'soft', 'language', 'industry_specific'],
    example: 'technical',
    description: 'Filter by skill category',
  })
  @ApiResponse({
    status: 200,
    description: 'List of master-typed active skills',
    schema: {
      example: {
        data: [
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'React.js',
            type: 'master-typed',
            category: 'technical',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            name: 'Node.js',
            type: 'master-typed',
            category: 'technical',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
            name: 'Communication',
            type: 'master-typed',
            category: 'soft',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  getAllSkills(@Query() query: SkillQueryDto) {
    return this.skillService.getAllSkills(query);
  }

  // ==========================================================================
  // ADMIN ENDPOINTS — Master Skill Management
  // Requires: Bearer token with role admin or super_admin
  // ==========================================================================

  @Get('master-data/skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] List all skills — paginated',
    description: `
Returns a paginated list of **all** active skills, including both types:

| Type | Description |
|---|---|
| \`master-typed\` | Skills created by admin — shown in candidate onboarding suggestions |
| \`user-typed\` | Skills typed by candidates that didn't match any master skill — require admin review |

**Admin use cases:**
- Review user-typed skills and promote them to master-typed
- Search for duplicate or misspelled skills
- Filter by type to focus on user-typed skills awaiting review

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 15,
    description: 'Items per page (default: 15, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'React',
    description: 'Search by skill name',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['master-typed', 'user-typed'],
    example: 'user-typed',
    description: 'Filter by skill type — use "user-typed" to review candidate-added skills',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated skills list with both master-typed and user-typed',
    schema: {
      example: {
        data: [
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'React.js',
            type: 'master-typed',
            category: 'technical',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
            name: 'ReactNative',
            type: 'user-typed',
            category: 'industry_specific',
            isActive: true,
            createdAt: '2026-02-10T08:30:00.000Z',
            updatedAt: '2026-02-10T08:30:00.000Z',
          },
        ],
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
        meta: { total: 350, page: 1, limit: 15, totalPages: 24 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  getAllSkillsAdmin(@Query() query: AdminSkillQueryDto) {
    return this.skillService.getAllSkillsAdmin(query);
  }

  @Post('skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Create a master skill',
    description: `
Creates a new skill with \`type: "master-typed"\`. These skills appear in candidate onboarding suggestions.

**Skill categories:**
| Value | Description |
|---|---|
| \`technical\` | Programming languages, frameworks, tools |
| \`soft\` | Communication, leadership, teamwork |
| \`language\` | Spoken/written languages (Hindi, English, etc.) |
| \`industry_specific\` | Domain skills (Finance, Healthcare, Legal, etc.) |

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiBody({
    description: 'Skill creation payload',
    schema: {
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          example: 'TypeScript',
          description: 'Skill name (trimmed, case-preserved)',
        },
        category: {
          type: 'string',
          enum: ['technical', 'soft', 'language', 'industry_specific'],
          example: 'technical',
          description: 'Skill category (defaults to "industry_specific" if omitted)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Master skill created successfully',
    schema: {
      example: {
        message: 'Skill created successfully',
        data: {
          id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
          name: 'TypeScript',
          type: 'master-typed',
          category: 'technical',
          isActive: true,
          createdAt: '2026-02-19T10:00:00.000Z',
          updatedAt: '2026-02-19T10:00:00.000Z',
        },
        status: 'success',
        statusCode: 201,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createSkill(@Body() dto: { name: string; category?: string }) {
    const skill = await this.skillService.createMasterSkill(dto);
    return { message: 'Skill created successfully', data: skill };
  }

  @Put('skills/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Update a skill',
    description: `
Updates a skill's name, type, or category. All fields are optional.

**Primary admin workflow — promoting a user-typed skill:**
1. Candidate types a skill not in the master list (e.g. "ReactNative") → saved as \`user-typed\`
2. Admin reviews via \`GET /master-data/skills?type=user-typed\`
3. Admin corrects the name (e.g. "React Native") and sets \`type: "master-typed"\` via this endpoint
4. The skill now appears in onboarding suggestions for all future candidates

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the skill to update',
    example: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  })
  @ApiBody({
    description: 'Fields to update (all optional)',
    schema: {
      properties: {
        name: { type: 'string', example: 'React Native', description: 'Corrected skill name' },
        type: {
          type: 'string',
          enum: ['master-typed', 'user-typed'],
          example: 'master-typed',
          description: 'Promote user-typed → master-typed to include in onboarding suggestions',
        },
        category: {
          type: 'string',
          enum: ['technical', 'soft', 'language', 'industry_specific'],
          example: 'technical',
          description: 'Update the skill category',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Skill updated — type changed from user-typed to master-typed',
    schema: {
      example: {
        message: 'Skill updated successfully',
        data: {
          id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
          name: 'React Native',
          type: 'master-typed',
          category: 'technical',
          isActive: true,
          createdAt: '2026-02-10T08:30:00.000Z',
          updatedAt: '2026-02-19T11:00:00.000Z',
        },
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateSkill(@Param('id') id: string, @Body() dto: UpdateMasterSkillDto) {
    const skill = await this.skillService.updateSkill(id, dto);
    return { message: 'Skill updated successfully', data: skill };
  }

  @Delete('skills/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Delete a skill',
    description: `
Deletes a skill from the master list.

**Smart delete logic:**
- If skill is **not linked to any profile** → **hard delete** (permanently removed)
- If skill is **used in one or more profiles** → **soft delete** (sets \`isActive: false\`)
  - The skill is hidden from onboarding suggestions but preserved on existing profiles
  - Returns \`softDeleted: true\` with a count of affected profiles

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the skill to delete',
    example: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  })
  @ApiResponse({
    status: 200,
    description: 'Hard delete — skill was not used by any profile',
    schema: {
      example: {
        data: { success: true, softDeleted: false },
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Soft delete — skill is referenced by one or more profiles',
    schema: {
      example: {
        data: {
          success: true,
          softDeleted: true,
          message:
            'Skill is used by 42 profile(s). It has been deactivated and will no longer appear in suggestions.',
        },
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteSkill(@Param('id') id: string) {
    return this.skillService.deleteSkill(id);
  }

  // ==========================================================================
  // CANDIDATE PROFILE SKILL ENDPOINTS (authenticated candidates)
  // ==========================================================================

  @Post('candidates/skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Add a skill to candidate profile',
    description: `
Adds a skill to the authenticated candidate's profile.

**Auto-creation logic:**
- If \`skillName\` matches an existing skill (case-insensitive) → that skill is linked
- If no match found → a **new skill** is created automatically with \`type: "user-typed"\`
  - These user-typed skills are visible to admin in \`GET /master-data/skills?type=user-typed\` for review

**Requires:** Candidate JWT token
    `.trim(),
  })
  @ApiBody({
    description: 'Skill to add to the profile',
    schema: {
      required: ['skillName'],
      properties: {
        skillName: {
          type: 'string',
          example: 'React.js',
          description:
            'Exact or approximate skill name — matched case-insensitively against master list',
        },
        category: {
          type: 'string',
          enum: ['technical', 'soft', 'language', 'industry_specific'],
          example: 'technical',
          description:
            'Category used only if a new user-typed skill is created (defaults to "industry_specific")',
        },
        proficiencyLevel: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          example: 'advanced',
          description: 'Candidate self-assessed proficiency (defaults to "beginner")',
        },
        yearsOfExperience: {
          type: 'number',
          example: 3,
          description: 'Years of experience with this skill (0–50)',
        },
        displayOrder: {
          type: 'number',
          example: 1,
          description: 'Display order on profile (lower = shown first)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Skill linked to profile — master-typed skill matched',
    schema: {
      example: {
        message: 'Skill added successfully',
        data: {
          id: 'ps-1111-2222-3333-444455556666',
          profileId: 'prof-1234-5678-90ab-cdef12345678',
          skillId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          proficiencyLevel: 'advanced',
          yearsOfExperience: '3',
          displayOrder: 1,
          createdAt: '2026-02-19T10:00:00.000Z',
          skill: {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'React.js',
            type: 'master-typed',
            category: 'technical',
          },
        },
        status: 'success',
        statusCode: 201,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Skill linked to profile — new user-typed skill auto-created',
    schema: {
      example: {
        message: 'Skill added successfully',
        data: {
          id: 'ps-aaaa-bbbb-cccc-ddddeeee1111',
          profileId: 'prof-1234-5678-90ab-cdef12345678',
          skillId: 'd4e5f6a7-b8c9-0123-defa-234567890123',
          proficiencyLevel: 'beginner',
          yearsOfExperience: null,
          displayOrder: 0,
          createdAt: '2026-02-19T10:05:00.000Z',
          skill: {
            id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
            name: 'ReactNative',
            type: 'user-typed',
            category: 'industry_specific',
          },
        },
        status: 'success',
        statusCode: 201,
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Skill already added to this profile' })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async addSkill(@CurrentUser('sub') userId: string, @Body() dto: AddProfileSkillDto) {
    const skill = await this.skillService.addSkill(userId, dto);
    return { message: 'Skill added successfully', data: skill };
  }

  @Post('candidates/skills/bulk')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Bulk add skills to candidate profile',
    description: `
Adds multiple skills to the authenticated candidate's profile in one request.
Applies the same auto-creation logic as the single add endpoint.

**Error handling:**
- Duplicate skills (already on profile) are **silently skipped** (not an error)
- Other errors per skill are collected and returned in \`errors[]\`
- Successfully added skills are returned in \`added[]\`

**Requires:** Candidate JWT token
    `.trim(),
  })
  @ApiBody({
    description: 'Array of skills to add',
    schema: {
      required: ['skills'],
      properties: {
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skillName: { type: 'string', example: 'Node.js' },
              category: {
                type: 'string',
                enum: ['technical', 'soft', 'language', 'industry_specific'],
                example: 'technical',
              },
              proficiencyLevel: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced', 'expert'],
                example: 'intermediate',
              },
              yearsOfExperience: { type: 'number', example: 2 },
              displayOrder: { type: 'number', example: 2 },
            },
          },
          example: [
            {
              skillName: 'Node.js',
              category: 'technical',
              proficiencyLevel: 'intermediate',
              yearsOfExperience: 2,
              displayOrder: 1,
            },
            {
              skillName: 'PostgreSQL',
              category: 'technical',
              proficiencyLevel: 'beginner',
              displayOrder: 2,
            },
            {
              skillName: 'Leadership',
              category: 'soft',
              proficiencyLevel: 'advanced',
              displayOrder: 3,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk add result with successfully added skills and any errors',
    schema: {
      example: {
        message: 'Skills added successfully',
        data: {
          added: [
            {
              id: 'ps-aaa1',
              profileId: 'prof-1234',
              skillId: 'sk-001',
              proficiencyLevel: 'intermediate',
              yearsOfExperience: '2',
              displayOrder: 1,
              skill: { id: 'sk-001', name: 'Node.js', type: 'master-typed', category: 'technical' },
            },
            {
              id: 'ps-aaa2',
              profileId: 'prof-1234',
              skillId: 'sk-002',
              proficiencyLevel: 'beginner',
              yearsOfExperience: null,
              displayOrder: 2,
              skill: {
                id: 'sk-002',
                name: 'PostgreSQL',
                type: 'master-typed',
                category: 'technical',
              },
            },
          ],
          errors: [],
        },
        status: 'success',
        statusCode: 201,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async addSkillsBulk(@CurrentUser('sub') userId: string, @Body() dto: BulkAddProfileSkillDto) {
    const result = await this.skillService.addSkillsBulk(userId, dto);
    return { message: 'Skills added successfully', data: result };
  }

  @Get('candidates/skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get all skills on candidate profile',
    description: `
Returns all skills linked to the authenticated candidate's profile, ordered by \`displayOrder\`.
Each entry includes full skill details (name, type, category).

**Requires:** Candidate JWT token
    `.trim(),
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate profile skills',
    schema: {
      example: {
        data: [
          {
            id: 'ps-1111',
            profileId: 'prof-1234',
            skillId: 'sk-001',
            proficiencyLevel: 'advanced',
            yearsOfExperience: '3',
            displayOrder: 1,
            createdAt: '2026-02-01T00:00:00.000Z',
            skill: { id: 'sk-001', name: 'React.js', type: 'master-typed', category: 'technical' },
          },
          {
            id: 'ps-2222',
            profileId: 'prof-1234',
            skillId: 'sk-002',
            proficiencyLevel: 'intermediate',
            yearsOfExperience: '2',
            displayOrder: 2,
            createdAt: '2026-02-01T00:00:00.000Z',
            skill: { id: 'sk-002', name: 'Node.js', type: 'master-typed', category: 'technical' },
          },
          {
            id: 'ps-3333',
            profileId: 'prof-1234',
            skillId: 'sk-usr-001',
            proficiencyLevel: 'beginner',
            yearsOfExperience: null,
            displayOrder: 3,
            createdAt: '2026-02-10T00:00:00.000Z',
            skill: {
              id: 'sk-usr-001',
              name: 'ReactNative',
              type: 'user-typed',
              category: 'industry_specific',
            },
          },
        ],
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  getProfileSkills(@CurrentUser('sub') userId: string) {
    return this.skillService.getProfileSkills(userId);
  }

  @Put('candidates/skills/:skillId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Update a skill on candidate profile',
    description: `
Updates proficiency level, years of experience, or display order for a skill on the candidate's profile.
All fields are optional — only send what needs to change.

**Requires:** Candidate JWT token
    `.trim(),
  })
  @ApiParam({
    name: 'skillId',
    description: 'UUID of the skill (not the profile_skill join ID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiBody({
    description: 'Profile skill fields to update (all optional)',
    schema: {
      properties: {
        proficiencyLevel: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          example: 'expert',
        },
        yearsOfExperience: { type: 'number', example: 5, description: '0–50' },
        displayOrder: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile skill updated',
    schema: {
      example: {
        data: {
          id: 'ps-1111',
          profileId: 'prof-1234',
          skillId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          proficiencyLevel: 'expert',
          yearsOfExperience: '5',
          displayOrder: 1,
          skill: {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'React.js',
            type: 'master-typed',
            category: 'technical',
          },
        },
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Skill not found on profile' })
  updateProfileSkill(
    @CurrentUser('sub') userId: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateProfileSkillDto,
  ) {
    return this.skillService.updateProfileSkill(userId, skillId, dto);
  }

  @Delete('candidates/skills/:skillId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Remove a skill from candidate profile',
    description: `
Removes a skill from the authenticated candidate's profile.
The skill record itself (in the master list) is **not** deleted — only the profile association is removed.

**Requires:** Candidate JWT token
    `.trim(),
  })
  @ApiParam({
    name: 'skillId',
    description: 'UUID of the skill to remove',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Skill removed from profile',
    schema: {
      example: {
        data: { success: true },
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Skill not found on profile' })
  removeSkill(@CurrentUser('sub') userId: string, @Param('skillId') skillId: string) {
    return this.skillService.removeSkill(userId, skillId);
  }
}

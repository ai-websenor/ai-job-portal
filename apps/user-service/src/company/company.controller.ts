import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_employer')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get company profile',
    description: `Get the company profile for the authenticated super_employer.
      Sensitive fields (PAN, GST, CIN) are masked for security.`,
  })
  @ApiResponse({ status: 200, description: 'Company profile retrieved successfully' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'Employer profile or company not found' })
  async getCompanyProfile(@CurrentUser('sub') userId: string) {
    const company = await this.companyService.getCompanyProfile(userId);
    return { message: 'Company profile fetched successfully', data: company };
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update company profile',
    description: `Update the company profile for the authenticated super_employer.

      **Allowed fields:**
      - name, industry, companySize, companyType, yearEstablished
      - website, description, mission, culture, benefits, tagline
      - headquarters, employeeCount, social media URLs
      - bannerUrl, isActive

      **Restricted fields (cannot be edited):**
      - panNumber, gstNumber, cinNumber (business registration numbers)
      - logoUrl (use dedicated logo upload endpoint)
      - verificationDocuments, kycDocuments (managed by super_admin)
      - isVerified, verificationStatus (managed by super_admin)`,
  })
  @ApiResponse({ status: 200, description: 'Company profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'Employer profile or company not found' })
  async updateCompanyProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateCompanyDto) {
    const company = await this.companyService.updateCompanyProfile(userId, dto);
    return { message: 'Company profile updated successfully', data: company };
  }
}

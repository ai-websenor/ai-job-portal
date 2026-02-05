import { Controller, Get, Put, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { CareerPageService } from './career-page.service';
import { UpdateCareerPageDto } from './dto';

@ApiTags('career-pages')
@Controller('companies/:companyId/career-page')
export class CareerPageController {
  constructor(private readonly careerPageService: CareerPageService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get company career page' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Career page retrieved' })
  getCareerPage(@Param('companyId') companyId: string) {
    return this.careerPageService.getCareerPage(companyId);
  }

  @Put()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create or update career page' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Career page saved' })
  createOrUpdate(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCareerPageDto,
  ) {
    return this.careerPageService.createOrUpdate(userId, companyId, dto);
  }

  @Post('publish')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Publish career page' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Career page published' })
  publish(@CurrentUser('sub') userId: string, @Param('companyId') companyId: string) {
    return this.careerPageService.publish(userId, companyId);
  }

  @Post('unpublish')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unpublish career page' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Career page unpublished' })
  unpublish(@CurrentUser('sub') userId: string, @Param('companyId') companyId: string) {
    return this.careerPageService.unpublish(userId, companyId);
  }
}

@ApiTags('career-pages')
@Controller('careers')
export class PublicCareerPageController {
  constructor(private readonly careerPageService: CareerPageService) {}

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get public career page by slug' })
  @ApiParam({ name: 'slug', description: 'Career page slug' })
  @ApiResponse({ status: 200, description: 'Career page retrieved' })
  getBySlug(@Param('slug') slug: string) {
    return this.careerPageService.getCareerPageBySlug(slug);
  }
}

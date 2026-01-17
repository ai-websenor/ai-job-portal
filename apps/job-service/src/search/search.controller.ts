/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Query, Req } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JobSearchQueryDto } from './dto/job-search.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search jobs' })
  @ApiResponse({ status: 200, description: 'Return search results.' })
  searchHttp(@Query() query: JobSearchQueryDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.searchService.search(query, userId);
  }

  @GrpcMethod('JobService', 'SearchJobs')
  search(data: any) {
    return this.searchService.search(data);
  }
}

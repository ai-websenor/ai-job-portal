import { Controller, Get, Query } from '@nestjs/common';
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
  searchHttp(@Query() query: JobSearchQueryDto) {
    return this.searchService.search(query);
  }

  @GrpcMethod('JobService', 'SearchJobs')
  search(data: any) {
    return this.searchService.search(data);
  }
}

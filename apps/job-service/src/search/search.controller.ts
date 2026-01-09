import { Controller, Get, Query } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search jobs' })
  @ApiResponse({ status: 200, description: 'Return search results.' })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search term for title or description',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'skills',
    required: false,
    isArray: true,
    type: String,
    description: 'Filter by skills',
  })
  searchHttp(
    @Query() query: { query?: string; location?: string; skills?: string[] },
  ) {
    return this.searchService.search(query);
  }

  @GrpcMethod('JobService', 'SearchJobs')
  search(data: any) {
    return this.searchService.search(data);
  }
}

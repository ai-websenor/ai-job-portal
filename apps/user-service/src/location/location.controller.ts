import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '@ai-job-portal/common';
import { LocationService } from './location.service';
import { AutocompleteQueryDto, ReverseGeocodeQueryDto } from './dto';

@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('autocomplete')
  @Public()
  @ApiOperation({
    summary: 'Autocomplete location search',
    description:
      'Returns location suggestions from Google Places API. Used for type-ahead in location inputs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Location suggestions',
    schema: {
      example: {
        data: [
          {
            placeId: 'ChIJbU60yXAWrjsR4E9-UejD3_g',
            description: 'Bangalore, Karnataka, India',
            mainText: 'Bangalore',
            secondaryText: 'Karnataka, India',
          },
        ],
      },
    },
  })
  async autocomplete(@Query() query: AutocompleteQueryDto) {
    const results = await this.locationService.autocomplete(
      query.input,
      query.types,
      query.language,
    );
    return { data: results };
  }

  @Get('reverse-geocode')
  @Public()
  @ApiOperation({
    summary: 'Reverse geocode coordinates to structured location',
    description:
      'Converts lat/lng coordinates to city, state, country. Used for browser geolocation auto-fill during candidate onboarding.',
  })
  @ApiResponse({
    status: 200,
    description: 'Structured location from coordinates',
    schema: {
      example: {
        data: {
          placeId: 'ChIJbU60yXAWrjsR4E9-UejD3_g',
          formattedAddress: 'Bengaluru, Karnataka, India',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          lat: 12.972,
          lng: 77.595,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Location not found for coordinates' })
  async reverseGeocode(@Query() query: ReverseGeocodeQueryDto) {
    const result = await this.locationService.reverseGeocode(query.lat, query.lng);
    return { data: result };
  }

  @Get('details/:placeId')
  @Public()
  @ApiOperation({
    summary: 'Get structured location details from Place ID',
    description:
      'Returns city, state, country from a Google Place ID. Used after selecting an autocomplete suggestion.',
  })
  @ApiParam({ name: 'placeId', description: 'Google Place ID from autocomplete results' })
  @ApiResponse({
    status: 200,
    description: 'Structured location details',
    schema: {
      example: {
        data: {
          placeId: 'ChIJbU60yXAWrjsR4E9-UejD3_g',
          formattedAddress: 'Bengaluru, Karnataka, India',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          lat: 12.9715987,
          lng: 77.5945627,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async getDetails(@Param('placeId') placeId: string) {
    const result = await this.locationService.getPlaceDetails(placeId);
    return { data: result };
  }
}

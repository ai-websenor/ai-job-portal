import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { PlacesService, AutocompleteResult, LocationDetails } from '@ai-job-portal/google';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly AUTOCOMPLETE_TTL = 3600; // 1 hour
  private readonly DETAILS_TTL = 86400; // 24 hours
  private readonly REVERSE_GEOCODE_TTL = 86400; // 24 hours

  constructor(
    private readonly placesService: PlacesService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async autocomplete(
    input: string,
    types?: string,
    language?: string,
  ): Promise<AutocompleteResult[]> {
    const effectiveTypes = types || '(cities)';
    const cacheKey = `location:autocomplete:${input.toLowerCase()}:${effectiveTypes}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err: any) {
      this.logger.warn(`Redis read failed for autocomplete cache: ${err.message}`);
    }

    const results = await this.placesService.autocomplete(input, effectiveTypes, language);

    try {
      await this.redis.setex(cacheKey, this.AUTOCOMPLETE_TTL, JSON.stringify(results));
    } catch (err: any) {
      this.logger.warn(`Redis write failed for autocomplete cache: ${err.message}`);
    }

    return results;
  }

  async getPlaceDetails(placeId: string): Promise<LocationDetails> {
    const cacheKey = `location:details:${placeId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err: any) {
      this.logger.warn(`Redis read failed for place details cache: ${err.message}`);
    }

    const result = await this.placesService.getPlaceDetails(placeId);
    if (!result) {
      throw new NotFoundException('Place not found');
    }

    try {
      await this.redis.setex(cacheKey, this.DETAILS_TTL, JSON.stringify(result));
    } catch (err: any) {
      this.logger.warn(`Redis write failed for place details cache: ${err.message}`);
    }

    return result;
  }

  async reverseGeocode(lat: number, lng: number): Promise<LocationDetails> {
    // Round to 3 decimal places (~111m precision) for cache key stability
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    const cacheKey = `location:reverse:${roundedLat}:${roundedLng}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err: any) {
      this.logger.warn(`Redis read failed for reverse geocode cache: ${err.message}`);
    }

    const result = await this.placesService.reverseGeocode(lat, lng);
    if (!result) {
      throw new NotFoundException('Location not found for the given coordinates');
    }

    try {
      await this.redis.setex(cacheKey, this.REVERSE_GEOCODE_TTL, JSON.stringify(result));
    } catch (err: any) {
      this.logger.warn(`Redis write failed for reverse geocode cache: ${err.message}`);
    }

    return result;
  }
}

import { Injectable, Inject, Logger } from '@nestjs/common';
import axios from 'axios';
import { GOOGLE_CONFIG, GoogleConfig } from './google.config';

export interface AutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface LocationDetails {
  placeId: string;
  formattedAddress: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(@Inject(GOOGLE_CONFIG) private readonly config: GoogleConfig) {}

  async autocomplete(
    input: string,
    types: string = '(cities)',
    language: string = 'en',
  ): Promise<AutocompleteResult[]> {
    const url = `${this.baseUrl}/place/autocomplete/json`;

    try {
      const response = await axios.get(url, {
        params: {
          input,
          types,
          language,
          key: this.config.apiKey,
        },
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        this.logger.warn(
          `Places Autocomplete error: ${response.data.status} - ${response.data.error_message || ''}`,
        );
        return [];
      }

      return (response.data.predictions || []).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text || '',
        secondaryText: p.structured_formatting?.secondary_text || '',
      }));
    } catch (error: any) {
      this.logger.error(`Places Autocomplete request failed: ${error.message}`);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<LocationDetails | null> {
    const url = `${this.baseUrl}/place/details/json`;

    try {
      const response = await axios.get(url, {
        params: {
          place_id: placeId,
          fields: 'address_components,formatted_address,geometry',
          key: this.config.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        this.logger.warn(
          `Place Details error: ${response.data.status} - ${response.data.error_message || ''}`,
        );
        return null;
      }

      return this.parseAddressComponents(
        placeId,
        response.data.result.address_components,
        response.data.result.formatted_address,
        response.data.result.geometry?.location,
      );
    } catch (error: any) {
      this.logger.error(`Place Details request failed: ${error.message}`);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<LocationDetails | null> {
    const url = `${this.baseUrl}/geocode/json`;

    try {
      const response = await axios.get(url, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.config.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results?.length) {
        this.logger.warn(
          `Reverse Geocode error: ${response.data.status} - ${response.data.error_message || ''}`,
        );
        return null;
      }

      const result = response.data.results[0];
      return this.parseAddressComponents(
        result.place_id,
        result.address_components,
        result.formatted_address,
        result.geometry?.location,
      );
    } catch (error: any) {
      this.logger.error(`Reverse Geocode request failed: ${error.message}`);
      return null;
    }
  }

  private parseAddressComponents(
    placeId: string,
    components: any[],
    formattedAddress: string,
    location: { lat: number; lng: number } | undefined,
  ): LocationDetails {
    const get = (type: string): string | null =>
      components?.find((c: any) => c.types.includes(type))?.long_name || null;

    return {
      placeId,
      formattedAddress: formattedAddress || '',
      city: get('locality') || get('administrative_area_level_2'),
      state: get('administrative_area_level_1'),
      country: get('country'),
      lat: location?.lat || 0,
      lng: location?.lng || 0,
    };
  }
}

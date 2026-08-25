import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { DeliveryRoute, DeliveryRouteProvider } from './delivery-pricing.js';

type GeocodeResponse = {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    partial_match?: boolean;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
};

type RoutesResponse = {
  routes?: Array<{ distanceMeters?: number }>;
};

type GeocodedAddress = {
  coordinates: { latitude: number; longitude: number };
  formattedAddress: string;
};

export class GoogleMapsDeliveryGateway implements DeliveryRouteProvider {
  constructor(private readonly apiKey: string) {}

  async route(input: { origin: string; destination: string }): Promise<DeliveryRoute> {
    const [origin, destination] = await Promise.all([
      this.geocode(input.origin),
      this.geocode(input.destination)
    ]);
    let response: Response;
    try {
      response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters'
        },
        body: JSON.stringify({
          origin: { location: { latLng: origin.coordinates } },
          destination: { location: { latLng: destination.coordinates } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE'
        }),
        signal: AbortSignal.timeout(8_000)
      });
    } catch {
      throw new ServiceUnavailableException(
        'O serviço de rotas está temporariamente indisponível.'
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Não foi possível calcular a rota da entrega.');
    }
    const payload = (await response.json()) as RoutesResponse;
    const distanceMeters = payload.routes?.[0]?.distanceMeters;
    if (!Number.isSafeInteger(distanceMeters) || (distanceMeters ?? -1) < 0) {
      throw new ServiceUnavailableException('Não foi possível calcular a rota da entrega.');
    }
    return {
      distanceMeters: distanceMeters!,
      provider: 'GOOGLE_MAPS',
      normalizedDestination: destination.formattedAddress
    };
  }

  private async geocode(address: string): Promise<GeocodedAddress> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('region', 'br');
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    } catch {
      throw new ServiceUnavailableException(
        'O serviço de localização está temporariamente indisponível.'
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Não foi possível localizar o endereço informado.');
    }
    const payload = (await response.json()) as GeocodeResponse;
    if (payload.status === 'ZERO_RESULTS' || !payload.results?.length) {
      throw new BadRequestException({
        code: 'INVALID_DELIVERY_ADDRESS',
        message: 'Não foi possível localizar o endereço informado.'
      });
    }
    if (payload.results.length !== 1 || payload.results[0]?.partial_match) {
      throw new BadRequestException({
        code: 'AMBIGUOUS_DELIVERY_ADDRESS',
        message: 'O endereço informado é ambíguo. Revise CEP, rua, número, bairro, cidade e UF.'
      });
    }
    const result = payload.results[0];
    const location = result?.geometry?.location;
    if (
      payload.status !== 'OK' ||
      !location ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lng)
    ) {
      throw new ServiceUnavailableException('Não foi possível localizar o endereço informado.');
    }
    return {
      coordinates: { latitude: location.lat!, longitude: location.lng! },
      formattedAddress: result?.formatted_address?.trim() || address
    };
  }
}

export function configuredDeliveryRouteProvider(): DeliveryRouteProvider {
  const provider = (process.env.VERO_MAPS_PROVIDER || 'GOOGLE').trim().toUpperCase();
  if (provider !== 'GOOGLE') {
    throw new ServiceUnavailableException('O provedor de cálculo de entrega não está configurado.');
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    throw new ServiceUnavailableException(
      'O cálculo automático de entrega ainda não está configurado.'
    );
  }
  return new GoogleMapsDeliveryGateway(apiKey);
}

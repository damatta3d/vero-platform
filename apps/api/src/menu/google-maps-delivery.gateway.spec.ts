import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { GoogleMapsDeliveryGateway } from './google-maps-delivery.gateway.js';

describe('GoogleMapsDeliveryGateway', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects an address that was not found instead of guessing coordinates', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ZERO_RESULTS', results: [] })
    } as Response);
    await expect(
      new GoogleMapsDeliveryGateway('fake').route({
        origin: 'Rua da Loja, 1',
        destination: 'Endereço inexistente'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects ambiguous partial geocoding results', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'OK',
          results: [
            {
              partial_match: true,
              geometry: { location: { lat: -20.4, lng: -54.6 } }
            }
          ]
        })
    } as Response);
    await expect(
      new GoogleMapsDeliveryGateway('fake').route({
        origin: 'Rua da Loja, 1',
        destination: 'Rua incompleta'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps network failures to a stable service-unavailable response', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    await expect(
      new GoogleMapsDeliveryGateway('fake').route({
        origin: 'Rua da Loja, 1',
        destination: 'Rua Cliente, 10'
      })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

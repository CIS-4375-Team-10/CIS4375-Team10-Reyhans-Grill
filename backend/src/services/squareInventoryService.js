import { squareClient, squareLocationId } from '../config/squareClient.js';

export async function listSquareLocations() {
  const { result } = await squareClient.locationsApi.listLocations();
  return result.locations ?? [];
}

export async function listCatalogItems({ cursor } = {}) {
  const { result } = await squareClient.catalogApi.listCatalog(cursor, 'ITEM');
  return {
    items: result.objects ?? [],
    cursor: result.cursor,
  };
}

export async function fetchInventoryCounts(locationId = squareLocationId) {
  if (!locationId) {
    throw new Error(
      'No Square location configured. Set SQUARE_LOCATION_ID in your environment.',
    );
  }

  const { result } = await squareClient.inventoryApi.batchRetrieveInventoryCounts(
    {
      locationIds: [locationId],
      states: ['IN_STOCK', 'RESERVED'],
    },
  );

  return result.counts ?? [];
}

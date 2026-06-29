/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Address -> coordinates lookup using the free, key-less Japan address geocoder published by
 * GSI (国土地理院 / Geospatial Information Authority of Japan). It only covers Japanese
 * addresses, which fits this app, and is published as open government data so commercial use
 * is fine. This gives staff an alternative to typing/dragging raw lat/lng, which is where the
 * small coordinate drift reported by the user was coming from.
 */

const GSI_ENDPOINT = 'https://msearch.gsi.go.jp/address-search/AddressSearch';

interface GsiResult {
  geometry: { coordinates: [number, number] };
  properties: { title: string };
}

export interface GeocodeResult {
  title: string;
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult[]> {
  const url = `${GSI_ENDPOINT}?q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`GSI geocoding API returned status ${res.status}`);
  }
  const data = await res.json() as GsiResult[];
  return data.slice(0, 5).map((item) => ({
    title: item.properties.title,
    longitude: item.geometry.coordinates[0],
    latitude: item.geometry.coordinates[1],
  }));
}

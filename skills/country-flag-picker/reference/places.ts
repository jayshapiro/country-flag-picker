// States/provinces and cities per country, loaded on demand from /places/<cc>.json
// (copy reference/places/ into the app's public/ folder). Generated from GeoNames (CC BY 4.0)
// by scripts/generate-places.mjs: every first-level division, and cities with population > 15,000.

import { useQuery } from "@tanstack/react-query";

/** [GeoNames admin1 code, name] and [city name, admin1 code or ""], both sorted by name. */
export type Places = { regions: [string, string][]; cities: [string, string][] };

/** Fetches one country's file the first time that country is chosen; cached after. null = no data. */
export function usePlaces(countryCode: string | null | undefined) {
  return useQuery<Places | null>({
    queryKey: ["places", countryCode],
    enabled: !!countryCode,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const r = await fetch(`/places/${countryCode!.toLowerCase()}.json`);
      return r.ok ? r.json() : null; // 404 = a territory with no GeoNames cities (e.g. AQ)
    },
  });
}

// Words that differ between sources for the same division ("Nairobi County" vs "Nairobi Area").
const DIVISION_WORDS =
  /\b(county|province|provincia|state|estado|region|regional|area|governorate|prefecture|department|departamento|district|oblast|municipality|voivodeship|canton|of|the)\b/g;

/** Lowercase, accents stripped, generic division words and punctuation removed. */
export function normalizePlaceName(name: string): string {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(DIVISION_WORDS, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Finds the list entry for a region name from another source (e.g. Cloudflare's `region`).
 * Matches by name because GeoNames codes are mostly FIPS while Cloudflare uses ISO 3166-2.
 * Returns undefined rather than guessing when nothing matches cleanly.
 */
export function findRegion(places: Places | null | undefined, name: string | null | undefined) {
  if (!places || !name) return undefined;
  const target = normalizePlaceName(name);
  if (!target) return undefined;
  const exact = places.regions.filter(([, n]) => normalizePlaceName(n) === target);
  return exact.length === 1 ? exact[0] : undefined;
}

/** City names for a region (by region name), or for the whole country when no region is chosen. */
export function cityNames(places: Places | null | undefined, regionName?: string | null): string[] {
  if (!places) return [];
  const code = regionName ? places.regions.find(([, n]) => n === regionName)?.[0] : undefined;
  const list = code ? places.cities.filter(([, r]) => r === code) : places.cities;
  return [...new Set(list.map(([n]) => n))];
}

/** Region names, in list order. */
export function regionNames(places: Places | null | undefined): string[] {
  return places ? places.regions.map(([, n]) => n) : [];
}

const REST_COUNTRIES = 'https://restcountries.com/v3.1';

export async function fetchCountryByCode(code) {
  if (!code) return null;
  const res = await fetch(`${REST_COUNTRIES}/alpha/${code}`);
  if (!res.ok) throw new Error(`Failed to fetch country ${code}`);
  const [data] = await res.json();
  return normalizeCountry(data);
}

export async function searchCountriesByName(query) {
  if (!query) return [];
  const res = await fetch(`${REST_COUNTRIES}/name/${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(normalizeCountry);
}

function normalizeCountry(raw) {
  if (!raw) return null;
  return {
    code: raw.cca3 || raw.alpha3Code || raw.cioc,
    name: raw.name?.common || raw.name?.official || '',
    capital: raw.capital?.[0],
    region: raw.region,
    subregion: raw.subregion,
    population: raw.population,
    flag: raw.flags?.svg || raw.flags?.png,
    borders: raw.borders || [],
  };
}

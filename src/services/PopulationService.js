const WORLD_BANK = 'https://api.worldbank.org/v2/country';

export async function fetchPopulation(code, year = 'latest') {
  if (!code) return null;
  const targetYear = year === 'latest' ? 'last' : year;
  const res = await fetch(`${WORLD_BANK}/${code}/indicator/SP.POP.TOTL?format=json&per_page=1&date=${targetYear}`);
  if (!res.ok) return null;
  const data = await res.json();
  const entry = Array.isArray(data?.[1]) ? data[1][0] : null;
  if (!entry?.value) return null;
  return { value: entry.value, year: entry.date };
}

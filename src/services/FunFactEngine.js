const fallbackFacts = [
  'This country features diverse landscapes and cultures.',
  'Known for its vibrant traditions and history.',
  'Home to unique wildlife and ecosystems.',
];

export function pickFact(country, facts = fallbackFacts) {
  const pool = [...facts];
  if (country?.name) {
    pool.push(`${country.name} has a story waiting to be told.`);
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

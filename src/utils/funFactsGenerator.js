/**
 * Fun Facts Generation and Management
 * 
 * Fetches Wikipedia summaries and combines with local facts
 * Caches data to prevent repeated API calls
 */

/**
 * Get cache key for Wikipedia data
 * @param {string} countryName - Country name
 * @returns {string} Cache key
 */
function getCacheKey(countryName) {
  return `wiki_facts_${countryName.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Split text into sentences intelligently
 * @param {string} text - Text to split
 * @returns {string[]} Array of sentences
 */
function splitIntoSentences(text) {
  if (!text) return [];
  
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter out very short fragments
}

/**
 * Fetch Wikipedia summary for a country
 * Uses localStorage for caching
 * 
 * @param {string} countryName - Country name
 * @returns {Promise<string[]|null>} Array of sentences or null
 */
export async function fetchWikipediaSummary(countryName) {
  if (!countryName) return null;

  // Check cache first
  const cacheKey = getCacheKey(countryName);
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse cached Wikipedia data', e);
    }
  }

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(countryName)}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data.extract) return null;
    
    // Split into sentences and cache
    const sentences = splitIntoSentences(data.extract);
    
    if (sentences.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(sentences));
      return sentences;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Wikipedia summary:', error);
    return null;
  }
}

/**
 * Get a random fact from combined sources
 * @param {string[]} wikipediaFacts - Wikipedia sentences
 * @param {string[]} localFacts - Local cultural/food facts
 * @returns {string} Random fact
 */
export function getRandomFact(wikipediaFacts = [], localFacts = []) {
  const allFacts = [...(wikipediaFacts || []), ...(localFacts || [])];
  
  if (allFacts.length === 0) {
    return 'A fascinating country with rich culture and history.';
  }
  
  return allFacts[Math.floor(Math.random() * allFacts.length)];
}

/**
 * Get all available facts
 * @param {string[]} wikipediaFacts - Wikipedia sentences
 * @param {string[]} localFacts - Local cultural/food facts
 * @returns {string[]} All facts
 */
export function getAllFacts(wikipediaFacts = [], localFacts = []) {
  return [...(wikipediaFacts || []), ...(localFacts || [])];
}

/**
 * Population Formatting and World Bank API Utilities
 * 
 * Handles population data with two sources:
 * 1. REST Countries (default, fast, estimated)
 * 2. World Bank (accurate, on-demand only)
 */

/**
 * Format number with commas for readability
 * @param {number} num - Population number
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (!num || isNaN(num)) return 'N/A';
  return num.toLocaleString();
}

/**
 * Get cache key for World Bank data
 * @param {string} cca2 - ISO 2-letter country code
 * @returns {string} Cache key
 */
function getCacheKey(cca2) {
  return `worldbank_pop_${cca2}`;
}

/**
 * Fetch accurate population from World Bank API
 * Uses localStorage for caching to avoid repeated API calls
 * 
 * @param {string} cca2 - ISO 2-letter country code
 * @returns {Promise<{population: number, year: number}|null>}
 */
export async function fetchWorldBankPopulation(cca2) {
  if (!cca2) return null;

  // Check cache first
  const cacheKey = getCacheKey(cca2);
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse cached World Bank data', e);
    }
  }

  try {
    const response = await fetch(
      `https://api.worldbank.org/v2/country/${cca2}/indicator/SP.POP.TOTL?format=json`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // World Bank API returns [metadata, data]
    if (!Array.isArray(data) || data.length < 2 || !data[1]) return null;
    
    // Find most recent non-null value
    for (const entry of data[1]) {
      if (entry && entry.value) {
        const result = {
          population: Math.round(entry.value),
          year: parseInt(entry.date, 10)
        };
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching World Bank population:', error);
    return null;
  }
}

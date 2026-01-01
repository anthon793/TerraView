/**
 * Capital Service
 * 
 * Manages capital city data for all countries.
 * Fetches once at startup and caches for performance.
 * 
 * Why capitals are arrays:
 * - Some countries have multiple official capitals (e.g., South Africa: Pretoria, Cape Town, Bloemfontein)
 * - REST Countries API returns capital as an array to handle this
 * 
 * Why caching is used:
 * - 190+ countries means many API calls if done on-demand
 * - Capitals rarely change, perfect for one-time fetch
 * - Instant lookup without network delay
 */

// In-memory cache: Map<cca2Code, normalizedCapital>
const capitalCache = new Map();
let isLoaded = false;
let loadPromise = null;

/**
 * Normalize capital data from API response
 * @param {Array} capitalArray - Capital array from REST Countries API
 * @returns {string} - Normalized capital string
 */
function normalizeCapital(capitalArray) {
  // Handle missing or empty capital array
  if (!capitalArray || !Array.isArray(capitalArray) || capitalArray.length === 0) {
    return 'N/A';
  }
  
  // Filter out empty strings and join multiple capitals with comma
  const validCapitals = capitalArray.filter(cap => cap && cap.trim());
  
  if (validCapitals.length === 0) {
    return 'N/A';
  }
  
  // Join multiple capitals (e.g., "Pretoria, Cape Town, Bloemfontein")
  return validCapitals.join(', ');
}

/**
 * Load all capital data from REST Countries API
 * Fetches once and caches for the entire session
 * @returns {Promise<Map>} - Returns the populated capital cache
 */
export async function loadCapitalData() {
  // If already loaded, return cached data
  if (isLoaded) {
    return capitalCache;
  }
  
  // If currently loading, return the existing promise
  if (loadPromise) {
    return loadPromise;
  }
  
  // Start loading
  loadPromise = (async () => {
    try {
      console.log('📍 Loading capital data from REST Countries API...');
      
      const response = await fetch(
        'https://restcountries.com/v3.1/all?fields=name,cca2,capital',
        {
          headers: { 'Accept': 'application/json' },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const countries = await response.json();
      
      // Populate cache
      countries.forEach(country => {
        if (country.cca2) {
          const normalizedCapital = normalizeCapital(country.capital);
          capitalCache.set(country.cca2.toUpperCase(), normalizedCapital);
        }
      });
      
      isLoaded = true;
      console.log(`✅ Loaded ${capitalCache.size} country capitals`);
      
      return capitalCache;
    } catch (error) {
      console.error('❌ Failed to load capital data:', error);
      // Don't mark as loaded so it can retry later
      loadPromise = null;
      throw error;
    }
  })();
  
  return loadPromise;
}

/**
 * Get capital for a specific country
 * Returns cached data instantly (no network call)
 * @param {string} cca2Code - ISO 3166-1 alpha-2 country code (e.g., 'US', 'FR')
 * @returns {string} - Capital city name or 'Unknown' if not found
 */
export function getCapital(cca2Code) {
  if (!cca2Code) {
    return 'Unknown';
  }
  
  const code = cca2Code.toUpperCase();
  
  // Return from cache if available
  if (capitalCache.has(code)) {
    return capitalCache.get(code);
  }
  
  // Fallback if data not loaded yet or country not found
  return 'Unknown';
}

/**
 * Check if capital data is loaded
 * @returns {boolean}
 */
export function isCapitalDataLoaded() {
  return isLoaded;
}

/**
 * Get cache statistics (for debugging)
 * @returns {Object}
 */
export function getCapitalCacheStats() {
  return {
    isLoaded,
    cacheSize: capitalCache.size,
    hasPendingLoad: loadPromise !== null,
  };
}

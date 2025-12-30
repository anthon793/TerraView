/**
 * Country Name Matcher Utility
 * 
 * Matches GeoJSON country names with REST Countries API country names.
 * Handles common mismatches like "United States" vs "United States of America"
 * 
 * Why this approach:
 * - GeoJSON and REST Countries API use different naming conventions
 * - Need to handle variations, abbreviations, and alternative names
 * - Provides fallback matching strategies for better accuracy
 */

// Common country name mappings for mismatches
const COUNTRY_NAME_MAP = {
  'United States': 'United States of America',
  'United States of America': 'United States of America',
  'USA': 'United States of America',
  'US': 'United States of America',
  'Russia': 'Russian Federation',
  'Russian Federation': 'Russian Federation',
  'UK': 'United Kingdom',
  'United Kingdom': 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'South Korea': 'Korea, Republic of',
  'North Korea': "Korea, Democratic People's Republic of",
  'Czech Republic': 'Czechia',
  'Czechia': 'Czechia',
  'Myanmar': 'Myanmar',
  'Burma': 'Myanmar',
  'Ivory Coast': "Côte d'Ivoire",
  "Côte d'Ivoire": "Côte d'Ivoire",
  'East Timor': 'Timor-Leste',
  'Timor-Leste': 'Timor-Leste',
  'Macedonia': 'North Macedonia',
  'North Macedonia': 'North Macedonia',
  'Swaziland': 'Eswatini',
  'Eswatini': 'Eswatini',
};

/**
 * Normalize country name for matching
 * Removes special characters, converts to lowercase, trims whitespace
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Find matching country in API data
 * @param {string} geoJsonName - Country name from GeoJSON
 * @param {Array} apiCountries - Array of countries from REST Countries API
 * @returns {Object|null} - Matching country object or null
 */
export function matchCountryName(geoJsonName, apiCountries) {
  if (!geoJsonName || !apiCountries || apiCountries.length === 0) {
    return null;
  }

  // First, try direct mapping
  const mappedName = COUNTRY_NAME_MAP[geoJsonName];
  if (mappedName) {
    const directMatch = apiCountries.find(
      country => country.name.common === mappedName || country.name.official === mappedName
    );
    if (directMatch) return directMatch;
  }

  // Try exact match (case-insensitive)
  const exactMatch = apiCountries.find(
    country =>
      country.name.common.toLowerCase() === geoJsonName.toLowerCase() ||
      country.name.official.toLowerCase() === geoJsonName.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Try normalized match
  const normalizedGeoName = normalizeName(geoJsonName);
  const normalizedMatch = apiCountries.find(country => {
    const normalizedCommon = normalizeName(country.name.common);
    const normalizedOfficial = normalizeName(country.name.official);
    return normalizedCommon === normalizedGeoName || normalizedOfficial === normalizedGeoName;
  });
  if (normalizedMatch) return normalizedMatch;

  // Try partial match (GeoJSON name contains API name or vice versa)
  const partialMatch = apiCountries.find(country => {
    const commonName = country.name.common.toLowerCase();
    const officialName = country.name.official.toLowerCase();
    const geoName = geoJsonName.toLowerCase();
    
    return (
      commonName.includes(geoName) ||
      geoName.includes(commonName) ||
      officialName.includes(geoName) ||
      geoName.includes(officialName)
    );
  });
  if (partialMatch) return partialMatch;

  // Try matching with alternative names
  const altNameMatch = apiCountries.find(country => {
    if (!country.altSpellings) return false;
    return country.altSpellings.some(
      alt => normalizeName(alt) === normalizedGeoName
    );
  });
  if (altNameMatch) return altNameMatch;

  return null;
}

/**
 * Get country data from REST Countries API
 * @param {string} countryName - Country name to search for
 * @returns {Promise<Object|null>} - Country data or null if not found
 */

// Cache for all countries data
let allCountriesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export async function fetchCountryData(countryName) {
  try {
    // Check cache first
    const now = Date.now();
    if (allCountriesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      const matchedCountry = matchCountryName(countryName, allCountriesCache);
      return matchedCountry;
    }

    // Fetch with retry logic
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,area,flags,languages,currencies,region,subregion,population,cca2,cca3', {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const allCountries = await response.json();
        
        // Update cache
        allCountriesCache = allCountries;
        cacheTimestamp = Date.now();
        
        const matchedCountry = matchCountryName(countryName, allCountries);
        return matchedCountry;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1} failed:`, error.message);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Error fetching country data after retries:', error);
    return null;
  }
}



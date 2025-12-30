/**
 * Custom Hook: useCountryPopulation
 * 
 * Manages population data from two sources:
 * 1. REST Countries (default, immediate)
 * 2. World Bank (accurate, on-demand only)
 */

import { useState, useCallback, useEffect } from 'react';
import { formatNumber, fetchWorldBankPopulation } from '../utils/populationFormatter';

// Cache World Bank data by country code to avoid refetching
const worldBankCache = new Map();

export function useCountryPopulation(countryData) {
  const [worldBankData, setWorldBankData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when country changes
  useEffect(() => {
    setError(null);
    setIsLoading(false);
    
    // Check if we have cached data for this country
    const countryCode = countryData?.cca2;
    if (countryCode && worldBankCache.has(countryCode)) {
      setWorldBankData(worldBankCache.get(countryCode));
    } else {
      setWorldBankData(null);
    }
  }, [countryData?.cca2]);

  /**
   * Get default population from REST Countries
   * @returns {Object} { value, formatted }
   */
  const getDefaultPopulation = useCallback(() => {
    const population = countryData?.population;
    if (!population) return { value: null, formatted: 'N/A' };
    
    return {
      value: population,
      formatted: `${formatNumber(population)} — Latest available estimate`
    };
  }, [countryData]);

  /**
   * Fetch accurate World Bank population (on-demand)
   * Only called when user expands "More details"
   */
  const fetchAccuratePopulation = useCallback(async () => {
    const countryCode = countryData?.cca2;
    
    if (!countryCode || worldBankData || isLoading) return;

    // Check cache first
    if (worldBankCache.has(countryCode)) {
      setWorldBankData(worldBankCache.get(countryCode));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWorldBankPopulation(countryCode);
      if (data) {
        setWorldBankData(data);
        // Store in cache
        worldBankCache.set(countryCode, data);
      } else {
        setError('World Bank data not available');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [countryData?.cca2, worldBankData, isLoading]);

  /**
   * Get formatted World Bank population
   * @returns {string|null} Formatted string with year and source
   */
  const getAccuratePopulation = useCallback(() => {
    if (!worldBankData) return null;
    return `${formatNumber(worldBankData.population)} (${worldBankData.year}) — Source: World Bank`;
  }, [worldBankData]);

  return {
    defaultPopulation: getDefaultPopulation(),
    accuratePopulation: getAccuratePopulation(),
    fetchAccuratePopulation,
    isLoadingAccurate: isLoading,
    error
  };
}

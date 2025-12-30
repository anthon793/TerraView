/**
 * Custom Hook: useCountryFacts
 * 
 * Manages fun facts from:
 * 1. Wikipedia API (fetched once, cached)
 * 2. Local facts (passed as prop)
 * 
 * Provides instant fact rotation without refetching
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchWikipediaSummary, getRandomFact, getAllFacts } from '../utils/funFactsGenerator';

export function useCountryFacts(countryData, localFacts = []) {
  const [wikipediaFacts, setWikipediaFacts] = useState(null);
  const [currentFact, setCurrentFact] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch Wikipedia summary on mount
   * Only fetches once, result is cached in localStorage
   */
  useEffect(() => {
    if (!countryData?.name?.common) return;

    const fetchFacts = async () => {
      setIsLoading(true);
      
      try {
        const facts = await fetchWikipediaSummary(countryData.name.common);
        setWikipediaFacts(facts);
        
        // Set initial random fact
        const initialFact = getRandomFact(facts, localFacts);
        setCurrentFact(initialFact);
      } catch (error) {
        console.error('Error fetching facts:', error);
        // Fallback to local facts only
        const fallbackFact = getRandomFact([], localFacts);
        setCurrentFact(fallbackFact);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacts();
  }, [countryData?.name?.common, localFacts]);

  /**
   * Get next random fact (instant, no API call)
   * Rotates through available facts
   */
  const getNextFact = useCallback(() => {
    const allAvailableFacts = getAllFacts(wikipediaFacts, localFacts);
    
    if (allAvailableFacts.length === 0) {
      setCurrentFact('A fascinating country with rich culture and history.');
      return;
    }
    
    // Get random fact, try to avoid repeating current one
    let nextFact = getRandomFact(wikipediaFacts, localFacts);
    let attempts = 0;
    
    while (nextFact === currentFact && attempts < 5 && allAvailableFacts.length > 1) {
      nextFact = getRandomFact(wikipediaFacts, localFacts);
      attempts++;
    }
    
    setCurrentFact(nextFact);
  }, [wikipediaFacts, localFacts, currentFact]);

  const allAvailableFacts = getAllFacts(wikipediaFacts, localFacts);

  return {
    currentFact,
    getNextFact,
    isLoading,
    totalFacts: allAvailableFacts.length,
    hasFacts: allAvailableFacts.length > 0
  };
}

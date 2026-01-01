/**
 * CountryInfoPopup Component
 * 
 * Clean, modern popup displaying comprehensive country information:
 * - Country basics (name, flag, region, area)
 * - Population (default + optional accurate data)
 * - Languages and currencies
 * - Dynamic fun facts
 */

import { useState, useEffect, useRef } from 'react';
import { useCountryPopulation } from '../hooks/useCountryPopulation';
import { useCountryFacts } from '../hooks/useCountryFacts';
import { getCapital } from '../services/CapitalService';

function CountryInfoPopup({ 
  country, 
  isOpen, 
  onClose, 
  isLoadingCountry = false,
  localFacts = []
}) {
  console.log('CountryInfoPopup rendered with:', { isOpen, country, isLoadingCountry });
  
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [flagLoaded, setFlagLoaded] = useState(false);
  const [flagError, setFlagError] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const contentRef = useRef(null);
  
  // Use custom hooks for population and facts
  const population = useCountryPopulation(country);
  const facts = useCountryFacts(country, localFacts);

  // Reset showMoreDetails and flag loading when country changes
  useEffect(() => {
    setShowMoreDetails(false);
    setFlagLoaded(false);
    setFlagError(false);
    setScrolled(false);
  }, [country?.cca2]);

  // Track scroll to adapt header style
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isOpen]);

  // Preload flag image as soon as we have country data
  useEffect(() => {
    if (!country?.flags?.svg && !country?.flags?.png) return;
    
    const flagUrl = country.flags.svg || country.flags.png;
    const img = new Image();
    
    img.onload = () => setFlagLoaded(true);
    img.onerror = () => setFlagError(true);
    img.src = flagUrl;
    
    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [country?.flags?.svg, country?.flags?.png]);

  // Prefetch World Bank population data in background when popup opens
  // This makes it feel instant when user clicks "Show More"
  useEffect(() => {
    if (isOpen && country?.cca2 && !isLoadingCountry && !population.accuratePopulation) {
      // Prefetch in background after a short delay (to prioritize rendering)
      const timer = setTimeout(() => {
        population.fetchAccuratePopulation();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, country?.cca2, isLoadingCountry, population.accuratePopulation]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle "More Details" expansion
  const handleShowMore = async () => {
    setShowMoreDetails(true);
    if (!population.accuratePopulation) {
      await population.fetchAccuratePopulation();
    }
  };

  if (!isOpen) return null;

  // Loading state
  if (isLoadingCountry || !country) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-8 w-full sm:w-auto">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
              <p className="text-gray-700 font-medium text-center">Loading country information...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Extract country information
  const name = country.name?.common || 'Unknown';
  const flag = country.flags?.svg || country.flags?.png || '';
  const region = country.region || 'N/A';
  const capital = getCapital(country.cca2); // Get from cached capital service
  const area = country.area ? `${country.area.toLocaleString()} km²` : 'N/A';
  const languages = country.languages
    ? Object.values(country.languages).join(', ')
    : 'N/A';
  const currencies = country.currencies
    ? Object.entries(country.currencies)
        .map(([code, curr]) => `${curr.name} (${code})`)
        .join(', ')
    : 'N/A';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Popup Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 py-4 sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className={`sticky top-0 text-white px-4 py-5 sm:p-6 rounded-t-3xl sm:rounded-t-2xl flex justify-between items-start gap-3 transition-shadow duration-200 ${scrolled ? 'shadow-md' : ''}`} style={{background: 'linear-gradient(135deg, #1E3A8A, #2563EB)'}}>
            <div className="flex-1">
              <h2 className="text-xl sm:text-3xl font-bold leading-tight">{name}</h2>
              <p className="text-xs sm:text-sm mt-1" style={{color: 'rgba(255, 255, 255, 0.82)'}}>{region}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors shrink-0 touch-target"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div ref={contentRef} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 overflow-y-auto bg-[#F7FAFC]">
            
            {/* Flag */}
            {flag && (
              <div className="flex justify-center">
                <div className="relative w-32 h-24 sm:w-48 sm:h-32">
                  {/* Loading spinner */}
                  {!flagLoaded && !flagError && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2" style={{backgroundColor: '#ECF7FD', borderColor: '#AAE0F9'}}>
                      <div className="animate-spin rounded-full h-8 w-8 border-3" style={{borderColor: '#8BBED8', borderTopColor: '#C77442'}} />
                    </div>
                  )}
                  
                  {/* Error state */}
                  {flagError && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2" style={{backgroundColor: '#ECF7FD', borderColor: '#AAE0F9'}}>
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#8BBED8'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Actual flag image */}
                  <img
                    src={flag}
                    alt={`${name} flag`}
                    className={`w-32 h-24 sm:w-48 sm:h-32 object-cover rounded-lg shadow-lg border-2 transition-opacity duration-300 ${
                      flagLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{borderColor: '#8BBED8'}}
                    onLoad={() => setFlagLoaded(true)}
                    onError={() => setFlagError(true)}
                  />
                </div>
              </div>
            )}

            {/* Information Grid */}
            <div className="space-y-5 sm:space-y-4">
              
              {/* Capital */}
              <div className="flex items-start space-x-3 p-4 sm:p-4 rounded-lg" style={{backgroundColor: '#FEF3C7'}}>
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#FCD34D'}}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#92400E'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Capital</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{capital}</p>
                </div>
              </div>

              {/* Area */}
              <div className="flex items-start space-x-3 p-4 sm:p-4 rounded-lg" style={{backgroundColor: '#E7F0FF'}}>
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#C7DBFF'}}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#2563EB'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Area</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{area}</p>
                </div>
              </div>

              {/* Population - Default */}
              <div className="flex items-start space-x-3 p-4 sm:p-4 rounded-lg" style={{backgroundColor: '#E7FFF3'}}>
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#B3F2D1'}}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#0F9D58'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0v2H6v-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Population</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {population.defaultPopulation.formatted}
                  </p>
                  {!showMoreDetails && (
                    <button
                      onClick={handleShowMore}
                      className="text-xs mt-2 font-medium transition-colors touch-target" style={{color: '#D97706'}}
                    >
                      View accurate data →
                    </button>
                  )}
                </div>
              </div>

              {/* Population - World Bank (on-demand) */}
              {showMoreDetails && (
                <div className="flex items-start space-x-3 p-4 sm:p-4 rounded-lg border-2" style={{backgroundColor: '#FFF9E6', borderColor: '#F59E0B'}}>
                  <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F59E0B'}}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#FDE68A'}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Accurate Population</p>
                    {population.isLoadingAccurate ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{borderColor: '#F59E0B', borderTopColor: 'transparent'}} />
                        <p className="text-sm text-gray-600">Fetching...</p>
                      </div>
                    ) : population.error ? (
                      <p className="text-sm text-red-600 mt-1">{population.error}</p>
                    ) : population.accuratePopulation ? (
                      <p className="text-base sm:text-lg font-semibold text-gray-900 mt-1 break-words">
                        {population.accuratePopulation}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Languages */}
              <div className="flex items-start space-x-3 p-4 sm:p-4 rounded-lg" style={{backgroundColor: '#EEF2FF'}}>
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#E0E7FF'}}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#4F46E5'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Languages</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{languages}</p>
                </div>
              </div>

              {/* Currency */}
              <div className="flex items-start space-x-3 p-4 sm:p-4 rounded-lg" style={{backgroundColor: '#FFF4EC'}}>
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#FDBA74'}}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#C2410C'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Currency</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{currencies}</p>
                </div>
              </div>
            </div>

            {/* Fun Facts Section */}
            <div className="rounded-lg p-4 sm:p-5 border-2" style={{background: 'linear-gradient(135deg, #E0E7FF, #F5F3FF)', borderColor: '#C7D2FE'}}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold mb-2" style={{color: '#7C3AED'}}>DID YOU KNOW?</p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    {facts.currentFact || 'Loading fact...'}
                  </p>
                  {facts.totalFacts > 1 && (
                    <button
                      onClick={facts.getNextFact}
                      className="text-xs font-semibold mt-3 transition-colors touch-target" style={{color: '#7C3AED'}}
                    >
                      ↻ More facts ({facts.totalFacts} available)
                    </button>
                  )}
                </div>
                {facts.isLoading && (
                  <div className="flex-shrink-0">
                    <div className="animate-spin rounded-full h-5 w-5 border-2" style={{borderColor: '#C7D2FE', borderTopColor: '#7C3AED'}} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CountryInfoPopup;

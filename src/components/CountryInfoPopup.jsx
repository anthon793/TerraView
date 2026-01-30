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

// ============================================================================
// Theme Definitions
// ============================================================================

const THEMES = {
  'globe-satellite': { // Theme 3: Refined Tech
    id: 'satellite',
    modalBg: 'rgba(3, 7, 18, 0.92)', // Deepest gray-blue/black
    backdropFilter: 'blur(12px)',
    borderColor: 'rgba(56, 189, 248, 0.3)', // Subtle Sky Blue
    borderWidth: '1px',
    borderRadius: '16px',
    textColor: '#E2E8F0', // Slate 200 (Soft White)
    subTextColor: '#94F5BC', // Slate 400
    headerGradient: 'linear-gradient(90deg, rgba(8, 47, 73, 0.5), transparent)',
    headerText: '#F0F9FF', // Sky 50
    contentBg: 'transparent',
    dividerColor: 'rgba(56, 189, 248, 0.2)',
    iconBg: 'rgba(6, 182, 212, 0.1)', // Cyan tint
    iconColor: '#06B6D4', // Cyan 500
    cardBg: 'rgba(15, 23, 42, 0.6)', // Slate 900 transparent
    cardBorder: '1px solid rgba(56, 189, 248, 0.1)',
    accentColor: '#06B6D4', // Cyan 500
    fontFamily: '"Rajdhani", "Segoe UI", sans-serif',
    closeBtnHover: 'rgba(6, 182, 212, 0.2)',
    spinnerColor: '#0EA5E9', // Sky 500
    boxShadow: '0 0 40px rgba(0, 0, 0, 0.6), 0 0 10px rgba(6, 182, 212, 0.1)',
  },
  'globe-political': { // Theme 1: Modern & Clean
    id: 'political',
    modalBg: 'rgba(241, 245, 249, 0.95)', // Slate 100 - Softer than pure white
    backdropFilter: 'blur(20px)',
    borderColor: '#CBD5E1', // Slate 300
    borderWidth: '1px',
    borderRadius: '20px',
    textColor: '#1E293B', // Slate 800 - High contrast text
    subTextColor: '#64748B', // Slate 500
    headerGradient: 'linear-gradient(135deg, #E2E8F0, #F1F5F9)', // Darker gradient
    headerText: '#0F172A', // Slate 900
    contentBg: 'transparent',
    dividerColor: '#CBD5E1',
    iconBg: '#E0F2FE', // Sky 100
    iconColor: '#0369A1', // Sky 700 - Darker blue for readability
    cardBg: '#FFFFFF', // Clean white cards against gray bg
    cardBorder: '1px solid #E2E8F0',
    accentColor: '#0369A1', // Sky 700
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    closeBtnHover: '#E2E8F0',
    spinnerColor: '#0369A1',
    boxShadow: '0 20px 40px -4px rgba(0, 0, 0, 0.1), 0 8px 16px -4px rgba(0, 0, 0, 0.05)',
  },
  'flat-map': { // Theme 2: Classic/Tactile
    id: 'flat',
    modalBg: '#FFFAF0', // Floral White (Warmer)
    backdropFilter: 'none',
    borderColor: '#E6DCC3', // Tan
    borderWidth: '1px',
    borderRadius: '12px',
    textColor: '#3D2817', // Deep warm brown
    subTextColor: '#8C735A', // Light brown
    headerGradient: '#F3E5D0', // Parchment
    headerText: '#2C1810',
    contentBg: '#FFFAF0',
    dividerColor: '#E6DCC3',
    iconBg: '#F5E6D3',
    iconColor: '#A0522D', // Sienna
    cardBg: '#FFFFFF',
    cardBorder: '1px solid #E6DCC3',
    accentColor: '#B45309', // Amber 700
    fontFamily: '"Crimson Pro", "Georgia", serif',
    closeBtnHover: 'rgba(0, 0, 0, 0.05)',
    spinnerColor: '#B45309',
    boxShadow: '4px 4px 0px rgba(160, 130, 109, 0.2), 0 8px 24px rgba(0,0,0,0.05)', // Hard + Soft combo
  }
};

function CountryInfoPopup({
  country,
  isOpen,
  onClose,
  isLoadingCountry = false,
  localFacts = [],
  mode = 'globe-political'
}) {
  console.log('CountryInfoPopup rendered with:', { isOpen, country, isLoadingCountry, mode });
  const theme = THEMES[mode] || THEMES['globe-political'];

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
          className="fixed inset-0 z-[2000] transition-opacity duration-300"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
        <div className="fixed inset-0 z-[2001] flex items-end sm:items-center justify-center p-4">
          <div
            className="rounded-t-3xl sm:rounded-2xl shadow-2xl p-8 w-full sm:w-auto"
            style={{
              background: theme.modalBg,
              backdropFilter: theme.backdropFilter,
              border: `${theme.borderWidth} solid ${theme.borderColor}`,
              color: theme.textColor
            }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div
                className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
                style={{ borderColor: `${theme.spinnerColor}33`, borderTopColor: theme.spinnerColor }}
              />
              <p className="font-medium text-center">Loading country information...</p>
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
  const capital = getCapital(country.cca2);
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
      <div
        className="fixed inset-0 z-[2000] transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[2001] flex items-end sm:items-center justify-center px-0 sm:px-3 py-0 sm:py-4">
        <div
          className="shadow-2xl w-full sm:max-w-lg max-h-[70vh] sm:max-h-[85vh] flex flex-col transition-all duration-300"
          style={{
            background: theme.modalBg,
            backdropFilter: theme.backdropFilter,
            borderRadius: theme.borderRadius,
            border: `${theme.borderWidth} solid ${theme.borderColor}`,
            color: theme.textColor,
            fontFamily: theme.fontFamily,
            boxShadow: theme.boxShadow
          }}
        >

          {/* Header */}
          <div
            className={`sticky top-0 px-4 py-3 sm:p-5 flex justify-between items-start gap-3 transition-all duration-200 z-10 ${scrolled ? 'shadow-md' : ''}`}
            style={{
              background: theme.headerGradient,
              borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0`,
              borderBottom: scrolled ? theme.cardBorder : 'none',
              color: theme.headerText
            }}
          >
            <div className="flex-1">
              <h2 className="text-lg sm:text-2xl font-bold leading-tight tracking-wide">{name.toUpperCase()}</h2>
              <p className="text-xs sm:text-sm mt-0.5 opacity-80 font-medium tracking-wider">{region.toUpperCase()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors shrink-0 touch-target"
              style={{ color: theme.headerText }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.closeBtnHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="flex-1 px-4 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-5 overflow-y-auto"
            style={{ background: theme.contentBg }}
          >

            {/* Flag */}
            {flag && (
              <div className="flex justify-center">
                <div className="relative w-28 h-20 sm:w-44 sm:h-30 group">
                  {!flagLoaded && !flagError && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg border" style={{ borderColor: theme.borderColor, background: theme.cardBg }}>
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: `${theme.accentColor}33`, borderTopColor: theme.accentColor }} />
                    </div>
                  )}

                  {flagError && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg border" style={{ borderColor: theme.borderColor, background: theme.cardBg }}>
                      <span className="text-xs opacity-50">No Flag</span>
                    </div>
                  )}

                  <img
                    src={flag}
                    alt={`${name} flag`}
                    className={`w-28 h-20 sm:w-44 sm:h-30 object-cover rounded-lg shadow-lg border transition-all duration-500 ${flagLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                    style={{ borderColor: theme.borderColor }}
                    onLoad={() => setFlagLoaded(true)}
                    onError={() => setFlagError(true)}
                  />

                  {/* Decorative corner elements for satellite mode */}
                  {mode === 'globe-satellite' && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: theme.accentColor }} />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: theme.accentColor }} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Information Grid */}
            <div className="space-y-3 sm:space-y-4">

              {[
                { label: 'Capital', value: capital, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { label: 'Area', value: area, icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                {
                  label: 'Population', value: population.defaultPopulation.formatted, icon: 'M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0v2H6v-2z', action: !showMoreDetails && (
                    <button onClick={handleShowMore} className="text-xs mt-1 font-bold tracking-wide hover:opacity-80 transition-opacity" style={{ color: theme.accentColor }}>
                      + ACCURATE DATA
                    </button>
                  )
                },
                { label: 'Languages', value: languages, icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
                { label: 'Currency', value: currencies, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg transition-transform hover:scale-[1.01]" style={{ background: theme.cardBg, border: theme.cardBorder }}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: theme.iconBg }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.iconColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: theme.subTextColor }}>{item.label}</p>
                    <p className="text-sm sm:text-base font-semibold break-words mt-0.5" style={{ color: theme.textColor }}>{item.value}</p>
                    {item.action}
                  </div>
                </div>
              ))}

              {/* Accurate Population Expansion */}
              {showMoreDetails && (
                <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg animate-fade-in" style={{ background: theme.cardBg, border: `1px dashed ${theme.accentColor}` }}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: theme.iconBg }}>
                    <div className="animate-pulse w-2 h-2 rounded-full" style={{ background: theme.iconColor }}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: theme.subTextColor }}>Live Estimate</p>
                    {population.isLoadingAccurate ? (
                      <p className="text-sm font-medium animate-pulse mt-0.5">Calculating...</p>
                    ) : (
                      <p className="text-sm sm:text-base font-bold break-words mt-0.5" style={{ color: theme.accentColor }}>
                        {population.accuratePopulation || 'Unavailable'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Fun Facts Section */}
            {/* Fun Facts Section */}
            <div className="mt-2 text-left">
              {/* SATELLITE MODE: Data Log Style */}
              {mode === 'globe-satellite' && (
                <div
                  className="relative overflow-hidden rounded-r-lg border-l-2 p-4"
                  style={{
                    background: 'rgba(6, 182, 212, 0.05)',
                    borderColor: theme.accentColor,
                    fontFamily: '"Rajdhani", monospace'
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: theme.accentColor }}>
                      /// INTELLIGENCE_LOG
                    </span>
                    <span className="text-[10px] opacity-50 tracking-widest">SEQ_{Math.floor(Math.random() * 9999)}</span>
                  </div>

                  <p className="text-sm leading-relaxed mb-3 opacity-90" style={{ color: theme.textColor }}>
                    {facts.currentFact ? `> ${facts.currentFact}` : '> Awaiting data stream...'}
                  </p>

                  {facts.totalFacts > 1 && (
                    <button
                      onClick={facts.getNextFact}
                      className="text-xs font-bold px-3 py-1 rounded-sm transition-colors flex items-center gap-2 ml-auto"
                      style={{ background: 'rgba(6, 182, 212, 0.15)', color: theme.accentColor }}
                    >
                      NEXT_ENTRY
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}
                </div>
              )}

              {/* POLITICAL MODE: Modern Card Style */}
              {mode === 'globe-political' && (
                <div
                  className="rounded-2xl p-5 relative overflow-hidden"
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10 -mr-4 -mt-4 rounded-full" style={{ background: theme.accentColor }}></div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide" style={{ background: theme.iconBg, color: theme.accentColor }}>
                      Did you know?
                    </span>
                  </div>

                  <p className="text-sm sm:text-[15px] leading-relaxed font-medium text-slate-700 mb-4">
                    {facts.currentFact || 'Loading interesting facts...'}
                  </p>

                  {facts.totalFacts > 1 && (
                    <div className="flex justify-end">
                      <button
                        onClick={facts.getNextFact}
                        className="text-xs font-bold transition-all flex items-center gap-1 hover:gap-2"
                        style={{ color: theme.accentColor }}
                      >
                        More Info <span className="text-lg leading-none">&rarr;</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* FLAT MAP MODE: Journal Style */}
              {mode === 'flat-map' && (
                <div
                  className="rounded-lg p-5 relative"
                  style={{
                    background: '#FFF',
                    border: '1px solid #E6DCC3',
                    boxShadow: '4px 4px 0 rgba(230, 220, 195, 0.4)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-[#E6DCC3]"></div>
                    <span className="text-xs font-bold italic serif text-[#8C735A]">Field Notes</span>
                    <div className="h-px flex-1 bg-[#E6DCC3]"></div>
                  </div>

                  <p className="text-sm sm:text-base italic leading-relaxed text-[#5C4033] mb-4 text-center" style={{ fontFamily: '"Crimson Pro", serif' }}>
                    "{facts.currentFact || 'Retrieving archive data...'}"
                  </p>

                  {facts.totalFacts > 1 && (
                    <div className="flex justify-center">
                      <button
                        onClick={facts.getNextFact}
                        className="text-xs uppercase tracking-widest font-bold px-4 py-2 hover:bg-[#FDFBF7] transition-colors border-t border-transparent hover:border-[#E6DCC3]"
                        style={{ color: '#8B4513' }}
                      >
                        Turn Page
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default CountryInfoPopup;

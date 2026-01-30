/**
 * Country Store - Event Bus for Cross-Renderer State Management
 * 
 * WHY: Provides a centralized store for country selection and popup state
 * that can be shared across all visualization renderers (Political Globe,
 * Satellite Globe, 2D Map). This decouples the data/UI state from the
 * rendering mode, allowing seamless mode switching while preserving context.
 * 
 * ARCHITECTURE:
 * - Uses a simple pub/sub pattern for state changes
 * - Stores selected country, popup visibility, and loading state
 * - All renderers subscribe to changes and trigger updates
 * - Country data fetching is centralized here
 */

import { fetchCountryData } from '../utils/countryMatcher';
import { getLocalFacts } from '../data/countryFacts';

// ============================================================================
// Store State
// ============================================================================

const state = {
    selectedCountryName: null,  // Name from GeoJSON properties
    countryData: null,          // Full country data from REST Countries API
    isPanelOpen: false,         // Whether the popup is visible
    isLoadingCountry: false,    // Loading state for country data fetch
    localFacts: [],             // Local facts for the selected country
};

// ============================================================================
// Subscribers (Event Bus Pattern)
// ============================================================================

const subscribers = new Set();

/**
 * Subscribe to store changes
 * @param {Function} callback - Called with current state whenever it changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
    subscribers.add(callback);
    // Immediately call with current state
    callback({ ...state });

    // Return unsubscribe function
    return () => {
        subscribers.delete(callback);
    };
}

/**
 * Notify all subscribers of state change
 */
function notifySubscribers() {
    const currentState = { ...state };
    subscribers.forEach(callback => {
        try {
            callback(currentState);
        } catch (error) {
            console.error('Error in store subscriber:', error);
        }
    });
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Select a country - triggers data fetch and opens popup
 * 
 * HOW: Extracts country name from GeoJSON polygon properties,
 * fetches full data from REST Countries API, and notifies subscribers.
 * This is called by all renderers when a country is clicked.
 * 
 * @param {Object} polygon - GeoJSON feature from country boundaries
 */
export async function selectCountry(polygon) {
    if (!polygon || !polygon.properties) {
        console.warn('[CountryStore] No polygon or properties found');
        return;
    }

    // Extract country name from various possible GeoJSON property names
    const countryName = polygon.properties.NAME ||
        polygon.properties.name ||
        polygon.properties.ADMIN ||
        polygon.properties.NAME_ENG ||
        polygon.properties.NAME_EN;

    if (!countryName) {
        console.warn('[CountryStore] Country name not found in polygon properties', polygon.properties);
        return;
    }

    console.log('[CountryStore] Selecting country:', countryName);

    // Update state - show loading
    state.selectedCountryName = countryName;
    state.isPanelOpen = true;
    state.isLoadingCountry = true;
    state.countryData = null;
    state.localFacts = [];
    notifySubscribers();

    // Fetch country data from REST Countries API
    try {
        const data = await fetchCountryData(countryName);
        console.log('[CountryStore] Country data fetched:', data);

        // Update state with fetched data
        state.countryData = data;
        state.localFacts = data?.cca3 ? getLocalFacts(data.cca3) : [];
        state.isLoadingCountry = false;
        notifySubscribers();
    } catch (error) {
        console.error('[CountryStore] Error fetching country data:', error);
        state.isLoadingCountry = false;
        notifySubscribers();
    }
}

/**
 * Select a country by name (string) - used by 2D map with Leaflet
 * @param {string} countryName - Name of the country
 */
export async function selectCountryByName(countryName) {
    if (!countryName) {
        console.warn('[CountryStore] No country name provided');
        return;
    }

    console.log('[CountryStore] Selecting country by name:', countryName);

    // Update state - show loading
    state.selectedCountryName = countryName;
    state.isPanelOpen = true;
    state.isLoadingCountry = true;
    state.countryData = null;
    state.localFacts = [];
    notifySubscribers();

    // Fetch country data
    try {
        const data = await fetchCountryData(countryName);
        state.countryData = data;
        state.localFacts = data?.cca3 ? getLocalFacts(data.cca3) : [];
        state.isLoadingCountry = false;
        notifySubscribers();
    } catch (error) {
        console.error('[CountryStore] Error fetching country data:', error);
        state.isLoadingCountry = false;
        notifySubscribers();
    }
}

/**
 * Close the country popup/panel
 */
export function closePanel() {
    console.log('[CountryStore] Closing panel');
    state.isPanelOpen = false;
    state.selectedCountryName = null;
    state.countryData = null;
    state.localFacts = [];
    notifySubscribers();
}

/**
 * Get current state (read-only snapshot)
 * @returns {Object} Current state
 */
export function getState() {
    return { ...state };
}

/**
 * Check if a country is currently selected
 * @param {string} countryName - Name to check
 * @returns {boolean} True if this country is selected
 */
export function isCountrySelected(countryName) {
    return state.selectedCountryName === countryName;
}

/**
 * BaseRenderer - Abstract Base Class for Visualization Renderers
 * 
 * WHY: Provides a consistent interface for all visualization modes.
 * Each renderer (Political Globe, Satellite Globe, 2D Map) extends this
 * class and implements the required methods. This allows the mode controller
 * to treat all renderers uniformly.
 * 
 * ARCHITECTURE:
 * - Abstract methods define the contract each renderer must fulfill
 * - Shared utilities and state are provided by the base class
 * - Renderers are responsible for their own DOM elements and cleanup
 * - Event handling is standardized through the country store
 */

import { selectCountry } from '../store/countryStore';

export default class BaseRenderer {
    /**
     * Create a renderer instance
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} options - Configuration options
     */
    constructor(container, options = {}) {
        if (!container) {
            throw new Error('Container element is required');
        }

        this.container = container;
        this.options = options;
        this.isInitialized = false;
        this.isDestroyed = false;

        // Shared GeoJSON data - loaded once, reused across renderers
        this.countriesGeoJson = null;

        // Track if we're currently dragging (to prevent click on drag)
        this.isDragging = false;
    }

    /**
     * Get the display name for this renderer mode
     * @returns {string} Human-readable mode name
     */
    static get modeName() {
        throw new Error('Subclass must implement static modeName getter');
    }

    /**
     * Get the unique identifier for this renderer mode
     * @returns {string} Mode ID (e.g., 'globe-political', 'globe-satellite', 'flat-map')
     */
    static get modeId() {
        throw new Error('Subclass must implement static modeId getter');
    }

    /**
     * Initialize the renderer
     * Must be implemented by subclasses
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error('Subclass must implement initialize()');
    }

    /**
     * Show the renderer (make it visible)
     * Called when switching TO this mode
     */
    show() {
        // Subclasses should override to show their specific DOM elements
    }

    /**
     * Hide the renderer (make it invisible)
     * Called when switching FROM this mode
     */
    hide() {
        // Subclasses should override to hide their specific DOM elements
    }

    /**
     * Destroy the renderer and clean up resources
     * WHY: Prevents memory leaks when switching modes
     * Must be implemented by subclasses
     */
    destroy() {
        throw new Error('Subclass must implement destroy()');
    }

    /**
     * Handle country click - delegates to the shared store
     * HOW: All renderers use this method to trigger country selection,
     * ensuring consistent behavior across modes
     * 
     * @param {Object} polygon - GeoJSON feature that was clicked
     */
    handleCountryClick(polygon) {
        // Only handle click if we weren't dragging
        if (!this.isDragging) {
            selectCountry(polygon);
        }
    }

    /**
     * Set the shared GeoJSON data
     * WHY: Boundaries data is loaded once and shared across all renderers
     * to avoid redundant network requests
     * 
     * @param {Object} geoJson - Country boundaries GeoJSON
     */
    setCountriesGeoJson(geoJson) {
        this.countriesGeoJson = geoJson;
    }

    /**
     * Get loading state (for UI feedback)
     * @returns {boolean} True if the renderer is loading data
     */
    isLoading() {
        return !this.isInitialized;
    }

    /**
     * Focus camera on a specific country feature
     * Must be implemented by subclasses
     * @param {Object} feature - GeoJSON feature to focus on
     */
    focusOnCountry(feature) {
        console.warn('focusOnCountry not implemented for this renderer');
    }

    /**
     * Helper: Calculate the center (lat/lng) of a GeoJSON feature
     * @param {Object} feature - GeoJSON feature
     * @returns {Object} { lat, lng }
     */
    getFeatureCenter(feature) {
        if (!feature || !feature.geometry) return { lat: 0, lng: 0 };

        const geometry = feature.geometry;
        let coords = [];

        // Flatten coordinates based on type
        if (geometry.type === 'Polygon') {
            coords = geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon') {
            // Use the largest polygon for center (approximation) or flatten all
            // For simplicity, we flattening all points which gives a visual center
            geometry.coordinates.forEach(poly => {
                poly[0].forEach(p => coords.push(p));
            });
        }

        if (coords.length === 0) return { lat: 0, lng: 0 };

        let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

        coords.forEach(pt => {
            const [lng, lat] = pt; // GeoJSON is [lng, lat]
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        });

        return {
            lat: (minLat + maxLat) / 2,
            lng: (minLng + maxLng) / 2
        };
    }

    /**
     * Resize handler - called when window resizes
     * Subclasses should override if they need to handle resize
     */
    onResize() {
        // Default: no-op, subclasses override
    }
}

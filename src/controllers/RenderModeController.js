/**
 * RenderModeController - Orchestrates Visualization Mode Switching
 * 
 * WHY: Provides a clean interface for switching between different
 * visualization modes (Political Globe, Satellite Globe, 2D Map).
 * Handles renderer lifecycle - initialization, showing/hiding, cleanup.
 * 
 * ARCHITECTURE:
 * - Maintains a registry of available renderer classes
 * - Lazily initializes renderers on first use (for performance)
 * - Hides previous renderer and shows next one on mode switch
 * - Shares GeoJSON data between renderers to avoid redundant fetches
 * - Provides hooks for mode change events
 * 
 * HOW MODE SWITCHING WORKS:
 * 1. User clicks a mode button (e.g., "Satellite")
 * 2. Controller hides the current renderer (stops animation, hides DOM)
 * 3. Controller checks if new renderer exists, creates if needed
 * 4. New renderer is shown (starts animation, shows DOM)
 * 5. GeoJSON data is shared from previous renderer if available
 * 6. Country selection state is preserved via the countryStore
 */

import GlobePoliticalRenderer from '../renderers/GlobePoliticalRenderer';
import GlobeSatelliteRenderer from '../renderers/GlobeSatelliteRenderer';
import FlatMapRenderer from '../renderers/FlatMapRenderer';

// ============================================================================
// Mode Definitions
// ============================================================================

export const VISUALIZATION_MODES = {
    GLOBE_POLITICAL: 'globe-political',
    GLOBE_SATELLITE: 'globe-satellite',
    FLAT_MAP: 'flat-map',
};

// Registry of renderer classes by mode ID
const RENDERER_REGISTRY = {
    [VISUALIZATION_MODES.GLOBE_POLITICAL]: GlobePoliticalRenderer,
    [VISUALIZATION_MODES.GLOBE_SATELLITE]: GlobeSatelliteRenderer,
    [VISUALIZATION_MODES.FLAT_MAP]: FlatMapRenderer,
};

// Mode metadata for UI
export const MODE_INFO = [
    {
        id: VISUALIZATION_MODES.GLOBE_POLITICAL,
        name: 'Globe',
        icon: '🌍',
        description: 'Interactive 3D globe with colorful boundaries',
    },
    {
        id: VISUALIZATION_MODES.GLOBE_SATELLITE,
        name: 'Satellite',
        icon: '🛰️',
        description: '3D globe with satellite imagery',
    },
    {
        id: VISUALIZATION_MODES.FLAT_MAP,
        name: '2D Map',
        icon: '🗺️',
        description: 'Flat world map with pan and zoom',
    },
];

// ============================================================================
// RenderModeController Class
// ============================================================================

export default class RenderModeController {
    /**
     * Create a mode controller
     * @param {HTMLElement} container - DOM element to render into
     */
    constructor(container) {
        if (!container) {
            throw new Error('Container element is required');
        }

        this.container = container;

        // Map of modeId -> renderer instance (lazy initialization)
        this.renderers = new Map();

        // Current active mode
        this.currentMode = null;

        // Shared GeoJSON data (loaded once, shared across renderers)
        this.sharedGeoJson = null;

        // Loading state
        this.isLoading = false;

        // Mode change subscribers
        this.modeChangeSubscribers = new Set();

        console.log('[ModeController] Created');
    }

    /**
     * Subscribe to mode change events
     * @param {Function} callback - Called with (newModeId, oldModeId)
     * @returns {Function} Unsubscribe function
     */
    onModeChange(callback) {
        this.modeChangeSubscribers.add(callback);
        return () => {
            this.modeChangeSubscribers.delete(callback);
        };
    }

    /**
     * Notify subscribers of mode change
     */
    notifyModeChange(newMode, oldMode) {
        this.modeChangeSubscribers.forEach(callback => {
            try {
                callback(newMode, oldMode);
            } catch (error) {
                console.error('[ModeController] Mode change subscriber error:', error);
            }
        });
    }

    /**
     * Get the current active mode ID
     * @returns {string|null}
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * Check if a mode is currently active
     * @param {string} modeId - Mode to check
     * @returns {boolean}
     */
    isActive(modeId) {
        return this.currentMode === modeId;
    }

    /**
     * Initialize the controller with a default mode
     * @param {string} defaultMode - Mode to start with (default: political)
     */
    async initialize(defaultMode = VISUALIZATION_MODES.GLOBE_POLITICAL) {
        console.log('[ModeController] Initializing with mode:', defaultMode);
        await this.switchMode(defaultMode);
    }

    /**
     * Switch to a different visualization mode
     * 
     * WHY: This is the core method that handles seamless mode transitions
     * 
     * HOW IT WORKS:
     * 1. Validate the new mode exists in registry
     * 2. If same mode, do nothing (already active)
     * 3. Hide current renderer (if any)
     * 4. Get or create new renderer instance
     * 5. Share GeoJSON data if available
     * 6. Initialize and show new renderer
     * 7. Notify subscribers of mode change
     * 
     * @param {string} modeId - Mode to switch to
     */
    async switchMode(modeId) {
        // Validate mode exists
        if (!RENDERER_REGISTRY[modeId]) {
            console.error('[ModeController] Unknown mode:', modeId);
            return;
        }

        // Skip if already on this mode
        if (this.currentMode === modeId) {
            console.log('[ModeController] Already on mode:', modeId);
            return;
        }

        const oldMode = this.currentMode;

        console.log('[ModeController] Switching from', oldMode, 'to', modeId);

        this.isLoading = true;

        // Step 1: Hide current renderer (if any)
        // WHY: We hide instead of destroy to allow quick switching back
        if (oldMode && this.renderers.has(oldMode)) {
            const oldRenderer = this.renderers.get(oldMode);
            oldRenderer.hide();

            // Capture shared GeoJSON from old renderer
            const geoJson = oldRenderer.getCountriesGeoJson?.();
            if (geoJson && !this.sharedGeoJson) {
                this.sharedGeoJson = geoJson;
                console.log('[ModeController] Captured shared GeoJSON');
            }
        }

        // Step 2: Get or create new renderer
        let renderer = this.renderers.get(modeId);

        if (!renderer) {
            // Lazy initialization of renderer
            // WHY: Only create renderers when needed, saves memory
            console.log('[ModeController] Creating new renderer for:', modeId);

            const RendererClass = RENDERER_REGISTRY[modeId];
            renderer = new RendererClass(this.container);

            // Share GeoJSON data if available
            // WHY: Avoids redundant network requests for boundary data
            if (this.sharedGeoJson) {
                renderer.setCountriesGeoJson(this.sharedGeoJson);
            }

            this.renderers.set(modeId, renderer);
        }

        // Step 3: Initialize if not yet initialized
        if (!renderer.isInitialized) {
            console.log('[ModeController] Initializing renderer:', modeId);
            await renderer.initialize();

            // Capture GeoJSON if we didn't have it before
            const geoJson = renderer.getCountriesGeoJson?.();
            if (geoJson && !this.sharedGeoJson) {
                this.sharedGeoJson = geoJson;
            }
        }

        // Step 4: Show the new renderer
        renderer.show();

        // Update current mode
        this.currentMode = modeId;
        this.isLoading = false;

        // Notify subscribers
        this.notifyModeChange(modeId, oldMode);

        console.log('[ModeController] Switched to:', modeId);
    }

    /**
     * Get the current renderer instance
     * @returns {BaseRenderer|null}
     */
    getCurrentRenderer() {
        if (!this.currentMode) return null;
        return this.renderers.get(this.currentMode) || null;
    }

    /**
     * Check if the controller is loading a new mode
     * @returns {boolean}
     */
    isLoadingMode() {
        return this.isLoading;
    }

    /**
     * Handle window resize - notify current renderer
     */
    handleResize() {
        const renderer = this.getCurrentRenderer();
        if (renderer) {
            renderer.onResize();
        }
    }

    /**
     * Destroy all renderers and clean up
     * WHY: Call this when the entire visualization is being removed
     */
    destroy() {
        console.log('[ModeController] Destroying all renderers...');

        this.renderers.forEach((renderer, modeId) => {
            console.log('[ModeController] Destroying:', modeId);
            renderer.destroy();
        });

        this.renderers.clear();
        this.currentMode = null;
        this.sharedGeoJson = null;
        this.modeChangeSubscribers.clear();

        console.log('[ModeController] All renderers destroyed');
    }
}

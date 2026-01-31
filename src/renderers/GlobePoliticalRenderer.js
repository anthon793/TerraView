/**
 * GlobePoliticalRenderer - 3D Globe with Political Boundaries
 * 
 * WHY: This is the default visualization mode showing a 3D rotating globe
 * with colorful country boundaries and interactive hover/click effects.
 * Refactored from the original GlobeView component to fit the renderer pattern.
 * 
 * HOW BOUNDARIES ARE RENDERED:
 * - Uses globe.gl library (wrapper around Three.js)
 * - Country polygons are rendered as 3D extrusions on the globe surface
 * - Colors are derived from flag palettes, with earth-tone fallbacks
 * - Polygon hover raises altitude and adjusts color for visual feedback
 * 
 * HOW COUNTRY CLICKS ARE HANDLED:
 * - globe.gl's onPolygonClick detects clicks on country polygons
 * - Drag detection prevents accidental clicks during globe rotation
 * - Click events are delegated to the shared countryStore
 */

import Globe from 'globe.gl';
import BaseRenderer from './BaseRenderer';
import { getCountryPalette } from '../utils/flagColorExtractor';

// ============================================================================
// Color Palettes
// ============================================================================

// Vibrant, dynamic palette - no muted/ashy colors
const COUNTRY_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C9BA',
    '#3498DB', '#E74C3C', '#1ABC9C', '#F39C12', '#9B59B6',
    '#E91E63', '#00BCD4', '#4CAF50', '#FF5722', '#673AB7',
    '#00E676', '#FF1744', '#00B0FF', '#76FF03', '#FFB300',
    '#00E5FF', '#FF6E40', '#AB47BC', '#26A69A', '#FFEB3B',
];

// Earth-toned bases per continent for initial land coloring
const CONTINENT_BASE_COLORS = {
    Africa: '#79B957',
    Americas: '#32A189',
    Asia: '#F4CE29',
    Europe: '#8BBED8',
    Oceania: '#C77442',
    Antarctic: '#7C94A4',
    default: '#B1C4BB',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color based on index for consistent country coloring
 */
function getCountryColor(index) {
    return COUNTRY_COLORS[index % COUNTRY_COLORS.length];
}

/**
 * Get base color based on continent
 */
function getBaseColorForFeature(props = {}) {
    const continent = props.CONTINENT || props.continent ||
        props.REGION_UN || props.region_un ||
        props.REGION || props.region;
    return CONTINENT_BASE_COLORS[continent] || CONTINENT_BASE_COLORS.default;
}



// ============================================================================
// Flag Lookup Cache
// ============================================================================

let flagLookupCache = null;

async function loadFlagLookup() {
    if (flagLookupCache) return flagLookupCache;
    try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca3,cca2,region,flags');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const map = new Map();
        data.forEach(entry => {
            if (entry.cca3) {
                map.set(entry.cca3.toUpperCase(), {
                    region: entry.region,
                    flags: entry.flags,
                });
            }
        });
        flagLookupCache = map;
        return map;
    } catch (err) {
        console.warn('[GlobePolitical] Failed to load flag lookup:', err);
        flagLookupCache = new Map();
        return flagLookupCache;
    }
}

// ============================================================================
// GlobePoliticalRenderer Class
// ============================================================================

export default class GlobePoliticalRenderer extends BaseRenderer {
    static get modeName() {
        return 'Globe Political';
    }

    static get modeId() {
        return 'globe-political';
    }

    constructor(container, options = {}) {
        super(container, options);

        // Globe.gl instance
        this.globe = null;

        // DOM element for the globe
        this.globeElement = null;

        // Animation frame ID for cleanup
        this.animationFrameId = null;

        // Interaction state
        this.isUserInteracting = false;
        this.lastInteractionTime = Date.now();
        this.mouseDownPos = null;
        this.currentAltitude = 2.5;
        this.rotation = 0;

        // Constants
        this.DRAG_THRESHOLD = 5;
        this.MIN_ALTITUDE = 1.0;
        this.MAX_ALTITUDE = 5.0;

        // Bound event handlers (for cleanup)
        this.handleInteractionStart = this.handleInteractionStart.bind(this);
        this.handleInteractionEnd = this.handleInteractionEnd.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
    }

    /**
     * Initialize the globe renderer
     * WHY: Creates the globe.gl instance and sets up all event handlers
     */
    async initialize() {
        if (this.isInitialized || this.isDestroyed) return;

        console.log('[GlobePolitical] Initializing...');

        // Create container element for the globe
        this.globeElement = document.createElement('div');
        this.globeElement.className = 'globe-political-renderer';
        this.globeElement.style.cssText = 'width: 100%; height: 100%;';
        this.container.appendChild(this.globeElement);

        // Create globe instance
        this.globe = Globe()(this.globeElement);

        // Configure globe appearance
        // Using a deep, realistic ocean blue instead of flat diagram color
        const lightBaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#062035"/></svg>`;

        this.globe
            .globeImageUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(lightBaseSvg)}`)
            .backgroundColor('#000011')
            .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
            .showAtmosphere(true)
            .atmosphereColor('#3a7aca')
            .atmosphereAltitude(0.15);

        // Configure controls
        this.setupControls();

        // Enable pointer interaction
        this.globe.enablePointerInteraction(true);

        // Set initial camera position
        this.globe.pointOfView({ lat: 0, lng: 0, altitude: this.currentAltitude });

        // Add event listeners
        this.setupEventListeners();

        // Load country data
        await this.loadCountryData();

        // Start animation loop
        this.startAnimation();

        this.isInitialized = true;
        console.log('[GlobePolitical] Initialized successfully');
    }

    /**
     * Configure Three.js controls for the globe
     */
    setupControls() {
        const controls = this.globe.controls();
        if (controls) {
            controls.enableZoom = true;
            controls.zoomSpeed = 0.8;
            controls.minDistance = 200;
            controls.maxDistance = 1000;
            controls.enableRotate = true;
            controls.rotateSpeed = 0.5;
            controls.enablePan = false;
            controls.autoRotate = false;
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
        }
    }

    /**
     * Setup mouse/touch event listeners
     */
    setupEventListeners() {
        if (!this.globeElement) return;

        this.globeElement.addEventListener('mousedown', this.handleInteractionStart);
        this.globeElement.addEventListener('mouseup', this.handleInteractionEnd);
        this.globeElement.addEventListener('mousemove', this.handleMouseMove);
        this.globeElement.addEventListener('wheel', this.handleWheel, { passive: false });
        this.globeElement.addEventListener('touchstart', this.handleInteractionStart);
        this.globeElement.addEventListener('touchend', this.handleInteractionEnd);
        this.globeElement.addEventListener('touchmove', this.handleInteractionStart);
    }

    /**
     * Handle start of user interaction (mouse down, touch start)
     */
    handleInteractionStart(e) {
        this.isUserInteracting = true;
        this.lastInteractionTime = Date.now();

        if (e && e.clientX !== undefined) {
            this.mouseDownPos = { x: e.clientX, y: e.clientY };
            this.isDragging = false;
        }
    }

    /**
     * Handle end of user interaction
     */
    handleInteractionEnd() {
        this.mouseDownPos = null;

        // Small delay before resetting drag flag to allow click to register
        setTimeout(() => {
            this.isDragging = false;
        }, 50);

        setTimeout(() => {
            this.isUserInteracting = false;
            this.lastInteractionTime = Date.now();
        }, 100);
    }

    /**
     * Track mouse movement to detect drag vs click
     */
    handleMouseMove(e) {
        if (this.mouseDownPos && e.buttons > 0) {
            const dx = Math.abs(e.clientX - this.mouseDownPos.x);
            const dy = Math.abs(e.clientY - this.mouseDownPos.y);
            if (dx > this.DRAG_THRESHOLD || dy > this.DRAG_THRESHOLD) {
                this.isDragging = true;
            }
        }

        if (e.buttons > 0) {
            this.handleInteractionStart(e);
        }
    }

    /**
     * Handle mouse wheel for zoom
     */
    handleWheel(event) {
        event.preventDefault();
        this.handleInteractionStart();

        const zoomSpeed = 0.1;
        const delta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;
        this.currentAltitude = Math.max(
            this.MIN_ALTITUDE,
            Math.min(this.MAX_ALTITUDE, this.currentAltitude + delta)
        );

        const currentPOV = this.globe.pointOfView();

        this.globe.pointOfView({
            lat: currentPOV.lat,
            lng: currentPOV.lng,
            altitude: this.currentAltitude
        });
    }

    /**
     * Focus on a specific country
     * @param {Object} feature - GeoJSON feature
     */
    focusOnCountry(feature) {
        if (!feature || !this.globe) return;

        const center = this.getFeatureCenter(feature);

        // Stop current animation
        this.isUserInteracting = true; // Briefly look like interaction to pause auto-rotate

        this.globe.pointOfView({
            lat: center.lat,
            lng: center.lng,
            altitude: Math.min(this.currentAltitude, 2.0)
        }, 1500);

        // Resume state after flight
        setTimeout(() => {
            this.isUserInteracting = false;
            this.lastInteractionTime = Date.now();
        }, 1600);
    }

    /**
     * Load country boundary data and configure polygons
     */
    async loadCountryData() {
        try {
            // Use shared GeoJSON if available, otherwise fetch
            let countries;
            if (this.countriesGeoJson) {
                countries = this.countriesGeoJson;
            } else {
                const response = await fetch(
                    'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
                );
                countries = await response.json();
                this.countriesGeoJson = countries;
            }

            // Assign initial colors based on continent
            countries.features.forEach((feature, index) => {
                const baseColor = getBaseColorForFeature(feature.properties) || getCountryColor(index);
                feature.color = baseColor;
                feature.baseColor = baseColor;
            });

            console.log('[GlobePolitical] Loaded', countries.features.length, 'countries');

            // Configure polygon rendering
            // HOW COUNTRY CLICKS ARE REUSED:
            // The onPolygonClick handler delegates to this.handleCountryClick,
            // which is inherited from BaseRenderer and uses the shared countryStore
            this.globe
                .polygonsData(countries.features)
                .polygonGeoJsonGeometry(d => d.geometry)
                .polygonCapColor(d => d.color || getCountryColor(0))
                .polygonSideColor(() => 'rgba(0, 0, 0, 0.3)')
                .polygonStrokeColor(() => '#7C94A4')
                .polygonAltitude(0.05)
                .onPolygonClick((polygon) => {
                    // Delegate to base class handler which uses the country store
                    this.handleCountryClick(polygon);
                })
                .onPolygonHover((hoverD) => {
                    this.globe
                        .polygonAltitude(d => d === hoverD ? 0.08 : 0.05)
                        .polygonCapColor(d => d.color || getCountryColor(0));
                });

            // Asynchronously load flag colors
            this.loadFlagColors(countries);

        } catch (error) {
            console.error('[GlobePolitical] Error loading country data:', error);
        }
    }

    /**
     * Load flag-derived colors in background
     */
    async loadFlagColors(countries) {
        const flagMap = await loadFlagLookup();
        const features = countries.features;
        const concurrency = 6;
        let index = 0;

        const processNext = async () => {
            if (this.isDestroyed) return;

            const start = index;
            const end = Math.min(features.length, start + concurrency);
            const slice = features.slice(start, end);
            index = end;

            await Promise.all(
                slice.map(async feature => {
                    const iso3 = feature.id ||
                        feature.properties?.ISO_A3 ||
                        feature.properties?.ADM0_A3 ||
                        feature.properties?.iso_a3;
                    if (!iso3) return;

                    const lookup = flagMap.get(String(iso3).toUpperCase());
                    if (!lookup) return;

                    const countryObj = {
                        region: lookup.region,
                        flags: lookup.flags,
                    };

                    try {
                        const palette = await getCountryPalette(countryObj, { baseColor: feature.baseColor });
                        feature.color = palette.accent || feature.baseColor;
                    } catch {
                        feature.color = feature.baseColor;
                    }
                })
            );

            // Refresh globe colors after each batch
            if (this.globe) {
                this.globe.polygonCapColor(d => d.color || getCountryColor(0));
            }

            // Continue processing
            if (index < features.length && !this.isDestroyed) {
                setTimeout(processNext, 0);
            }
        };

        processNext();
    }

    /**
     * Start the animation loop for smooth controls and auto-rotation
     */
    startAnimation() {
        const animate = () => {
            if (this.isDestroyed) return;

            const controls = this.globe?.controls();
            if (controls) {
                controls.update();
            }

            // Auto-rotate if user hasn't interacted for 5 seconds
            const timeSinceInteraction = Date.now() - this.lastInteractionTime;
            if (!this.isUserInteracting && timeSinceInteraction > 5000) {
                const currentPOV = this.globe.pointOfView();
                // Continue rotation from current position
                this.rotation = (currentPOV.lng || 0) + 0.05;
                this.globe.pointOfView({
                    lat: currentPOV.lat,
                    lng: this.rotation,
                    altitude: currentPOV.altitude
                });
            }

            this.animationFrameId = requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Show this renderer
     */
    show() {
        if (this.globeElement) {
            this.globeElement.style.display = 'block';
        }

        super.show();
        // Resume animation if it was stopped
        if (!this.animationFrameId && this.isInitialized) {
            this.startAnimation();
        }
    }

    /**
     * Hide this renderer
     */
    hide() {
        if (this.globeElement) {
            this.globeElement.style.display = 'none';
        }

        super.hide();
        // Stop animation to save resources
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Destroy the renderer and clean up all resources
     * WHY: Prevents memory leaks when switching away from this mode permanently
     */
    destroy() {
        if (this.isDestroyed) return;

        console.log('[GlobePolitical] Destroying...');

        this.isDestroyed = true;

        // Stop animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove event listeners
        if (this.globeElement) {
            this.globeElement.removeEventListener('mousedown', this.handleInteractionStart);
            this.globeElement.removeEventListener('mouseup', this.handleInteractionEnd);
            this.globeElement.removeEventListener('mousemove', this.handleMouseMove);
            this.globeElement.removeEventListener('wheel', this.handleWheel);
            this.globeElement.removeEventListener('touchstart', this.handleInteractionStart);
            this.globeElement.removeEventListener('touchend', this.handleInteractionEnd);
            this.globeElement.removeEventListener('touchmove', this.handleInteractionStart);
        }

        // Remove from DOM
        if (this.globeElement && this.globeElement.parentNode) {
            this.globeElement.parentNode.removeChild(this.globeElement);
        }

        // Clear references
        this.globe = null;
        this.globeElement = null;

        console.log('[GlobePolitical] Destroyed');
    }

    /**
     * Get the shared GeoJSON data for other renderers
     */
    getCountriesGeoJson() {
        return this.countriesGeoJson;
    }
}

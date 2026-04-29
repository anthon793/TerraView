/**
 * GlobeSatelliteRenderer - 3D Globe with Satellite Imagery
 * 
 * WHY: Provides a photorealistic satellite view of Earth while maintaining
 * the interactive country selection functionality. Users can see actual
 * terrain and geographic features.
 * 
 * HOW SATELLITE TILES ARE APPLIED:
 * - Uses a satellite imagery URL as the globe's spherical texture
 * - The texture wraps around the 3D sphere using equirectangular projection
 * - Multiple tile providers are supported (NASA Blue Marble, ESRI, etc.)
 * 
 * HOW BOUNDARIES ARE OVERLAYED ON SATELLITE:
 * - Country polygons are rendered ABOVE the satellite texture
 * - Polygons use transparent fill with visible stroke lines
 * - This creates a boundary overlay effect on top of the imagery
 * - Altitude is set slightly higher (0.01) to ensure visibility
 * 
 * HOW COUNTRY CLICKS ARE REUSED:
 * - Same onPolygonClick handler as GlobePoliticalRenderer
 * - Delegates to BaseRenderer.handleCountryClick which uses countryStore
 * - Consistent popup behavior across all modes
 */

import Globe from 'globe.gl';
import BaseRenderer from './BaseRenderer';

// ============================================================================
// Constants
// ============================================================================

// Satellite imagery sources (NASA Blue Marble is most reliable)
const SATELLITE_IMAGERY_URL =
    '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

// Alternative: Natural Earth II
const ALT_SATELLITE_URL =
    '//unpkg.com/three-globe/example/img/earth-day.jpg';

// Boundary overlay style - semi-transparent to show satellite beneath
const BOUNDARY_STYLE = {
    fillOpacity: 0.05,      // Very transparent polygon fill
    strokeColor: '#FFFFFF', // White boundary lines for contrast
    strokeWidth: 0.8,
    hoverFillOpacity: 0.2,  // Slightly visible on hover
};



// ============================================================================
// GlobeSatelliteRenderer Class
// ============================================================================

export default class GlobeSatelliteRenderer extends BaseRenderer {
    static get modeName() {
        return 'Globe Satellite';
    }

    static get modeId() {
        return 'globe-satellite';
    }

    constructor(container, options = {}) {
        super(container, options);

        this.globe = null;
        this.globeElement = null;
        this.animationFrameId = null;
        this.focusMarker = null;

        // Interaction state
        this.isUserInteracting = false;
        this.lastInteractionTime = Date.now();
        this.mouseDownPos = null;
        this.currentAltitude = 2.5;
        this.rotation = 0;

        this.DRAG_THRESHOLD = 5;
        this.MIN_ALTITUDE = 1.0;
        this.MAX_ALTITUDE = 5.0;
        this.AUTO_ROTATE_DELAY = 1500;

        // Bound event handlers
        this.handleInteractionStart = this.handleInteractionStart.bind(this);
        this.handleInteractionEnd = this.handleInteractionEnd.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
    }

    /**
     * Initialize the satellite globe renderer
     */
    async initialize() {
        if (this.isInitialized || this.isDestroyed) return;

        console.log('[GlobeSatellite] Initializing...');

        // Create container element
        this.globeElement = document.createElement('div');
        this.globeElement.className = 'globe-satellite-renderer';
        this.globeElement.style.cssText = 'width: 100%; height: 100%;';
        this.container.appendChild(this.globeElement);

        // Create globe instance
        this.globe = Globe()(this.globeElement);

        // Configure globe with SATELLITE IMAGERY as the base texture
        // WHY: This creates the photorealistic Earth view
        // HOW: The image is mapped as a spherical texture using equirectangular projection
        this.globe
            .globeImageUrl(SATELLITE_IMAGERY_URL)
            .backgroundColor('#000011')
            .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
            .showAtmosphere(true)
            .atmosphereColor('lightskyblue')
            .atmosphereAltitude(0.15);

        // Configure controls
        this.setupControls();

        // Enable pointer interaction for polygon clicks
        this.globe.enablePointerInteraction(true);

        // Set initial camera position
        this.globe.pointOfView({ lat: 0, lng: 0, altitude: this.currentAltitude });

        // Add event listeners
        this.setupEventListeners();

        // Load country boundaries as OVERLAY on satellite
        await this.loadBoundaryOverlay();

        // Start animation loop
        this.startAnimation();

        this.isInitialized = true;
        console.log('[GlobeSatellite] Initialized successfully');
    }

    /**
     * Configure Three.js controls
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
     * Setup event listeners
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

    handleInteractionStart(e) {
        this.isUserInteracting = true;
        this.lastInteractionTime = Date.now();
        this.clearFocusMarkerAfterPanelClose();

        if (e && e.clientX !== undefined) {
            this.mouseDownPos = { x: e.clientX, y: e.clientY };
            this.isDragging = false;
        }
    }

    handleInteractionEnd() {
        this.mouseDownPos = null;
        setTimeout(() => { this.isDragging = false; }, 50);
        setTimeout(() => {
            this.isUserInteracting = false;
            this.lastInteractionTime = Date.now();
        }, 100);
    }

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
        this.showFocusMarker(feature);

        // Stop current animation
        this.isUserInteracting = true; // Briefly look like interaction to pause auto-rotate

        this.globe.pointOfView({
            lat: center.lat,
            lng: center.lng,
            altitude: Math.min(this.currentAltitude, 2.0) // Zoom in slightly if far out
        }, 1500); // 1.5s flight time

        // Resume state after flight
        setTimeout(() => {
            this.isUserInteracting = false;
            this.lastInteractionTime = Date.now();
        }, 1600);
    }

    showFocusMarker(feature) {
        if (!this.globe) return;

        const point = this.getFeatureMarkerPoint(feature);
        const name = this.getFeatureName(feature);
        this.focusMarker = [{ ...point, name }];

        this.globe
            .pointsData(this.focusMarker)
            .pointLat(d => d.lat)
            .pointLng(d => d.lng)
            .pointAltitude(0.08)
            .pointRadius(0.45)
            .pointResolution(32)
            .pointColor(() => '#FF3B30')
            .pointLabel(d => d.name);

        if (typeof this.globe.ringsData === 'function') {
            this.globe
                .ringsData(this.focusMarker)
                .ringLat(d => d.lat)
                .ringLng(d => d.lng)
                .ringAltitude(0.09)
                .ringColor(() => 'rgba(255, 59, 48, 0.85)')
                .ringMaxRadius(4)
                .ringPropagationSpeed(1.8)
                .ringRepeatPeriod(900);
        }
    }

    clearFocusMarker() {
        if (!this.globe || !this.focusMarker) return;

        this.focusMarker = null;
        this.globe.pointsData([]);

        if (typeof this.globe.ringsData === 'function') {
            this.globe.ringsData([]);
        }
    }

    /**
     * Load country boundaries as vector overlay on top of satellite imagery
     * 
     * HOW BOUNDARIES ARE OVERLAYED ON SATELLITE:
     * - Polygons are rendered with very low opacity (almost transparent fill)
     * - Visible white stroke lines show country borders
     * - Small altitude offset (0.01) ensures polygons render above satellite
     * - This creates a "boundaries on satellite" effect without hiding imagery
     */
    async loadBoundaryOverlay() {
        try {
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

            console.log('[GlobeSatellite] Loading boundary overlay for', countries.features.length, 'countries');

            // Configure polygon rendering for OVERLAY effect
            // WHY: We want to see satellite imagery THROUGH the polygons
            // HOW: Using very low opacity fill with visible stroke lines
            this.globe
                .polygonsData(countries.features)
                .polygonGeoJsonGeometry(d => d.geometry)
                // Very transparent fill - satellite shows through
                .polygonCapColor(() => `rgba(255, 255, 255, ${BOUNDARY_STYLE.fillOpacity})`)
                .polygonSideColor(() => 'rgba(255, 255, 255, 0.1)')
                // White stroke lines for visible boundaries
                .polygonStrokeColor(() => BOUNDARY_STYLE.strokeColor)
                // Slight altitude to render above satellite texture
                .polygonAltitude(0.01)
                .onPolygonClick((polygon) => {
                    // HOW COUNTRY CLICKS ARE REUSED:
                    // Delegates to BaseRenderer.handleCountryClick
                    // which uses the shared countryStore
                    this.handleCountryClick(polygon);
                })
                .onPolygonHover((hoverD) => {
                    // Highlight on hover - slightly more visible
                    this.globe
                        .polygonAltitude(d => d === hoverD ? 0.02 : 0.01)
                        .polygonCapColor(d =>
                            d === hoverD
                                ? `rgba(255, 255, 200, ${BOUNDARY_STYLE.hoverFillOpacity})`
                                : `rgba(255, 255, 255, ${BOUNDARY_STYLE.fillOpacity})`
                        );
                });

        } catch (error) {
            console.error('[GlobeSatellite] Error loading boundary overlay:', error);
        }
    }

    /**
     * Animation loop
     */
    startAnimation() {
        const animate = () => {
            if (this.isDestroyed) return;

            const controls = this.globe?.controls();
            if (controls) {
                controls.update();
            }

            // Auto-rotate shortly after the user stops interacting
            const timeSinceInteraction = Date.now() - this.lastInteractionTime;
            if (!this.isUserInteracting && timeSinceInteraction > this.AUTO_ROTATE_DELAY) {
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

    show() {
        if (this.globeElement) {
            this.globeElement.style.display = 'block';
        }
        super.show();
        if (!this.animationFrameId && this.isInitialized) {
            this.startAnimation();
        }
    }

    hide() {
        if (this.globeElement) {
            this.globeElement.style.display = 'none';
        }
        super.hide();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Clean up resources
     * WHY: Prevents memory leaks when switching modes
     */
    destroy() {
        if (this.isDestroyed) return;

        console.log('[GlobeSatellite] Destroying...');

        this.isDestroyed = true;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.globeElement) {
            this.globeElement.removeEventListener('mousedown', this.handleInteractionStart);
            this.globeElement.removeEventListener('mouseup', this.handleInteractionEnd);
            this.globeElement.removeEventListener('mousemove', this.handleMouseMove);
            this.globeElement.removeEventListener('wheel', this.handleWheel);
            this.globeElement.removeEventListener('touchstart', this.handleInteractionStart);
            this.globeElement.removeEventListener('touchend', this.handleInteractionEnd);
            this.globeElement.removeEventListener('touchmove', this.handleInteractionStart);
        }

        if (this.globeElement && this.globeElement.parentNode) {
            this.globeElement.parentNode.removeChild(this.globeElement);
        }

        this.globe = null;
        this.globeElement = null;
        this.focusMarker = null;

        console.log('[GlobeSatellite] Destroyed');
    }

    getCountriesGeoJson() {
        return this.countriesGeoJson;
    }
}

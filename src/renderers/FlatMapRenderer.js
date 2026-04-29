/**
 * FlatMapRenderer - 2D World Map with Pan and Zoom
 * 
 * WHY: Provides a traditional flat map view for users who prefer
 * 2D navigation or need to see the entire world at once. Useful for
 * comparison and spatial analysis.
 * 
 * HOW IT WORKS:
 * - Uses Leaflet.js for 2D map rendering with pan/zoom
 * - Country boundaries are rendered as GeoJSON vector layers
 * - Equirectangular-style projection (EPSG:3857 Web Mercator)
 * - No rotation - only pan (drag) and zoom (scroll)
 * 
 * HOW BOUNDARIES ARE RENDERED:
 * - GeoJSON country polygons are added as a Leaflet GeoJSON layer
 * - Each country is styled with fill color and stroke
 * - Colors match the political globe view for consistency
 * 
 * HOW COUNTRY CLICKS ARE REUSED:
 * - Leaflet's onEachFeature attaches click handlers to each polygon
 * - Click handler extracts country name and calls selectCountryByName
 * - This uses the shared countryStore for consistent popup behavior
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BaseRenderer from './BaseRenderer';
import { getCountryPalette } from '../utils/flagColorExtractor';

// ============================================================================
// Constants
// ============================================================================

// Tile layer for the base map (uses OpenStreetMap for reliability)
// For a cleaner look, we use CartoDB Positron (light theme)
const TILE_LAYER_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Alternative: Dark theme
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';

// Country polygon styling
const COUNTRY_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C9BA',
    '#3498DB', '#E74C3C', '#1ABC9C', '#F39C12', '#9B59B6',
];

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

function getBaseColorForFeature(props = {}) {
    const continent = props.CONTINENT || props.continent ||
        props.REGION_UN || props.region_un ||
        props.REGION || props.region;
    return CONTINENT_BASE_COLORS[continent] || CONTINENT_BASE_COLORS.default;
}

function getCountryColor(index) {
    return COUNTRY_COLORS[index % COUNTRY_COLORS.length];
}

// Flag Cache (Shared in module scope)
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
        console.warn('[FlatMap] Failed to load flag lookup:', err);
        flagLookupCache = new Map();
        return flagLookupCache;
    }
}

// ============================================================================
// FlatMapRenderer Class
// ============================================================================

export default class FlatMapRenderer extends BaseRenderer {
    static get modeName() {
        return '2D Map';
    }

    static get modeId() {
        return 'flat-map';
    }

    constructor(container, options = {}) {
        super(container, options);

        // Leaflet map instance
        this.map = null;

        // DOM element for the map
        this.mapElement = null;

        // GeoJSON layer for country boundaries
        this.geoJsonLayer = null;

        // Currently hovered feature
        this.hoveredFeature = null;

        // Map of feature ID/Index to Leaflet Layer (for updating colors)
        this.layerMap = new Map();

        // Visible marker for Surprise Me / focused country
        this.focusMarker = null;

        this.handleMapNavigationStart = this.handleMapNavigationStart.bind(this);
    }

    /**
     * Initialize the 2D map renderer
     */
    async initialize() {
        if (this.isInitialized || this.isDestroyed) return;

        console.log('[FlatMap] Initializing...');

        // Create container element for Leaflet
        this.mapElement = document.createElement('div');
        this.mapElement.className = 'flat-map-renderer';
        this.mapElement.style.cssText = 'width: 100%; height: 100%; background: #1B4A72;';
        this.container.appendChild(this.mapElement);

        // Create Leaflet map instance
        this.map = L.map(this.mapElement, {
            center: [20, 0],           // Initial center (slight north for better view)
            zoom: 2,                   // Initial zoom level
            minZoom: 1.5,              // Prevent zooming out too far
            maxZoom: 8,                // Max zoom for detail
            worldCopyJump: true,       // Smooth wrapping at antimeridian
            zoomControl: true,         // Show zoom buttons
            attributionControl: true,  // Show attribution
        });

        // Add tile layer (base map)
        L.tileLayer(TILE_LAYER_URL, {
            attribution: TILE_ATTRIBUTION,
            maxZoom: 18,
        }).addTo(this.map);

        this.map.on('movestart', this.handleMapNavigationStart);
        this.map.on('zoomstart', this.handleMapNavigationStart);

        // Load country boundaries
        await this.loadCountryBoundaries();

        this.isInitialized = true;
        console.log('[FlatMap] Initialized successfully');
    }

    /**
     * Load and render country boundaries as GeoJSON
     */
    async loadCountryBoundaries() {
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

            console.log('[FlatMap] Loading', countries.features.length, 'countries');

            // Store feature index for coloring
            let featureIndex = 0;

            // Prepare features with base colors
            countries.features.forEach((feature) => {
                const baseColor = getBaseColorForFeature(feature.properties) || getCountryColor(featureIndex++);
                feature.baseColor = baseColor;
                feature.color = feature.color || baseColor; // Use existing color if shared
            });

            // Create GeoJSON layer with styling and interaction
            this.geoJsonLayer = L.geoJSON(countries, {
                // Style each polygon
                style: (feature) => {
                    return {
                        fillColor: feature.color || feature.baseColor,
                        fillOpacity: 0.7,
                        color: '#7C94A4',     // Stroke color
                        weight: 1,            // Stroke width
                        opacity: 1,
                    };
                },

                // Attach event handlers to each feature
                onEachFeature: (feature, layer) => {
                    // Store layer reference for dynamic updating
                    // We use the feature object itself as key (weak map style) or an ID
                    // Here we just use a tracking ID if available, else standard linking
                    this.layerMap.set(feature, layer);

                    // Get country name from properties
                    const countryName = feature.properties.NAME ||
                        feature.properties.name ||
                        feature.properties.ADMIN ||
                        feature.properties.NAME_ENG ||
                        feature.properties.NAME_EN;

                    // Click handler
                    layer.on('click', (e) => {
                        // Prevent event propagation
                        L.DomEvent.stopPropagation(e);
                        console.log('[FlatMap] Country clicked:', countryName);

                        // Use consistent handler from BaseRenderer
                        this.handleCountryClick(feature);
                    });

                    // Hover handlers for visual feedback
                    layer.on('mouseover', () => {
                        this.hoveredFeature = feature;
                        layer.setStyle({
                            fillOpacity: 0.9,
                            weight: 2,
                            color: '#FFFFFF'
                        });
                        layer.bringToFront();
                    });

                    layer.on('mouseout', () => {
                        this.hoveredFeature = null;
                        layer.setStyle({
                            fillOpacity: 0.7,
                            weight: 1,
                            color: '#7C94A4'
                        });
                    });

                    // Tooltip with country name
                    if (countryName) {
                        layer.bindTooltip(countryName, {
                            sticky: true,
                            className: 'country-tooltip',
                        });
                    }
                },
            });

            // Add layer to map
            this.geoJsonLayer.addTo(this.map);

            // Asynchronously load flag colors for vibrant map
            this.loadFlagColors(countries);

        } catch (error) {
            console.error('[FlatMap] Error loading country boundaries:', error);
        }
    }

    /**
     * Load flag-derived colors in background for Flat Map
     */
    async loadFlagColors(countries) {
        const flagMap = await loadFlagLookup();
        const features = countries.features;
        const concurrency = 10;
        let index = 0;

        const processNext = async () => {
            if (this.isDestroyed) return;

            const start = index;
            const end = Math.min(features.length, start + concurrency);
            const slice = features.slice(start, end);
            index = end;

            await Promise.all(
                slice.map(async feature => {
                    // Skip if we already have a specialized color (from shared state)
                    if (feature.color && feature.color !== feature.baseColor) return;

                    const iso3 = feature.id ||
                        feature.properties?.ISO_A3 ||
                        feature.properties?.ADM0_A3 ||
                        feature.properties?.iso_a3;
                    if (!iso3) return;

                    const lookup = flagMap.get(String(iso3).toUpperCase());
                    if (!lookup) return;

                    try {
                        const palette = await getCountryPalette({
                            region: lookup.region,
                            flags: lookup.flags,
                        }, { baseColor: feature.baseColor });

                        feature.color = palette.accent || feature.baseColor;

                        // Update Leaflet layer style immediately if valid
                        const layer = this.layerMap.get(feature);
                        if (layer) {
                            layer.setStyle({
                                fillColor: feature.color
                            });
                        }
                    } catch {
                        // Keep base color
                    }
                })
            );

            // Continue processing
            if (index < features.length && !this.isDestroyed) {
                setTimeout(processNext, 0);
            }
        };

        processNext();
    }

    /**
     * Show this renderer
     */
    show() {
        if (this.mapElement) {
            this.mapElement.style.display = 'block';
        }
        super.show();

        // Leaflet needs to know about resize after becoming visible
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    hide() {
        if (this.mapElement) {
            this.mapElement.style.display = 'none';
        }
        super.hide();
    }

    handleCountryClick(feature) {
        // Calling super handles the store update
        super.handleCountryClick(feature);
    }

    /**
     * Focus on a specific country
     * @param {Object} feature - GeoJSON feature
     */
    focusOnCountry(feature) {
        if (!feature || !this.map) return;

        // Create a temporary layer to get bounds easily
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();

        // Fly to the bounds of the country
        this.map.flyToBounds(bounds, {
            padding: [50, 50],
            maxZoom: 5, // Don't zoom in too close for large countries
            duration: 1.5
        });

        this.showFocusMarker(feature);
    }

    showFocusMarker(feature) {
        if (!this.map) return;

        const point = this.getFeatureMarkerPoint(feature);
        const name = this.getFeatureName(feature);

        if (this.focusMarker) {
            this.map.removeLayer(this.focusMarker);
            this.focusMarker = null;
        }

        this.focusMarker = L.circleMarker([point.lat, point.lng], {
            radius: 9,
            color: '#FFFFFF',
            weight: 3,
            fillColor: '#FF3B30',
            fillOpacity: 0.95,
            opacity: 1,
            className: 'country-focus-marker',
        }).addTo(this.map);

        this.focusMarker.bindTooltip(name, {
            permanent: true,
            direction: 'top',
            offset: [0, -12],
            className: 'country-focus-tooltip',
        });
    }

    handleMapNavigationStart() {
        this.clearFocusMarkerAfterPanelClose();
    }

    clearFocusMarker() {
        if (!this.focusMarker || !this.map) return;

        this.map.removeLayer(this.focusMarker);
        this.focusMarker = null;
    }

    /**
     * Handle window resize
     */
    onResize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    /**
     * Clean up resources
     * WHY: Leaflet map needs explicit removal to prevent memory leaks
     */
    destroy() {
        if (this.isDestroyed) return;

        console.log('[FlatMap] Destroying...');

        this.isDestroyed = true;

        if (this.map) {
            this.map.off('movestart', this.handleMapNavigationStart);
            this.map.off('zoomstart', this.handleMapNavigationStart);
        }

        // Remove GeoJSON layer
        if (this.geoJsonLayer && this.map) {
            this.map.removeLayer(this.geoJsonLayer);
            this.geoJsonLayer = null;
        }

        if (this.focusMarker && this.map) {
            this.map.removeLayer(this.focusMarker);
            this.focusMarker = null;
        }

        // Remove Leaflet map
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Remove DOM element
        if (this.mapElement && this.mapElement.parentNode) {
            this.mapElement.parentNode.removeChild(this.mapElement);
        }
        this.mapElement = null;

        console.log('[FlatMap] Destroyed');
    }

    getCountriesGeoJson() {
        return this.countriesGeoJson;
    }
}

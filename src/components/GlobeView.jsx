import { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'globe.gl';
import * as d3 from 'd3';
import CountryInfoPopup from './CountryInfoPopup';
import { fetchCountryData } from '../utils/countryMatcher';
import { getCountryPalette } from '../utils/flagColorExtractor';
import { getLocalFacts } from '../data/countryFacts';

/**
 * GlobeView Component
 * 
 * Renders a 3D rotating globe with colorful country boundaries and labels.
 * This is the initial view where users can see and interact with the world map.
 * 
 * Why this approach:
 * - globe.gl provides an easy-to-use wrapper around three.js for globe visualization
 * - Using useRef to store the globe instance allows us to control it after mount
 * - useEffect handles the initialization and cleanup of the globe
 * - Loading GeoJSON from CDN avoids storing large files locally (MVP approach)
 * - polygonsData renders country boundaries as 3D polygons on the globe
 * - labelsData displays country names on the globe
 * - D3.js is used to calculate country centroids for label placement
 */

// Vibrant, dynamic palette - no muted/ashy colors
const COUNTRY_COLORS = [
  '#FF6B6B', // Vibrant Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#FFA07A', // Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Bright Yellow
  '#BB8FCE', // Orchid
  '#85C1E2', // Powder Blue
  '#F8B88B', // Peach
  '#52C9BA', // Jade
  '#3498DB', // Dodger Blue
  '#E74C3C', // Alizarin Red
  '#1ABC9C', // Turquoise
  '#F39C12', // Orange
  '#9B59B6', // Amethyst
  '#E91E63', // Hot Pink
  '#00BCD4', // Cyan
  '#4CAF50', // Green
  '#FF5722', // Deep Orange
  '#673AB7', // Indigo
  '#00E676', // Bright Green
  '#FF1744', // Deep Pink
  '#00B0FF', // Bright Blue
  '#76FF03', // Lime
  '#FFB300', // Amber
  '#00E5FF', // Aqua
  '#FF6E40', // Light Orange
  '#AB47BC', // Deep Purple
  '#26A69A', // Teal
  '#FFEB3B', // Vivid Yellow
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

// Cache for flag lookup by ISO3
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
    console.warn('Failed to load flag lookup, will use base colors only', err);
    flagLookupCache = new Map();
    return flagLookupCache;
  }
}

/**
 * Generate a color for a country based on its index
 * This ensures each country gets a distinct color
 */
function getCountryColor(index) {
  return COUNTRY_COLORS[index % COUNTRY_COLORS.length];
}

// Prefer earth-toned base per continent to keep globe grounded before flag accents load
function getBaseColorForFeature(props = {}) {
  const continent = props.CONTINENT || props.continent || props.REGION_UN || props.region_un || props.REGION || props.region;
  return CONTINENT_BASE_COLORS[continent] || CONTINENT_BASE_COLORS.default;
}

/**
 * Calculate the centroid of a GeoJSON feature
 * Used to position country name labels
 */
function getCentroid(feature) {
  if (feature.geometry.type === 'Polygon') {
    return d3.geoCentroid(feature);
  } else if (feature.geometry.type === 'MultiPolygon') {
    // For MultiPolygon, calculate centroid of the largest polygon
    const polygons = feature.geometry.coordinates;
    let largestArea = 0;
    let largestPolygon = polygons[0];
    
    polygons.forEach(polygon => {
      const area = d3.geoArea({ type: 'Polygon', coordinates: polygon });
      if (area > largestArea) {
        largestArea = area;
        largestPolygon = polygon;
      }
    });
    
    return d3.geoCentroid({ type: 'Polygon', coordinates: largestPolygon });
  }
  return d3.geoCentroid(feature);
}

function GlobeView() {
  const globeEl = useRef(null);
  const globeRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [countryData, setCountryData] = useState(null);
  const [isLoadingCountry, setIsLoadingCountry] = useState(false);
  
  // Handle country click - memoized to avoid recreation on every render
  const handleCountryClick = useCallback(async (polygon, event, info) => {
    console.log('Polygon clicked!', polygon, event, info);
    
    if (!polygon || !polygon.properties) {
      console.warn('No polygon or properties found');
      return;
    }
    
    // Get country name from GeoJSON properties
    const countryName = polygon.properties.NAME || 
                       polygon.properties.name || 
                       polygon.properties.ADMIN || 
                       polygon.properties.NAME_ENG || 
                       polygon.properties.NAME_EN;
    
    if (!countryName) {
      console.warn('Country name not found in polygon properties', polygon.properties);
      return;
    }
    
    console.log('Opening panel for:', countryName);
    console.log('Setting isPanelOpen to true');
    
    setIsLoadingCountry(true);
    setIsPanelOpen(true);
    setSelectedCountry(countryName);
    
    console.log('State updated, fetching country data...');
    
    // Fetch country data from API
    const data = await fetchCountryData(countryName);
    console.log('Country data fetched:', data);
    setCountryData(data);
    setIsLoadingCountry(false);
  }, []);
  
  // Close panel
  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedCountry(null);
    setCountryData(null);
  }, []);

  useEffect(() => {
    // Initialize the globe only if the ref is available
    if (!globeEl.current) return;

    // Create a new Globe instance
    const globe = Globe()(globeEl.current);

    // Store globe instance for cleanup
    globeRef.current = globe;

    // Configure basic globe settings
    // Use a very light, simple base texture so polygons show clearly on top
    const lightBaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#8BBED8"/></svg>`;
    
    globe
      .globeImageUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(lightBaseSvg)}`)
      .backgroundColor('#ECF7FD') // Ocean background color
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .showAtmosphere(false) // Disable atmosphere to see colors better
      .atmosphereColor('#AAE0F9')
      .atmosphereAltitude(0.1);

    // Enable user interaction (click and drag to rotate, scroll to zoom)
    // Access controls through the globe instance
    const controls = globe.controls();
    
    // Configure controls for smooth interaction
    if (controls) {
      // Enable zoom with mouse wheel
      controls.enableZoom = true;
      controls.zoomSpeed = 0.8; // Control zoom speed (lower = slower)
      controls.minDistance = 200; // Minimum zoom distance (closer = more zoomed in)
      controls.maxDistance = 1000; // Maximum zoom distance (farther = more zoomed out)
      
      // Enable rotation with click and drag
      controls.enableRotate = true;
      controls.rotateSpeed = 0.5; // Rotation speed when dragging
      
      // Disable panning (we only want rotation and zoom)
      controls.enablePan = false;
      
      // Disable auto-rotate so user has full control
      controls.autoRotate = false;
      
      // Enable damping for smooth stops
      controls.enableDamping = true;
      controls.dampingFactor = 0.05; // How quickly rotation stops after release
      
      // Make sure controls don't block polygon clicks
      // We'll handle click detection manually to distinguish from drag
    }
    
    // Enable pointer interaction for click/drag
    // This is crucial for polygon clicks to work
    globe.enablePointerInteraction(true);
    
    // Test: Add a simple click handler to verify clicks are working
    if (globeEl.current) {
      const testClickHandler = (e) => {
        console.log('Canvas clicked at:', e.clientX, e.clientY);
      };
      globeEl.current.addEventListener('click', testClickHandler);
      
      // Store for cleanup
      globeEl.current._testClickHandler = testClickHandler;
    }

    // Set initial camera position and zoom level
    let currentAltitude = 2.5; // Store current altitude for zoom control
    const minAltitude = 1.0; // Maximum zoom in (closer)
    const maxAltitude = 5.0; // Maximum zoom out (farther)
    
    globe.pointOfView({ lat: 0, lng: 0, altitude: currentAltitude });
    
    // Track user interaction state (defined early for use in handlers)
    let isUserInteracting = false;
    let lastInteractionTime = Date.now();
    let mouseDownPos = null;
    const DRAG_THRESHOLD = 5; // pixels - if mouse moves more than this, it's a drag
    
    // Track user interaction to pause auto-rotation
    const handleInteractionStart = (e) => {
      isUserInteracting = true;
      lastInteractionTime = Date.now();
      // Store mouse position to detect drag vs click
      if (e && e.clientX !== undefined) {
        mouseDownPos = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;
      }
    };
    
    // Handle mouse wheel zoom
    const handleWheel = (event) => {
      event.preventDefault();
      handleInteractionStart();
      
      // Calculate zoom direction and amount
      const zoomSpeed = 0.1;
      const delta = event.deltaY > 0 ? zoomSpeed : -zoomSpeed;
      currentAltitude = Math.max(minAltitude, Math.min(maxAltitude, currentAltitude + delta));
      
      // Update camera position with new zoom level
      const currentPOV = globe.pointOfView();
      globe.pointOfView({ 
        lat: currentPOV.lat || 0, 
        lng: currentPOV.lng || 0, 
        altitude: currentAltitude 
      }, 100); // Smooth transition
    };
    
    // Add wheel event listener
    if (globeEl.current) {
      globeEl.current.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Load country boundaries from GeoJSON
    // Using a reliable CDN source for world countries GeoJSON
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(res => res.json())
      .then(countries => {
        // Prepare labels data for country names
        // Handle different possible property names in GeoJSON (NAME, name, ADMIN, etc.)
        const labels = countries.features
          .filter(feature => {
            const props = feature.properties;
            return props.NAME || props.name || props.ADMIN || props.NAME_ENG || props.NAME_EN;
          })
          .map(feature => {
            const props = feature.properties;
            const countryName = props.NAME || props.name || props.ADMIN || props.NAME_ENG || props.NAME_EN || 'Unknown';
            const [lng, lat] = getCentroid(feature);
            // Scale label size - larger countries get bigger labels
            const area = feature.properties.AREA || feature.properties.area || 1;
            const size = Math.max(0.4, Math.min(1.2, Math.log10(area + 1) / 3));
            
            return {
              lat,
              lng,
              text: countryName,
              size: size
            };
          });

        // Add country polygons to the globe with earth-toned bases (per continent)
        // Initial color keeps the globe grounded even before flag accents load
        countries.features.forEach((feature, index) => {
          const baseColor = getBaseColorForFeature(feature.properties) || getCountryColor(index);
          feature.color = baseColor;
          feature.baseColor = baseColor;
        });

        // Log to verify colors are being assigned
        console.log('Total countries:', countries.features.length);
        console.log('Sample country color:', countries.features[0]?.color);

        globe
          .polygonsData(countries.features)
          .polygonGeoJsonGeometry(d => d.geometry)
          // Start with base land colors; will update with flag accents asynchronously
          .polygonCapColor(d => d.color || getCountryColor(0))
          .polygonSideColor(() => 'rgba(0, 0, 0, 0.3)')
          .polygonStrokeColor(() => '#7C94A4')
          .polygonAltitude(0.05)
          .onPolygonClick((polygon, event, info) => {
            if (!isDraggingRef.current) {
              handleCountryClick(polygon, event, info);
            }
          })
          .onPolygonHover((hoverD) => {
            globe
              .polygonAltitude(d => d === hoverD ? 0.08 : 0.05)
              .polygonCapColor(d => (d === hoverD ? (d.color || getCountryColor(0)) : (d.color || getCountryColor(0))));
          });

        // Asynchronously enrich colors using flag-derived palettes in small batches (non-blocking)
        (async () => {
          const flagMap = await loadFlagLookup();
          const features = countries.features;
          const concurrency = 6;
          let index = 0;

          const processNext = async () => {
            const start = index;
            const end = Math.min(features.length, start + concurrency);
            const slice = features.slice(start, end);
            index = end;

            await Promise.all(
              slice.map(async feature => {
                const iso3 = feature.id || feature.properties?.ISO_A3 || feature.properties?.ADM0_A3 || feature.properties?.iso_a3;
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
                } catch (err) {
                  feature.color = feature.baseColor;
                }
              })
            );

            // After each batch, refresh globe colors
            globe.polygonCapColor(d => d.color || getCountryColor(0));

            // Continue if more remain; yield to browser between batches
            if (index < features.length) {
              setTimeout(processNext, 0);
            }
          };

          processNext();
        })();
        
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading country data:', err);
        setIsLoading(false);
      });

    // Handle interaction end
    const handleInteractionEnd = () => {
      // Reset drag tracking
      mouseDownPos = null;
      // Small delay before resetting drag flag to allow click to register
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
      
      // Delay resetting interaction flag to allow smooth stop
      setTimeout(() => {
        isUserInteracting = false;
        lastInteractionTime = Date.now();
      }, 100);
    };
    
    // Track mouse movement to detect drag
    const handleMouseMove = (e) => {
      if (mouseDownPos && e.buttons > 0) {
        const dx = Math.abs(e.clientX - mouseDownPos.x);
        const dy = Math.abs(e.clientY - mouseDownPos.y);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          isDraggingRef.current = true;
        }
      }
    };
    
    // Animation loop for smooth controls and optional auto-rotation
    let animationFrameId;
    let rotation = 0;
    
    // Add event listeners for mouse and touch interactions
    if (globeEl.current) {
      globeEl.current.addEventListener('mousedown', handleInteractionStart);
      globeEl.current.addEventListener('mouseup', handleInteractionEnd);
      globeEl.current.addEventListener('mousemove', (e) => {
        handleMouseMove(e);
        if (e.buttons > 0) {
          handleInteractionStart(e);
        }
      });
      // Wheel event is handled separately by handleWheel for zoom functionality
      globeEl.current.addEventListener('touchstart', handleInteractionStart);
      globeEl.current.addEventListener('touchend', handleInteractionEnd);
      globeEl.current.addEventListener('touchmove', handleInteractionStart);
    }
    
    const animate = () => {
      // Update controls (required for damping to work)
      if (controls) {
        controls.update();
      }
      
      // Only auto-rotate if user hasn't interacted recently (5 seconds)
      const timeSinceInteraction = Date.now() - lastInteractionTime;
      if (!isUserInteracting && timeSinceInteraction > 5000) {
        rotation += 0.1; // Slow auto-rotation
        globe.pointOfView({ lat: 0, lng: rotation, altitude: 2.5 }, 0);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Cleanup function to stop animation
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // Remove event listeners
      if (globeEl.current) {
        globeEl.current.removeEventListener('mousedown', handleInteractionStart);
        globeEl.current.removeEventListener('mouseup', handleInteractionEnd);
        globeEl.current.removeEventListener('mousemove', handleInteractionStart);
        globeEl.current.removeEventListener('wheel', handleWheel);
        globeEl.current.removeEventListener('touchstart', handleInteractionStart);
        globeEl.current.removeEventListener('touchend', handleInteractionEnd);
        globeEl.current.removeEventListener('touchmove', handleInteractionStart);
      }
      // Clear the globe instance
      if (globeEl.current && globeEl.current.children) {
        // globe.gl handles cleanup automatically when the DOM element is removed
      }
    };
  }, []);

  return (
    <div
      className="w-full h-screen relative"
      style={{ backgroundColor: '#ECF7FD' }}
    >
      <div ref={globeEl} className="w-full h-full" />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
          Loading world map...
        </div>
      )}
      
      {/* Country Info Popup */}
      <CountryInfoPopup
        country={countryData}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        isLoadingCountry={isLoadingCountry}
        localFacts={countryData?.cca3 ? getLocalFacts(countryData.cca3) : []}
      />
    </div>
  );
}


export default GlobeView;


// Utility to extract dominant flag colors and build country palettes using Canvas API
// No external dependencies; uses in-memory caching for performance.

const flagColorCache = new Map();

// Base colors per continent (override as needed)
const CONTINENT_BASE_COLORS = {
  Africa: '#F4CE29',
  Americas: '#32A189',
  Asia: '#FF6B6B',
  Europe: '#8BBED8',
  Oceania: '#C77442',
  Antarctic: '#7C94A4',
  default: '#B1C4BB',
};

// Clamp a value between 0-255
const clamp255 = v => Math.max(0, Math.min(255, v));

// Convert hex to RGB object
function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

// Convert RGB object to hex string
function rgbToHex({ r, g, b }) {
  const toHex = v => clamp255(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Lighten by percentage (0-1)
function lighten(color, amount = 0.15) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
}

// Darken by percentage (0-1)
function darken(color, amount = 0.15) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return rgbToHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  });
}

// Blend two colors by ratio (0-1)
function mix(colorA, colorB, ratio = 0.5) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) return colorA || colorB;
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex({
    r: a.r * (1 - t) + b.r * t,
    g: a.g * (1 - t) + b.g * t,
    b: a.b * (1 - t) + b.b * t,
  });
}

// Compute brightness and saturation for filtering
function getLuma({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getSaturation({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max; // normalized 0-1
}

// Bucket color into coarse space to approximate quantization
function quantize({ r, g, b }, step = 32) {
  const q = v => Math.floor(v / step) * step + step / 2;
  return { r: q(r), g: q(g), b: q(b) };
}

// Main extraction function
async function extractFlagColors(flagUrl, fallbackColor = '#888888') {
  if (!flagUrl) {
    return { primary: fallbackColor, secondary: null };
  }

  // Cache key by URL
  if (flagColorCache.has(flagUrl)) return flagColorCache.get(flagUrl);

  try {
    const img = await loadImage(flagUrl);
    const { colors } = sampleImageColors(img);

    // Choose top colors after filtering
    const primary = colors[0] || hexToRgb(fallbackColor) || { r: 136, g: 136, b: 136 };
    const secondary = colors.find(c => colorDistance(c, primary) > 40) || null;

    const result = {
      primary: rgbToHex(primary),
      secondary: secondary ? rgbToHex(secondary) : null,
    };

    flagColorCache.set(flagUrl, result);
    return result;
  } catch (err) {
    console.warn('extractFlagColors failed, using fallback:', err);
    const result = { primary: fallbackColor, secondary: null };
    flagColorCache.set(flagUrl, result);
    return result;
  }
}

// Load image with CORS enabled
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Sample image pixels and rank dominant colors
function sampleImageColors(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const MAX_PIXELS = 20000; // smaller sample for faster processing
  const { width, height } = img;
  const ratio = Math.sqrt(Math.min(1, MAX_PIXELS / (width * height)));
  const w = Math.max(1, Math.floor(width * ratio));
  const h = Math.max(1, Math.floor(height * ratio));
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const buckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 200) continue; // ignore transparent
    const sat = getSaturation({ r, g, b });
    if (sat < 0.15) continue; // ignore very low saturation

    const luma = getLuma({ r, g, b });
    if (luma < 20 || luma > 235) continue; // remove near-black/white

    const q = quantize({ r, g, b });
    const key = `${q.r}|${q.g}|${q.b}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const sorted = Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => {
      const [r, g, b] = key.split('|').map(Number);
      return { r, g, b };
    });

  return { colors: sorted.slice(0, 6) }; // keep a small set
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Build a full palette for a country
async function getCountryPalette(country, options = {}) {
  const {
    baseColor = CONTINENT_BASE_COLORS[country?.region] || CONTINENT_BASE_COLORS.default,
    fallbackAccent = '#C77442',
  } = options;

  const flagUrl = country?.flag || country?.flagUrl || country?.flags?.svg || country?.flags?.png;
  const { primary, secondary } = await extractFlagColors(flagUrl, fallbackAccent);
  const accent = primary || fallbackAccent;

  const palette = {
    base: baseColor,
    accent,
    accentLight: lighten(accent, 0.18),
    accentDark: darken(accent, 0.18),
    muted: mix(baseColor, accent, 0.35),
    secondary: secondary,
  };

  return palette;
}

export {
  extractFlagColors,
  getCountryPalette,
  flagColorCache,
  lighten,
  darken,
  mix,
};

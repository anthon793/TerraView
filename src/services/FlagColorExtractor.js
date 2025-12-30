import { extractFlagColors, getCountryPalette } from '../utils/flagColorExtractor';

export { extractFlagColors, getCountryPalette };

export async function getPaletteForCountry(country, options) {
  return getCountryPalette(country, options);
}

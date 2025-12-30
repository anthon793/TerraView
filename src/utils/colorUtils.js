import { lighten, darken, mix } from './flagColorExtractor';

export { lighten, darken, mix };

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

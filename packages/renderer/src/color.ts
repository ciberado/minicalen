export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!match) {
    return hex;
  }

  const red = parseInt(match[1], 16);
  const green = parseInt(match[2], 16);
  const blue = parseInt(match[3], 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const INK_DARK = '#1f2937';
export const INK_LIGHT = '#ffffff';

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!match) {
    return 0;
  }

  const red = srgbToLinear(parseInt(match[1], 16));
  const green = srgbToLinear(parseInt(match[2], 16));
  const blue = srgbToLinear(parseInt(match[3], 16));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastInk(hex: string): string {
  return relativeLuminance(hex) > 0.179 ? INK_DARK : INK_LIGHT;
}

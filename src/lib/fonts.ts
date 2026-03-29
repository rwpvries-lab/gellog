export const fontSizes = {
  xs:    11,
  sm:    13,
  base:  15,
  md:    17,
  lg:    20,
  xl:    24,
  "2xl": 30,
} as const;

export type FontSizeKey = keyof typeof fontSizes;

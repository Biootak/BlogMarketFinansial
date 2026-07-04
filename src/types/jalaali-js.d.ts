/**
 * Ambient declaration for the `jalaali-js` package.
 *
 * `jalaali-js` is plain JS without bundled `.d.ts`. We only use a
 * handful of functions in this project (date conversion + leap-year
 * helpers), so a narrow declaration is enough. If more functions
 * are needed later, extend `Jalaali` here.
 *
 * API reference: https://github.com/jalaali/jalaali-js
 */
declare module 'jalaali-js' {
  export interface JalaaliYMD {
    jy: number;
    jm: number;
    jd: number;
  }

  export interface GregorianYMD {
    gy: number;
    gm: number;
    gd: number;
  }

  export function toJalaali(gy: number, gm: number, gd: number): JalaaliYMD;
  export function toJalaali(date: Date): JalaaliYMD;

  export function toGregorian(jy: number, jm: number, jd: number): GregorianYMD;

  export function isValidJalaaliDate(jy: number, jm: number, jd: number): boolean;

  export function isLeapJalaaliYear(jy: number): boolean;

  export function jalaaliMonthLength(jy: number, jm: number): number;
}
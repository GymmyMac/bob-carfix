/**
 * Bob Widget Version
 * This value is injected at build time by Vite
 */

declare const __BOB_VERSION__: string;

export const BOB_VERSION = typeof __BOB_VERSION__ !== 'undefined' 
  ? __BOB_VERSION__ 
  : '1.2.1';

export const getBobVersion = () => BOB_VERSION;

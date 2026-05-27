/**
 * ═══════════════════════════════════════════════════════════════════
 * SHARED GALLERY DATA LAYER
 * gallery-data.js
 *
 * Single source of truth for all gallery consumers.
 *
 * Consumers:
 *   • app2.js            → normal photo wall (polaroid grid)
 *   • professional-gallery-orb.js  → cinematic holographic gallery
 *
 * Usage (from any script):
 *   const pics = window.NAT_GALLERY.PICS;
 *
 * Adding a photo here automatically updates BOTH presentations.
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /**
   * GALLERY PHOTOS — update these with actual photo paths.
   * Each entry: { src: string, alt: string, special: boolean }
   *
   * Rules:
   *  • Keep `special: true` only on the last entry (bright.jpg).
   *  • `alt` is shown as caption in Professional Mode.
   *  • Paths are relative to the site root.
   */
  const PICS = [
    { src: 'images/pink.jpg',    alt: 'a photo of me 🌸',        special: false },
    { src: 'images/uw.jpg',      alt: 'a photo of me 📸',        special: false },
    { src: 'images/eg.jpg',      alt: 'a photo of me 💅',        special: false },
    { src: 'images/Bus.jpg',     alt: 'a photo of me 🚌',        special: false },
    { src: 'images/brush.jpg',   alt: 'a photo of me 🎨',        special: false },
    { src: 'images/photo7.jpg',  alt: 'a photo of me 🌸',        special: false },
    { src: 'images/photo8.jpg',  alt: 'a photo of me ✨',        special: false },
    { src: 'images/photo9.jpg',  alt: 'a photo of me 💗',        special: false },
    { src: 'images/photo10.jpg', alt: 'a photo of me 🎵',        special: false },
    { src: 'images/bright.jpg',  alt: 'the special one 👀✨',    special: true  },
  ];

  const SPECIAL_IDX = PICS.findIndex(p => p.special);

  /**
   * Public registry — read by any page/script.
   * Frozen so no consumer can accidentally mutate the array.
   */
  window.NAT_GALLERY = Object.freeze({
    PICS:        Object.freeze(PICS.map(p => Object.freeze({ ...p }))),
    SPECIAL_IDX: SPECIAL_IDX === -1 ? PICS.length - 1 : SPECIAL_IDX,
    TOTAL:       PICS.length,
  });

})();

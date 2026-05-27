/* ============================================================
   REGISTRY NORMALIZER — registry-normalizer.js
   v1.0

   PURPOSE:
   - Normalizes V1 tiers (legendary → vip, epic → premium)
   - Deduplicates overlapping frame definitions
   - Provides unified tier metadata
   - Patches avatar-frames-ui.js grouping logic

   LOAD ORDER: After avatar-fix.js, Before avatar-frames-ui.js
   ============================================================ */

(function () {
  'use strict';

  const LOG = '[registryNormalizer]';
  const MAX_ATTEMPTS = 80;
  let _attempts = 0;
  let _normalized = false;

  /* ─────────────────────────────────────────────────────────
     TIER NORMALIZATION MAP
     V1 → V2 tier mapping with backward compatibility
  ───────────────────────────────────────────────────────── */

  const TIER_NORMALIZE_MAP = {
    legendary: 'vip',
    epic: 'premium'
  };

  // Reverse lookup for backward compatibility
  const TIER_REVERSE_MAP = {
    vip: ['legendary'],
    premium: ['epic']
  };

  /* ─────────────────────────────────────────────────────────
     NORMALIZED TIER META
     Unified tier display configuration
  ───────────────────────────────────────────────────────── */

  const NORMALIZED_TIER_META = {
    developer: {
      label: 'DEVELOPER',
      order: 5,
      color: '#00ff65',
      glow: 'rgba(0, 255, 101, 0.45)',
      priority: 50
    },
    mythic: {
      label: 'MYTHIC',
      order: 4,
      color: '#ffb800',
      glow: 'rgba(255, 184, 0, 0.45)',
      priority: 40
    },
    vip: {
      label: 'VIP',
      order: 3,
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.45)',
      priority: 30,
      legacyLabels: ['LEGENDARY']
    },
    premium: {
      label: 'PREMIUM',
      order: 2,
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.35)',
      priority: 20,
      legacyLabels: ['EPIC']
    },
    member: {
      label: 'MEMBER',
      order: 1,
      color: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.25)',
      priority: 10
    },
    default: {
      label: 'DEFAULT',
      order: 0,
      color: '#64748b',
      glow: 'rgba(100, 116, 139, 0.15)',
      priority: 0
    }
  };

  /* ─────────────────────────────────────────────────────────
     FRAME DEDUPLICATION
     Detects and resolves duplicate frame definitions
  ───────────────────────────────────────────────────────── */

  function _deduplicateRegistry(registry) {
    const seen = new Map(); // key → { frameId, def }
    const duplicates = [];
    const merged = {};

    for (const [frameId, def] of Object.entries(registry)) {
      // Generate dedupe keys
      const keys = [
        `id:${def.id || frameId}`,
        `cssClass:${def.cssClass || ''}`,
        `label:${(def.label || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`
      ].filter(k => !k.endsWith(':'));

      let matched = false;

      for (const key of keys) {
        if (seen.has(key)) {
          const existing = seen.get(key);
          duplicates.push({
            frameId,
            existingFrameId: existing.frameId,
            key,
            def,
            existingDef: existing.def
          });
          matched = true;

          // Prefer V2 definitions (those with cssClass or newer tier)
          const isV2 = def.cssClass || TIER_NORMALIZE_MAP[def.tier] === undefined;
          const existingIsV2 = existing.def.cssClass || TIER_NORMALIZE_MAP[existing.def.tier] === undefined;

          if (isV2 && !existingIsV2) {
            // Replace existing with V2 version
            merged[frameId] = def;
            delete merged[existing.frameId];
            seen.set(key, { frameId, def });
            console.log(LOG, `Preferring V2: ${frameId} over ${existing.frameId}`);
          } else if (!isV2 && existingIsV2) {
            // Keep existing V2 version
            console.log(LOG, `Keeping V2: ${existing.frameId} over ${frameId}`);
          } else {
            // Both same version — keep first seen
            console.log(LOG, `Keeping first: ${existing.frameId} over ${frameId}`);
          }
          break;
        }
      }

      if (!matched) {
        merged[frameId] = def;
        for (const key of keys) {
          seen.set(key, { frameId, def });
        }
      }
    }

    if (duplicates.length > 0) {
      console.log(LOG, `Deduplicated ${duplicates.length} frames:`, duplicates.map(d => d.frameId));
    }

    return merged;
  }

  /* ─────────────────────────────────────────────────────────
     NORMALIZE FRAME DEFINITION
     Adds normalized tier while preserving legacy tier
  ───────────────────────────────────────────────────────── */

  function _normalizeFrameDef(frameId, def) {
    const originalTier = def.tier;
    const normalizedTier = TIER_NORMALIZE_MAP[originalTier] || originalTier;

    return {
      ...def,
      tier: normalizedTier,
      legacyTier: originalTier !== normalizedTier ? originalTier : undefined,
      tierMeta: NORMALIZED_TIER_META[normalizedTier] || NORMALIZED_TIER_META.default,
      _normalized: true
    };
  }

  /* ─────────────────────────────────────────────────────────
     MAIN NORMALIZATION FUNCTION
  ───────────────────────────────────────────────────────── */

  function normalizeRegistry() {
    if (_normalized) {
      console.log(LOG, 'Registry already normalized — skipping');
      return window._natFrames.registry;
    }

    const engine = window._natFrames;
    if (!engine?.registry) {
      console.warn(LOG, '_natFrames.registry not available');
      return null;
    }

    console.log(LOG, 'Normalizing frame registry...');

    // Step 1: Deduplicate
    let registry = { ...engine.registry };
    registry = _deduplicateRegistry(registry);

    // Step 2: Normalize all frame definitions
    const normalized = {};
    for (const [frameId, def] of Object.entries(registry)) {
      normalized[frameId] = _normalizeFrameDef(frameId, def);
    }

    // Step 3: Update engine registry
    engine.registry = normalized;

    // Step 4: Store normalization metadata
    engine._normalizedRegistry = true;
    engine._tierMap = TIER_NORMALIZE_MAP;
    engine._tierReverseMap = TIER_REVERSE_MAP;
    engine._tierMeta = NORMALIZED_TIER_META;

    // Step 5: Add backward compatibility alias resolution
    engine.resolveFrameId = function(frameId) {
      if (!frameId) return null;
      
      // Direct lookup first
      if (normalized[frameId]) return frameId;
      
      // Try legacy tier aliases
      for (const [id, def] of Object.entries(normalized)) {
        if (def.legacyTier && def.id === frameId) return id;
        if (def.cssClass && def.cssClass.includes(frameId)) return id;
      }
      
      return frameId; // Return as-is if no match
    };

    // Step 6: Normalize the FRAME_ACCENTS in UI globals
    if (window._natFramesUI) {
      _patchUIGlobals();
    }

    _normalized = true;
   // console.log(LOG, `✅ Registry normalized: ${Object.keys(normalized).length} frames`);
    
    return normalized;
  }

  /* ─────────────────────────────────────────────────────────
     PATCH UI GLOBALS
     Updates avatar-frames-ui.js's FRAME_ACCENTS and TIER_META
  ───────────────────────────────────────────────────────── */

  function _patchUIGlobals() {
    // These are local to the UI module, but we can patch via the panel
    // The UI module re-reads from _natFrames.registry on each open
    
    // Store normalized metadata on window for UI to use
    window._natFramesNormalized = {
      tierMeta: NORMALIZED_TIER_META,
      tierMap: TIER_NORMALIZE_MAP,
      tierOrder: Object.fromEntries(
        Object.entries(NORMALIZED_TIER_META).map(([tier, meta]) => [tier, meta.order])
      )
    };
  }

  /* ─────────────────────────────────────────────────────────
     INIT — Wait for engine, then normalize
  ───────────────────────────────────────────────────────── */

  function _init() {
    const poll = setInterval(() => {
      _attempts++;

      if (window._natFrames?.registry) {
        clearInterval(poll);
        normalizeRegistry();
        return;
      }

      if (_attempts >= MAX_ATTEMPTS) {
        clearInterval(poll);
        console.warn(LOG, 'Timed out waiting for _natFrames');
      }
    }, 100);
  }

  // Export
  window._natFramesNormalize = {
    normalize: normalizeRegistry,
    tierMeta: NORMALIZED_TIER_META,
    tierMap: TIER_NORMALIZE_MAP
  };

  _init();

})();
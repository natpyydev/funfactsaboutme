# Prestige Message Cosmetics — Architecture

## Problem summary

The original `message-cosmetics.js` had all of these mixed together in one 300-line function:

- DOM observation logic
- Profile data reads
- Layout construction
- CSS class management
- Element cloning (with inherited bug: `.msg-sender` carried `text-overflow:ellipsis !important` from `patch-four-fixes.css` into the prestige layout, truncating usernames as "username...")
- Live NodeList mutation (skipped nodes on mobile WebKit)
- Inline style overrides scattered throughout

---

## Folder structure

```
prestige-system/
│
├── index.js                    ← Entry point. Boot sequence + window API.
│
├── core/
│   ├── observer.js             ← MutationObserver lifecycle. Owns scheduling.
│   ├── renderer.js             ← Orchestrates the full layout build per bubble.
│   ├── layout.js               ← Dimension constants + CSS token injection.
│   └── utils.js                ← DOM helpers, profile accessors, logging.
│
├── modules/
│   ├── usernameRow.js          ← Username text + crown + inline badges + time.
│   ├── badges.js               ← Original badge row + elite computed badges.
│   ├── reactions.js            ← Moves .msg-reactions-row into prestige layout.
│   ├── actionRow.js            ← Reply / upvote / delete / pin button row.
│   ├── levelGem.js             ← Circular level gem with tier gradient.
│   ├── particles.js            ← Ambient floating particle layer.
│   ├── vipEffects.js           ← VIP border bar + mythic glow.
│   └── titles.js               ← Equipped title label + Legend badge.
│
└── styles/
    ├── prestige-layout.css     ← Structural flexbox layout only. Load first.
    ├── badges.css              ← Colours, gradients, glow animations. Load second.
    ├── particles.css           ← Particle float animation. Load third.
    └── mobile-fixes.css        ← Mobile overrides. Load LAST (wins by order).
```

---

## Data flow

```
Browser DOM mutation
        │
        ▼
  observer.js
  MutationObserver fires
  → enqueue(bubble)     ← deduped Set, 32ms debounce
        │
        ▼
  flush() → scheduleBubble(bubble)
        │
        ▼
  renderer.js renderBubble(bubble)
  ┌─────────────────────────────────────────────────┐
  │  1. READ all source elements (no writes yet)    │
  │  2. Build leftCol                               │
  │       levelGem.js   → <div.prestige-gem>        │
  │  3. Build rightCol (top → bottom)               │
  │       usernameRow.js → <div.msg-prestige-username> │
  │       titles.js      → <div.msg-prestige-title> │
  │       badges.js      → cloned row + elite badges│
  │       (textEl moved directly)                   │
  │       reactions.js   → .msg-reactions-row moved │
  │       actionRow.js   → <div.msg-action-row>     │
  │  4. Assemble wrap + particles                   │
  │       particles.js   → <div.prestige-particles> │
  │  5. Apply post-build effects                    │
  │       vipEffects.js  → VIP bar + mythic class   │
  │  6. Atomic replace: bubble.innerHTML = ''       │
  │                      bubble.appendChild(frag)   │
  └─────────────────────────────────────────────────┘
```

---

## Which system owns which DOM elements

| Element | Owned by | Strategy |
|---|---|---|
| `.msg-pfp-wrap` / `.msg-pfp-avatar` | `renderer.js` | **Moved** (not cloned) — preserves frame listeners |
| `.msg-prestige-name` | `usernameRow.js` | **Built fresh** — never cloned from `.msg-sender` |
| Crown icon | `usernameRow.js` | **Cloned** — targeted child query, not whole sender |
| `.user-badges-inline` | `usernameRow.js` | **Cloned + sanitised** — cssText reset on clone |
| `.msg-time` | `usernameRow.js` | **Cloned** — cssText reset on clone |
| Equipped title / Legend | `titles.js` | **Built fresh** from profile data |
| `.msg-badges-row` | `badges.js` | **Cloned + sanitised** — reaction buttons removed |
| Elite badges (DEV/VIP/…) | `badges.js` | **Built fresh** from `ELITE_BADGE_DEFS` |
| `.msg-text` | `renderer.js` | **Moved** — preserves any rich content |
| `.msg-reactions-row` | `reactions.js` | **Moved** — preserves click handlers |
| Action buttons | `actionRow.js` | **Moved** — preserves click handlers |
| `.prestige-particle` | `particles.js` | **Built fresh** |
| `.prestige-vip-bar` | `vipEffects.js` | **Built fresh** |
| Level gem | `levelGem.js` | **Built fresh** from level number |

**Rule:** Move when you need listeners. Clone only when the original must stay. Build fresh when the original carries poisoned CSS classes.

---

## CSS organisation

### Load order (critical)

```html
<link rel="stylesheet" href="prestige-system/styles/prestige-layout.css">
<link rel="stylesheet" href="prestige-system/styles/badges.css">
<link rel="stylesheet" href="prestige-system/styles/particles.css">
<link rel="stylesheet" href="prestige-system/styles/mobile-fixes.css">
```

`mobile-fixes.css` loads last so its `@media` rules win by source order without needing `!important`.

### What lives where

| File | Contents |
|---|---|
| `prestige-layout.css` | Flexbox structure, column widths, gap, `min-width:0` guards, username overflow resets |
| `badges.css` | Gem gradients, elite badge colours, rarity glow animations, VIP bar border |
| `particles.css` | `@keyframes prestigeFloat`, particle size/opacity |
| `mobile-fixes.css` | `@media` breakpoints at 700px and 380px, touch target minimums |

### The `.msg-sender` problem and fix

`patch-four-fixes.css` legitimately applies:
```css
.msg-sender {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
```
This is correct for the standard chat layout. The fix is architectural: `usernameRow.js` **never creates an element with `.msg-sender`**. The username text goes into `.msg-prestige-name` which has none of that CSS baggage.

`prestige-layout.css` also includes a safety net:
```css
.msg-prestige-username .msg-sender {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
}
```
This catches any future regression where `.msg-sender` might be cloned back in.

---

## Mobile-safe rendering strategy

### Problems solved

| Problem | Solution |
|---|---|
| Live NodeList mutation skips nodes on WebKit | Never mutate while iterating. Snapshot with `Array.from()` first, or don't mutate at all (build fresh). |
| `cloneNode` brings poisoned CSS classes | Build fresh elements for anything that carries global CSS rules. |
| Rapid mutations cause multiple renders | 32ms debounce queue in `observer.js`. Renders are idempotent via `data-prestige-loaded` guard. |
| Layout thrash during render | All DOM reads happen before all DOM writes inside `renderBubble`. |
| Blank-frame flash during replace | `DocumentFragment` → single `appendChild` after `innerHTML = ''`. |
| `requestAnimationFrame` scheduling | `scheduleBubble()` wraps render in rAF so browser batches paint. |
| Particles drain battery | `prefersReducedMotion()` check; CSS hides particles at ≤380px as secondary guard. |
| `.remove()` not available on all WebViews | Always use `el.parentNode?.removeChild(el)` instead. |

### Rendering order: reads before writes

```js
// renderer.js pattern — all querySelector calls FIRST
const avatar     = qs(bubble, '.msg-pfp-wrap');
const textEl     = qs(bubble, '.msg-text');
const senderSpan = qs(meta,   '.msg-sender');
// ... all reads done

// Then build the new tree entirely in memory
const wrap = buildTree(...);

// Then ONE atomic write
bubble.innerHTML = '';
bubble.appendChild(wrap);
```

---

## How to add a new feature

### New elite badge type

Edit `modules/badges.js`, add one entry to `ELITE_BADGE_DEFS`:
```js
{
  id:        'mod',
  label:     'MOD',
  className: 'elite-badge--mod',
  test:      (uid) => isModerator(uid),
}
```
Add `.elite-badge--mod { background: ...; }` to `badges.css`. Done.

### New prestige effect (e.g. seasonal snow overlay)

Add a function to `modules/vipEffects.js`:
```js
export function applySeasonalEffect(wrap) {
  const overlay = el('div', 'prestige-snow-overlay');
  wrap.appendChild(overlay);
}
```
Call it from `renderer.js` in step 5 (post-build effects).

### New level tier

Edit `core/utils.js` `LEVEL_TIERS` array. The `getTier()` function and `levelGem.js` both use it automatically.

### New action button

Add the selector to `modules/actionRow.js` `ACTION_SELECTORS` array.

### Theme-specific prestige styles

Create `styles/themes/prestige-cyber.css`, scope all rules under `body.theme-cyber .msg-prestige-wrap { ... }`. Load after `mobile-fixes.css`.

---

## Performance notes

- **MutationObserver** observes only `childList + subtree` — no attribute or characterData watching, which keeps callback overhead minimal.
- **32ms flush debounce** batches burst insertions (initial load, scroll-back) into one pass.
- **WeakSet scheduling guard** ensures each bubble is processed at most once per rAF cycle even if `enqueue` is called multiple times.
- **`data-prestige-loaded = '1'`** is set at the very start of `renderBubble` so re-entrant observer callbacks drop immediately.
- **Particles skipped** when `prefers-reduced-motion` is set, or hidden via CSS at ≤380px breakpoint.
- **No `setInterval` polling** — the observer handles new messages; the 1500ms `setTimeout` in `index.js` is a one-time catch-up scan for messages that existed before the script loaded.

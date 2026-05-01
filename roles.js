// =========================================================
// 🔐 ROLES — passcode-based role unlock
// Roles: Dev, Mod, Debugger, Badgemaker
// Passcodes are stored as SHA-256 hashes (safe to ship in source).
// To change a passcode: open console, run  await __hashCode('new-passcode')
//                       then paste the hash into ROLE_HASHES below.
// =========================================================

// Default passcodes (CHANGE THESE):
//   dev        → nat-is-god-2026
//   mod        → keep-it-clean
//   debugger   → show-me-the-logs
//   badgemaker → make-it-shiny
const ROLE_HASHES = {
  dev:        'f6944fccfe93e4a8bffe46d9f75cd0fe25cdefd9506bca25f4a5683ce0cf6a58',
  mod:        'dc31e661135cfb4ce6985d14c70fe8112ea79a910fa942f2c35fa7665eb032db',
  debugger:   'd68988b118838ea22d7fe9f657e4a2270e82f7dc80d79cc5447627fcb507e651',
  badgemaker: '8e5cdf3cc1affb67a11851033b1da440620a28b19f1ec83c1638ccedb9ef5954',
};

export const ROLES = {
  dev:        { name: 'Dev',        icon: '🛠',  color: '#9b59ff',
                perks: { all: true } },
  mod:        { name: 'Mod',        icon: '🛡',  color: '#5cc8ff',
                perks: { canFilter: true } },
  debugger:   { name: 'Debugger',   icon: '🐛',  color: '#5cffc8',
                perks: { canDebug: true } },
  badgemaker: { name: 'Badgemaker', icon: '🎖',  color: '#ffd700',
                perks: { canMakeBadges: true } },
};

const ROLE_KEY = 'natnat_role';

export async function hashCode(str) {
  const buf = new TextEncoder().encode(str);
  const h = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('');
}
// dev helper for re-generating hashes from the console
window.__hashCode = hashCode;

export async function tryUnlockRole(passcode) {
  if (!passcode) return null;
  const hash = await hashCode(passcode.trim());
  for (const [role, h] of Object.entries(ROLE_HASHES)) {
    if (h === hash) {
      localStorage.setItem(ROLE_KEY, role);
      return role;
    }
  }
  return null;
}

export function getCurrentRole() {
  return localStorage.getItem(ROLE_KEY) || null;
}

export function clearRole() {
  localStorage.removeItem(ROLE_KEY);
}

export function hasPerk(perk) {
  const role = getCurrentRole();
  if (!role || !ROLES[role]) return false;
  if (ROLES[role].perks.all) return true;
  return !!ROLES[role].perks[perk];
}

// little chip you can drop anywhere
export function renderRoleChipHTML(role) {
  const r = ROLES[role];
  if (!r) return '';
  return `<span class="role-chip role-${role}" style="--role-color:${r.color}">${r.icon} ${r.name}</span>`;
}
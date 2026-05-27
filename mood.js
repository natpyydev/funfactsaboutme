/* 💬 MOOD.JS — Nat's Mood live widget
   Reads natnat-mood/current from Firebase and shows a live pulsing
   status badge near the site header.
   Admin mode: type  natmood  anywhere (not in a text field)
   to open a password-protected panel that lets Natnat change the mood.
   One-time setup: run  localStorage.setItem('nat-admin-key','YOUR_PASSWORD')
   in the browser console once. mood.js never stores the plain password
   externally — it only checks it against your local copy.
*/
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey:            'AIzaSyAow-1B5hJqAaFYEVXg8KVJhUHNGs5q3Iw',
  authDomain:        'fun-facts-about-me.firebaseapp.com',
  databaseURL:       'https://fun-facts-about-me-default-rtdb.firebaseio.com',
  projectId:         'fun-facts-about-me',
  storageBucket:     'fun-facts-about-me.firebasestorage.app',
  messagingSenderId: '244373782443',
  appId:             '1:244373782443:web:bbd26db6f50ba29e4fdcee',
};

// Re-use existing Firebase app if already initialised by app.js
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getDatabase(app);

const MOOD_PATH = 'natnat-mood/current';

// ── Render mood badge ──────────────────────────────────────────────────────
function renderMood(data) {
  let badge = document.getElementById('natMoodBadge');
  if (!data || !data.emoji) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'natMoodBadge';
    badge.className = 'nat-mood-badge';
    // Insert after header h1 or at the start of header
    const header = document.querySelector('header');
    if (header) header.appendChild(badge);
    else document.body.prepend(badge);
  }
  badge.innerHTML = `
    <span class="nmb-emoji">${data.emoji}</span>
    <span class="nmb-text">${data.text || ''}</span>
    <span class="nmb-pulse"></span>
  `;
  badge.title = `Nat's current mood: ${data.emoji} ${data.text || ''}`;
}

// ── Listen for real-time mood updates ─────────────────────────────────────
onValue(ref(db, MOOD_PATH), snap => {
  renderMood(snap.val());
});

// ── Admin panel ────────────────────────────────────────────────────────────
const ADMIN_EMOJIS = ['😊','😎','😴','😭','🤔','🥹','😤','🥳','😏','🤩','🥱','😬','🫠','🤪','💀','🫶'];

function openMoodAdmin() {
  if (document.getElementById('moodAdminPanel')) return;

  const savedKey = localStorage.getItem('nat-admin-key');
  const panel = document.createElement('div');
  panel.id = 'moodAdminPanel';
  panel.className = 'mood-admin-panel';
  panel.innerHTML = `
    <div class="map-header">
      <span>💬 Set Nat's Mood</span>
      <button class="map-close">✕</button>
    </div>
    <div class="map-body">
      <div class="map-emoji-row">
        ${ADMIN_EMOJIS.map(e => `<button class="map-emoji-btn" data-e="${e}">${e}</button>`).join('')}
      </div>
      <input class="map-text-input" maxlength="40" placeholder="how are you feeling? (max 40 chars)" />
      <div class="map-pw-row">
        <input class="map-pw-input" type="password" placeholder="admin password" />
      </div>
      <button class="map-save-btn">💾 Update Mood</button>
      <div class="map-hint">First time? Run <code>localStorage.setItem('nat-admin-key','yourpass')</code> in console, then use that password here.</div>
    </div>
  `;

  panel.querySelector('.map-close').onclick = () => panel.remove();

  let pickedEmoji = '😊';
  panel.querySelectorAll('.map-emoji-btn').forEach(b => {
    if (b.dataset.e === pickedEmoji) b.classList.add('active');
    b.onclick = () => {
      pickedEmoji = b.dataset.e;
      panel.querySelectorAll('.map-emoji-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });

  if (savedKey) panel.querySelector('.map-hint').style.display = 'none';

  panel.querySelector('.map-save-btn').onclick = () => {
    const pw      = panel.querySelector('.map-pw-input').value.trim();
    const text    = panel.querySelector('.map-text-input').value.trim();
    const storedKey = localStorage.getItem('nat-admin-key');

    if (!storedKey) {
      alert('No admin key set. Run localStorage.setItem(\'nat-admin-key\',\'yourpassword\') in the browser console first.');
      return;
    }
    if (pw !== storedKey) {
      alert('Wrong password!');
      return;
    }
    set(ref(db, MOOD_PATH), {
      emoji: pickedEmoji,
      text: text || '',
      updatedAt: Date.now(),
    }).then(() => {
      panel.remove();
      const t = document.getElementById('toast');
      if (t) { t.textContent = `${pickedEmoji} Mood updated!`; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }
    }).catch(() => alert('Firebase write failed — are you offline?'));
  };

  document.body.appendChild(panel);
  panel.querySelector('.map-text-input').focus();
}

// Trigger: type "natmood" anywhere (not in an input)
let _moodSeq = '';
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  _moodSeq = (_moodSeq + e.key.toLowerCase()).slice(-7);
  if (_moodSeq === 'natmood') openMoodAdmin();
});

window._openMoodAdmin = openMoodAdmin;

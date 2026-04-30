/* 🗺 WORLD MAP — visitors drop pins where they live, click to read */
(() => {
  let map = null;
  const markers = {};

  function build() {
    if (document.getElementById('worldMapSection')) return;
    const sec = document.createElement('section');
    sec.id = 'worldMapSection';
    sec.className = 'worldmap-section';
    sec.innerHTML = `
      <h2 class="section-title">🗺 where my friends live</h2>
      <p class="section-sub">click anywhere to drop your pin · click pins to read each story 💗</p>
      <div class="map-wrap">
        <div id="natMap" class="nat-map"></div>
        <div class="map-legend">
          <span><span class="map-pin-dot you"></span> your pin</span>
          <span><span class="map-pin-dot"></span> friends' pins</span>
        </div>
      </div>
      <div class="map-helper">your pin is public · only your name + message + date show, no exact location info</div>
    `;
    document.querySelector('main').appendChild(sec);
    initMap();
  }

  // 💗 a custom heart-shaped pink pin
  function makePinIcon(isMine) {
    const cls = 'nat-pin' + (isMine ? ' nat-pin-mine' : '');
    const html = `
      <div class="${cls}">
        <svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pinGrad${isMine?'M':'F'}" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="${isMine ? '#ffd166' : '#ff7eb6'}"/>
              <stop offset="100%" stop-color="${isMine ? '#ff7eb6' : '#c47bff'}"/>
            </linearGradient>
          </defs>
          <path d="M16 39C16 39 2 24 2 13.5 2 6.6 8.3 1 16 1s14 5.6 14 12.5C30 24 16 39 16 39z"
                fill="url(#pinGrad${isMine?'M':'F'})" stroke="#fff" stroke-width="2"/>
          <circle cx="16" cy="14" r="5" fill="#fff"/>
        </svg>
      </div>
    `;
    return L.divIcon({
      className: 'nat-pin-icon',
      html,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -38],
    });
  }

  function initMap() {
    if (typeof L === 'undefined') { setTimeout(initMap, 250); return; }
    map = L.map('natMap', {
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([14.5995, 120.9842], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · © CARTO',
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.attribution({ prefix: false, position: 'bottomright' })
      .addAttribution('© CARTO · OSM').addTo(map);

    map.on('click', onMapClick);
    listen();
  }

  function onMapClick(e) {
    const db = window._natDB; if (!db) return;
    const uid = db.getUID(); if (!uid) return alert('still connecting…');
    const name = prompt('your display name?', localStorage.getItem('nat-display-name') || '');
    if (name === null) return;
    const message = prompt('a short note about you / your city:', '') || '';
    if (name) localStorage.setItem('nat-display-name', name);
    db.set(db.ref(db.db, 'mapPins/' + uid), {
      lat: e.latlng.lat, lng: e.latlng.lng,
      name: (name || 'anonymous').slice(0, 30),
      message: message.slice(0, 200),
      ts: Date.now(),
    }).then(() => {
      if (window.bumpChallenge) window.bumpChallenge('pin1', 1);
      if (window.bumpQuest) window.bumpQuest('pin', 1);
      if (window.addExp) window.addExp(30, 'map pin');
    }).catch(err => alert('oops: ' + (err.message || err)));
  }

  function safe(s) { return (s || '').replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c])); }
  function fmtDate(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return ''; }
  }

  function listen() {
    const db = window._natDB;
    if (!db) { setTimeout(listen, 200); return; }
    db.onValue(db.ref(db.db, 'mapPins'), snap => {
      if (!map) return;
      const data = snap.val() || {};
      Object.keys(markers).forEach(uid => {
        if (!data[uid]) { map.removeLayer(markers[uid]); delete markers[uid]; }
      });
      const myUID = db.getUID();
      Object.entries(data).forEach(([uid, p]) => {
        const isMine = uid === myUID;
        const popup = `
          <div class="map-popup">
            <b>${safe(p.name)}</b>${isMine ? ' <small>(you)</small>' : ''}
            <p>${safe(p.message) || '<i style="opacity:.6">no message</i>'}</p>
            <div class="map-popup-date">📅 dropped ${fmtDate(p.ts)}</div>
            ${(isMine || myUID === db.ADMIN_UID) ? `<button onclick="window._removePin('${uid}')">remove pin 🗑</button>` : ''}
          </div>
        `;
        if (markers[uid]) {
          markers[uid].setLatLng([p.lat, p.lng]).getPopup()?.setContent(popup);
          markers[uid].setIcon(makePinIcon(isMine));
        } else {
          markers[uid] = L.marker([p.lat, p.lng], { icon: makePinIcon(isMine) })
            .addTo(map).bindPopup(popup);
        }
      });
    });
  }

  window._removePin = function(uid) {
    const db = window._natDB; if (!db) return;
    if (db.getUID() !== uid && db.getUID() !== db.ADMIN_UID) return;
    db.remove(db.ref(db.db, 'mapPins/' + uid)).catch(e => alert(e.message || e));
  };

  window.addEventListener('nattabchange', e => {
    if (e.detail?.tab === 'map' && map) {
      setTimeout(() => map.invalidateSize(), 220);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

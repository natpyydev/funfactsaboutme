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

    // Render admin-seeded pins from adminData/{ADMIN_UID}/mapSeeds (canonical path).
    // FIX: always reads from ADMIN_UID so it matches what _seedMapPins() writes.
    db.onValue(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/mapSeeds'), snap => {
      if (!map) return;
      const seeds = snap.val() || {};

      // Remove old seed markers no longer in the data
      Object.keys(markers).forEach(k => {
        if (k.startsWith('__seed__') && !seeds[k.replace('__seed__', '')]) {
          map.removeLayer(markers[k]);
          delete markers[k];
        }
      });

      Object.entries(seeds).forEach(([key, pin]) => {
        const seedKey = '__seed__' + key;
        const popup = `
          <div class="map-popup">
            <div class="map-popup-header"><b>${safe(pin.name)}</b></div>
            <p>${safe(pin.message) || '<i style="opacity:.6">no message</i>'}</p>
            <div class="map-popup-date">📅 dropped ${fmtDate(pin.ts)}</div>
          </div>`;
        if (markers[seedKey]) {
          markers[seedKey].setLatLng([pin.lat, pin.lng]).getPopup()?.setContent(popup);
        } else {
          markers[seedKey] = L.marker([pin.lat, pin.lng], { icon: makePinIcon(false) })
            .bindPopup(popup)
            .addTo(map);
        }
      });
    });

    db.onValue(db.ref(db.db, 'mapPins'), snap => {
      if (!map) return;
      const data = snap.val() || {};
      Object.keys(markers).forEach(uid => {
        if (uid.startsWith('__seed__')) return; // never touch seed markers here
        if (!data[uid]) { map.removeLayer(markers[uid]); delete markers[uid]; }
      });
      const myUID = db.getUID();
      Object.entries(data).forEach(([uid, p]) => {
        const isMine = uid === myUID;
        const popup = `
          <div class="map-popup" data-popup-uid="${uid}">
            <div class="map-popup-header">
              <div class="map-popup-pfp" data-pfp-uid="${uid}"></div>
              <b>${safe(p.name)}</b>${isMine ? ' <small>(you)</small>' : ''}
            </div>
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

      if (!map._pfpBound) {
        map._pfpBound = true;
        map.on('popupopen', e => {
          const content = e.popup.getElement();
          if (content && window._natPfp) window._natPfp.load(content);
        });
      }
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

  // 🌱 Admin-only: seed fake map pins.
  // FIX: always writes to adminData/{ADMIN_UID}/mapSeeds — the same canonical
  //      path the listener above reads from — so pins appear on the map live
  //      regardless of which admin UID is signed in.
  // Usage: window._seedMapPins()             → seeds 28 default pins
  //        window._seedMapPins({}, true)     → clears all seed pins
  window._seedMapPins = function(customPins, clear) {
    var db = window._natDB;
    if (!db) { _natLog('DB not ready — try again', 'warn'); return; }
    if (!db.isAdminNow || !db.isAdminNow()) { _natLog('admin only 🔐  UID: ' + db.getUID(), 'error'); return; }

    if (clear) {
      db.set(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/mapSeeds'), null)
        .then(function() { _natLog('✅ seed pins cleared'); })
        .catch(function(e) { _natLog('Firebase error: ' + e.message, 'error'); });
      return;
    }

    var pins = customPins && Object.keys(customPins).length ? customPins : {
      ph01: { lat:14.5995, lng:120.9842, name:'Juan dela Cruz',   message:'Mabuhay from Manila! 🇵🇭',        ts: Date.now()-86400000*1  },
      ph02: { lat:10.3157, lng:123.8854, name:'Maria Santos',     message:'Cebu City represent! 🌺',          ts: Date.now()-86400000*2  },
      ph03: { lat:7.1907,  lng:125.4553, name:'Pedro Reyes',      message:'Davao gang! 🍌',                   ts: Date.now()-86400000*3  },
      ph04: { lat:16.4023, lng:120.5960, name:'Ana Villanueva',   message:'Baguio is cold and I love it ❄️',  ts: Date.now()-86400000*4  },
      ph05: { lat:13.9411, lng:121.1619, name:'Kuya Ben',         message:'Lipa City landers! ☕',            ts: Date.now()-86400000*5  },
      ph06: { lat:14.6760, lng:121.0437, name:'Ate Chel',         message:'QC slay 💅',                       ts: Date.now()-86400000*6  },
      ph07: { lat:14.3292, lng:121.0889, name:'Nathaniel G.',     message:'Cabuyao 🏡',                       ts: Date.now()-86400000*7  },
      ph08: { lat:11.2543, lng:125.0000, name:'Rosel M.',         message:'Hello from Leyte! 💗',             ts: Date.now()-86400000*8  },
      ph09: { lat:9.6500,  lng:123.8500, name:'Angelo T.',        message:'Bohol bai! 🐠',                    ts: Date.now()-86400000*9  },
      ph10: { lat:15.1797, lng:120.5827, name:'Liza R.',          message:'Pampanga/Angeles 🎉',              ts: Date.now()-86400000*10 },
      ph11: { lat:14.4422, lng:121.4419, name:'Mark P.',          message:'Laguna represent 🌿',              ts: Date.now()-86400000*11 },
      ph12: { lat:13.6218, lng:123.1948, name:'Ate Jane',         message:'Naga City hello! ☁️',              ts: Date.now()-86400000*12 },
      ph13: { lat:8.2280,  lng:124.2452, name:'Dong Sison',       message:'Cagayan de Oro 🏔️',               ts: Date.now()-86400000*13 },
      ph14: { lat:18.1969, lng:120.5941, name:'Ate Bing',         message:'Ilocos Norte hehe 🌻',             ts: Date.now()-86400000*14 },
      ph15: { lat:10.7202, lng:122.5621, name:'Gelo V.',          message:'Iloilo City 🌊',                   ts: Date.now()-86400000*15 },
      ph16: { lat:14.8527, lng:120.8167, name:'Kris T.',          message:'Bulacan gang 🐓',                  ts: Date.now()-86400000*16 },
      ph17: { lat:6.9214,  lng:122.0790, name:'Aryan D.',         message:'Zamboanga 🌹',                     ts: Date.now()-86400000*17 },
      ph18: { lat:8.4900,  lng:124.6520, name:'Sheena L.',        message:'Iligan City ⚡',                   ts: Date.now()-86400000*18 },
      ph19: { lat:14.0834, lng:122.9565, name:'Nico B.',          message:'Camarines Sur 🌾',                 ts: Date.now()-86400000*19 },
      ph20: { lat:13.1391, lng:123.7438, name:'Cara A.',          message:'Catanduanes island 🏝️',            ts: Date.now()-86400000*20 },
      us01: { lat:40.7128, lng:-74.0060, name:'Joy Reyes',        message:'NYC Filipino community! 🗽',       ts: Date.now()-86400000*21 },
      au01: { lat:-33.8688,lng:151.2093, name:'Neil Santos',      message:'Sydney OFW 🦘',                    ts: Date.now()-86400000*22 },
      jp01: { lat:35.6762, lng:139.6503, name:'Pia Tanaka',       message:'Tokyo life 🌸',                    ts: Date.now()-86400000*23 },
      sg01: { lat:1.3521,  lng:103.8198, name:'Mitch Cruz',       message:'Singapore OFW 🏙️',                ts: Date.now()-86400000*24 },
      ca01: { lat:43.6532, lng:-79.3832, name:'Jasper Lim',       message:'Toronto! 🍁',                      ts: Date.now()-86400000*25 },
      uk01: { lat:51.5074, lng:-0.1278,  name:'Mae Garcia',       message:'London calling 🎡',                ts: Date.now()-86400000*26 },
      ae01: { lat:25.2048, lng:55.2708,  name:'Robert Flores',    message:'Dubai OFW 🏜️',                    ts: Date.now()-86400000*27 },
      kr01: { lat:37.5665, lng:126.9780, name:'Rhea Kim',         message:'Seoul 💜',                         ts: Date.now()-86400000*28 },
    };

    // Always write to canonical ADMIN_UID path (matches the listener above)
    db.set(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/mapSeeds'), pins)
      .then(function() { _natLog('✅ seeded ' + Object.keys(pins).length + ' pins — they appear on the map live'); })
      .catch(function(e) { _natLog('Firebase error: ' + e.message, 'error'); });
  };

  function _natLog(msg, level) {
    if (window._natConsoleLog) { window._natConsoleLog(msg, level); return; }
    if (level === 'error') console.error('[_seedMapPins]', msg);
    else if (level === 'warn') console.warn('[_seedMapPins]', msg);
    else console.log('[_seedMapPins]', msg);
  }
})();

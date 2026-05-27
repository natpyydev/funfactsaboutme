/**
 * firebase-extensions.js
 *
 * Extends the Firebase app that app2.js already initialised.
 * Adds Firebase Storage and exposes window._natStorage.
 *
 * WHY THIS IS SAFE:
 *   app2.js calls initializeApp(config) once, then sets:
 *     window._natFirebase = { app, db, auth, ... }
 *
 *   This file (also type="module") runs after app2.js because
 *   modules execute in document order. It reuses the same app
 *   object via window._natFirebase.app — no second initializeApp().
 *
 * LOAD ORDER in index.html:
 *   <script type="module" src="app2.js"></script>
 *   <script type="module" src="firebase-extensions.js"></script>   ← this file
 *   <script defer src="archive-data.js"></script>
 *   ...
 *
 * Exposes:
 *   window._natStorage = { storage, ref, uploadBytesResumable, getDownloadURL, deleteObject }
 *   window._natCurrentUID  (alias kept in sync with window.currentUID)
 */

import {
  getStorage,
  ref          as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

import { onAuthStateChanged } from
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ── Wait for app2.js to expose _natFirebase ──────────────────────────
// app2.js is also a module and executes first (source order), so
// window._natFirebase.app is already set by the time this line runs.
const { app, auth } = window._natFirebase;

if (!app) {
  // This should never happen if load order is correct.
  console.error('[firebase-extensions] _natFirebase.app not found.',
    'Ensure app2.js <script> tag appears BEFORE firebase-extensions.js.');
} else {
  // ── Storage ──────────────────────────────────────────────────────
  const storage = getStorage(app);

  window._natStorage = {
    storage,
    ref:                 storageRef,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
  };

  // ── Keep _natCurrentUID in sync with auth state ──────────────────
  // app2.js sets window.currentUID on onAuthStateChanged,
  // but archive-data.js also checks window._natCurrentUID.
  // Both are kept identical here.
  onAuthStateChanged(auth, user => {
    window._natCurrentUID = user ? user.uid : null;
    // Ensure primary alias is also current (app2.js does this too,
    // but belt-and-suspenders for the Storage module's auth context).
    if (user) window.currentUID = user.uid;
  });

  console.log('[firebase-extensions] Storage ready ✓');
}

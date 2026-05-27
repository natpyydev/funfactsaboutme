console.log("starshearts loaded");

import { ref, runTransaction, onValue } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ⭐ RATE
export function rateService(db, id, btn) {
  const r = ref(db, "serviceStars/" + id);
  runTransaction(r, (val) => (val || 0) + 1);

  // ✨ click animation
  if (btn) {
    btn.classList.add("clicked");
    setTimeout(() => btn.classList.remove("clicked"), 150);
  }
}

// ❤️ HEART
export function heartService(db, id, btn) {
  const r = ref(db, "serviceHearts/" + id);
  runTransaction(r, (val) => (val || 0) + 1);

  if (btn) {
    btn.classList.add("clicked");
    setTimeout(() => btn.classList.remove("clicked"), 150);
  }
}

// 👀 LOAD REALTIME + LOGIC
export function loadReactions(db) {

  let starData = {};
  let heartData = {};

  // 🧠 SCORING SYSTEM (Option C)
  function getScores() {
    const scores = {};

    Object.keys({ ...starData, ...heartData }).forEach(id => {
      const stars = starData[id] || 0;
      const hearts = heartData[id] || 0;

      // ⭐ stars are stronger, ❤️ hearts scale slower
      scores[id] = Math.floor((stars * 5) + Math.sqrt(hearts));
    });

    return scores;
  }

  // 🔥 BEST SELLER
  function updateBestSeller() {
    const scores = getScores();

    let bestId = null;
    let max = -1;

    Object.entries(scores).forEach(([id, val]) => {
      if (val > max) {
        max = val;
        bestId = id;
      }
    });

    // reset all
    document.querySelectorAll(".service-row").forEach(row => {
      row.classList.remove("best-seller");
      row.querySelector(".best-tag")?.remove();
    });

    // apply best
    if (bestId) {
      const row = document.querySelector(`[data-id="${bestId}"]`);
      if (row) {
        row.classList.add("best-seller");

        const tag = document.createElement("span");
        tag.className = "best-tag";
        tag.textContent = "🔥 HOT";

        row.querySelector("span").appendChild(tag);
      }
    }
  }

  // 🏆 LEADERBOARD (console for now)
  function updateLeaderboard() {
    const scores = getScores();

    const sorted = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    console.log("🏆 TOP 3:", sorted);
  }

  // ⭐ stars listener
  onValue(ref(db, "serviceStars"), snap => {
    starData = snap.val() || {};

    Object.keys(starData).forEach(id => {
      const el = document.getElementById("star-" + id);
      if (el) el.textContent = starData[id];
    });

    updateBestSeller();
    updateLeaderboard();
  });

  // ❤️ hearts listener
  onValue(ref(db, "serviceHearts"), snap => {
    heartData = snap.val() || {};

    Object.keys(heartData).forEach(id => {
      const el = document.getElementById("heart-" + id);
      if (el) el.textContent = heartData[id];
    });

    updateBestSeller();
    updateLeaderboard();
  });
}
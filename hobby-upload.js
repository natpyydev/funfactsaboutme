function getNatFirebase(){ return window._natFirebase || null; }

// ================================================================
// 📷 HOBBY ADMIN UPLOAD
// Mobile: tap overlay to upload, long-press to remove
// Desktop: right-click overlay to remove
// Big hobby images also support upload/remove.
// ================================================================
const ADMIN_UIDS = ['zNDEej9J3kg79fUYxJjxLqrXJpz2', '8IumnftXW1gJCa4iNbicZ0M0LOg2'];
const UPLOAD_KEY = 'natnat_hobby_uploads';
const BIG_UPLOAD_KEY = 'natnat_hobby_big_uploads';

function getUploads(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
function saveUpload(key, k, v) { const u = getUploads(key); u[k] = v; localStorage.setItem(key, JSON.stringify(u)); }
function deleteUpload(key, k) { const u = getUploads(key); delete u[k]; localStorage.setItem(key, JSON.stringify(u)); }
function addLongPress(el, cb) {
  let timer = null;
  el.addEventListener('touchstart', () => { timer = setTimeout(() => { timer = null; cb(); }, 650); }, { passive: true });
  el.addEventListener('touchend', () => { if (timer) { clearTimeout(timer); timer = null; } });
  el.addEventListener('touchmove', () => { if (timer) { clearTimeout(timer); timer = null; } });
}
function mobileConfirm(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `<div style="background:#fff;border-radius:16px;padding:20px 24px;text-align:center;max-width:280px"><p style="margin:0 0 16px;font-size:15px">${msg}</p><div style="display:flex;gap:10px;justify-content:center"><button id="_mcNo" style="padding:8px 20px;border-radius:20px;border:2px solid #c47bff;background:#fff">Cancel</button><button id="_mcYes" style="padding:8px 20px;border-radius:20px;border:none;background:#c47bff;color:#fff">Remove</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_mcYes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#_mcNo').onclick = () => { overlay.remove(); resolve(false); };
  });
}
function applyImageToSlot(slot, dataUrl) {
  slot.classList.remove('empty');
  const existing = slot.querySelector('[data-slot-img]');
  if (existing) { existing.src = dataUrl; return; }
  slot.innerHTML = `<img src="${dataUrl}" data-slot-img="1" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
}
function tagSlots() {
  document.querySelectorAll('.hobby-card').forEach(card => {
    const hobbyId = card.dataset.hobby || 'misc';
    card.querySelectorAll('.sample-slot').forEach((slot, i) => {
      if (slot.dataset.slotKey) return;
      slot.dataset.slotKey = `${hobbyId}_${i}`;
      const img = slot.querySelector('img');
      if (img) slot.dataset.origSrc = img.getAttribute('src') || '';
    });
  });
}
function tagBigImages() {
  document.querySelectorAll('.hobby-card').forEach(card => {
    const hobbyId = card.dataset.hobby || 'misc';
    const wrap = card.querySelector('.hobby-img-wrap');
    if (!wrap || wrap.dataset.bigKey) return;
    wrap.dataset.bigKey = `big_${hobbyId}`;
    const img = wrap.querySelector('img.hobby-img');
    if (img) wrap.dataset.origSrc = img.getAttribute('src') || '';
  });
}
function restoreUploads() {
  const uploads = getUploads(UPLOAD_KEY);
  document.querySelectorAll('.sample-slot[data-slot-key]').forEach(slot => {
    const url = uploads[slot.dataset.slotKey];
    if (url) applyImageToSlot(slot, url);
  });
}
function restoreBigUploads() {
  const uploads = getUploads(BIG_UPLOAD_KEY);
  document.querySelectorAll('.hobby-img-wrap[data-big-key]').forEach(wrap => {
    const url = uploads[wrap.dataset.bigKey];
    if (url) {
      let img = wrap.querySelector('img.hobby-img');
      if (!img) {
        img = document.createElement('img');
        img.className = 'hobby-img';
        img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        wrap.prepend(img);
      }
      img.src = url;
      const ph = wrap.querySelector('.hobby-placeholder');
      if (ph) ph.style.display = 'none';
    }
  });
}
async function removeSlot(slot, overlay) {
  const ok = await mobileConfirm('Remove this photo?');
  if (!ok) return;
  deleteUpload(UPLOAD_KEY, slot.dataset.slotKey);
  const orig = slot.dataset.origSrc;
  if (orig) {
    slot.classList.remove('empty');
    slot.innerHTML = `<img src="${orig}" data-slot-img="1" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.parentElement.classList.add('empty');this.remove()">`;
  } else {
    slot.innerHTML = '';
    slot.classList.add('empty');
  }
  if (overlay) overlay.textContent = '📷';
}
async function removeBigImage(wrap) {
  const ok = await mobileConfirm('Remove the big hobby photo?');
  if (!ok) return;
  deleteUpload(BIG_UPLOAD_KEY, wrap.dataset.bigKey);
  const orig = wrap.dataset.origSrc;
  const img = wrap.querySelector('img.hobby-img');
  if (img) {
    if (orig) img.src = orig;
    else img.remove();
  }
  const ph = wrap.querySelector('.hobby-placeholder');
  if (ph) ph.style.display = orig ? 'none' : '';
}
function injectAdminOverlays() {
  document.querySelectorAll('.sample-slot[data-slot-key]').forEach(slot => {
    if (slot.querySelector('.slot-upload-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'slot-upload-overlay';
    overlay.title = 'Tap to upload · Hold to remove';
    overlay.textContent = '📷';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    overlay.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        saveUpload(UPLOAD_KEY, slot.dataset.slotKey, ev.target.result);
        applyImageToSlot(slot, ev.target.result);
        overlay.textContent = '✅';
        setTimeout(() => { overlay.textContent = '📷'; }, 1200);
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
    overlay.addEventListener('contextmenu', e => { e.preventDefault(); removeSlot(slot, overlay); });
    addLongPress(overlay, () => removeSlot(slot, overlay));
    document.body.appendChild(fileInput);
    slot.style.position = 'relative';
    slot.appendChild(overlay);
  });
}
function injectBigImageOverlays() {
  document.querySelectorAll('.hobby-img-wrap[data-big-key]').forEach(wrap => {
    if (wrap.querySelector('.big-img-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'big-img-overlay';
    overlay.title = 'Tap to replace · Hold to remove';
    overlay.innerHTML = '📷 <span style="font-size:11px">replace</span>';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    overlay.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        saveUpload(BIG_UPLOAD_KEY, wrap.dataset.bigKey, ev.target.result);
        let img = wrap.querySelector('img.hobby-img');
        if (!img) {
          img = document.createElement('img');
          img.className = 'hobby-img';
          img.alt = '';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          wrap.prepend(img);
        }
        img.src = ev.target.result;
        const ph = wrap.querySelector('.hobby-placeholder');
        if (ph) ph.style.display = 'none';
        overlay.innerHTML = '✅ <span style="font-size:11px">saved</span>';
        setTimeout(() => { overlay.innerHTML = '📷 <span style="font-size:11px">replace</span>'; }, 1200);
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
    overlay.addEventListener('contextmenu', e => { e.preventDefault(); removeBigImage(wrap); });
    addLongPress(overlay, () => removeBigImage(wrap));
    document.body.appendChild(fileInput);
    wrap.style.position = 'relative';
    wrap.appendChild(overlay);
  });
}
export function initHobbyUpload(isAdminUser) {
  tagSlots();
  tagBigImages();
  restoreUploads();
  restoreBigUploads();
  if (isAdminUser) {
    injectAdminOverlays();
    injectBigImageOverlays();
  }
}

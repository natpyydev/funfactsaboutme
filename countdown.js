/* 🎂 BIRTHDAY COUNTDOWN — Sep 4 */
(() => {
  function build() {
    if (document.getElementById('bdayBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'bdayBanner';
    banner.className = 'bday-banner';
    const header = document.querySelector('header');
    if (header && header.parentNode) header.parentNode.insertBefore(banner, header.nextSibling);
    else document.body.insertBefore(banner, document.body.firstChild);
    update(banner);
    setInterval(() => update(banner), 60000);
  }
  function update(el) {
    const now = new Date();
    let bday = new Date(now.getFullYear(), 8, 4); // Sep 4
    if (now > bday) bday = new Date(now.getFullYear() + 1, 8, 4);
    const days = Math.ceil((bday - now) / 86400000);
    const isToday = now.getMonth() === 8 && now.getDate() === 4;
    if (isToday) {
      el.innerHTML = `🎉🎂 IT'S MY BIRTHDAY!! 🎈💗 happy bday to me — go celebrate in messages!`;
      el.classList.add('bday-today');
      launchConfetti();
    } else if (days === 1) {
      el.innerHTML = `🎂 <b>1 day</b> left until my bday tomorrow (Sep 4) 🎈✨`;
    } else {
      el.innerHTML = `🎂 <b>${days}</b> days until natnat's birthday 🎈`;
    }
  }
  function launchConfetti() {
    if (window._bdayConfetti) return;
    window._bdayConfetti = true;
    const colors = ['#ff5c8a','#ffd700','#c79bff','#7fffd4','#ff7eb3'];
    for (let i = 0; i < 80; i++) {
      setTimeout(() => {
        const c = document.createElement('div');
        c.className = 'bday-confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.background = colors[i % colors.length];
        c.style.animationDuration = (2 + Math.random() * 2) + 's';
        c.style.transform = `rotate(${Math.random()*360}deg)`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4500);
      }, i * 80);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

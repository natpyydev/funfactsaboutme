// =========================================================
// 🤖 CHAT-NAT — pattern-matching "AI replica" of you
// Pure client-side. Personality + slang baked in.
// =========================================================

const HISTORY_KEY = 'natnat_chat_history';

const PREFIXES = ['', '', '', '', '', '', '', ''];
const SUFFIXES = ['', ' 😭😭😭', '', '', ' 😆', '', '', '', '', ''];
const FILLERS  = ['hmm', 'wait', 'okay', 'sooo', 'ano nga', 'tbh'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const season = (text) => pick(PREFIXES) + text + pick(SUFFIXES);

const PATTERNS = [
  { re: /\b(hi|hello|hey|kumusta|kamusta|sup|yo|hii)\b/i,
    out: ['uyyY hEllo','oh?','helloooo po','yoww musta?','oh bakit?'] },

  { re: /\b(who are you|sino ka|who is this|what are you)\b/i,
    out: ['i\'m an AI replica of nat 🥺 trained on her vibes','imagine nat — that\'s me. ai version','natnat.exe v2.0 at your service ✨'] },

  { re: /\b(your name|name mo|whats your name|what'?s your name)\b/i,
    out: ['nat 💅','natnat for the friends 👀','call me nat'] },

  { re: /\b(how old|edad|age mo|your age)\b/i,
    out: ['Secrettt','secreettt','Secreeettttttt hehe'] },

  { re: /\b(crush|gf|bf|girlfriend|boyfriend|partner|jowa)\b/i,
    out: ['alaws po','hmm open ako sa offer eme lng','wala po'] },

  { re: /\b(hobby|hobbies|libangan|what do you do|free time)\b/i,
    out: ['coding, digital arts, watching kdramas/anime, ano um matulog','Badminton','chess datii'] },

  { re: /\b(food|kain|favorite food|paborito|snack)\b/i,
    out: ['anything naman ata','ano um wala, undecisive kasi ako','oum wala eh'] },

  { re: /\b(music|song|kanta|favorite song|spotify)\b/i,
    out: ['kpop, jpop, opm, rock, basta maganda pakinggan','basta maganda pakinggan, tas hinde pang genggeng'] },

  { re: /\b(game|games|laro|gaming|favorite game|roblox|minecraft|pgr)\b/i,
    out: ['Hindi nako nag lalaro ng games','pgr supremacy','also love games that i made myself 🫡'] },

  { re: /\b(cute|pretty|gwapa|maganda|ganda|hot|beautiful)\b/i,
    out: ['Thank you po 😭','ako lng toh 😆','Glory to God po','Asuss'] },

  { re: /\b(how are you|kamusta ka|are you ok|kumusta ka)\b/i,
    out: ['Buhayyy Paaaa😭','Kinakaya pa','Basta 😆'] },

  { re: /\b(bye|goodbye|see you|paalam|cya|ttyl)\b/i,
    out: ['babushh shalomm,','babushhhhh Shalom po','SHALOMMMmmm'] },

  { re: /\b(thanks|thank you|salamat|ty)\b/i,
    out: ['Anytime everywhere po 😆','suresure 😆','ikaw pa malakas ka sakin eh 😝'] },

  { re: /\b(joke|funny|tawa|haha|lol|lmao)\b/i,
    out: ['ayyy HAHAH','AYT HAHHAHA','lol'] },

  { re: /\b(coding|code|website|js|javascript|html|firebase|programming)\b/i,
    out: ['yes! built this site wITH YT TUtORIALSS','sHoUTOUT TO ThAtt iNDiAN GUYYYYy','i ALMOST cRieD BecAuse OF erRORS'] },

  { re: /\b(love you|i love|fan|stan|idol)\b/i,
    out: ['Thanks po Glory to God','Thankss po, Glory to God','Gloryy to God po'] },

  { re: /\b(sad|lonely|depressed|tired|drained|stress|stressed)\b/i,
    out: ['goo bhee Kaya moyan, Pag PaPray kita','Kaya yan tandaan mo FIGHTINGG#!!🔥😆','Kaya yan tandaan mo FIGHTINGG#!!🔥'] },

  { re: /\b(help|tulong|how do|paano)\b/i,
    out: ['hmm?','bAtt','whyket?'] },

  { re: /\b(credentials|academic|grade|honor|leadership|wins council)\b/i,
    out: ['check the 📜 Credentials tab! all the receipts are there ✨','With Honors gang 😤','Top 1 2nd quarter grade 10 carried 😭'] },

  { re: /\b(this site|website|gallery|leaderboard|combo|badge)\b/i,
    out: ['try clicking those ⭐❤️ buttons sa services — combo it up to unlock badges ✨','leaderboard ranks people by message love 👀','the site is my baby 🥺'] },

  { re: /\b(service|book|booking|hire|rate|driver|friend)\b/i,
    out: ['check the services section sa baba 👀','hit the book button bhe it goes straight to messenger','rates? free for friends 🥺'] },

  { re: /\b(instrument|guitar|keyboard|musician)\b/i,
    out: ['🎸 hire me as musician ₱600 hehe','yes i play guitar AND keyboard po','strumming intensifies 🎵'] },
];

const FALLBACKS = [
  'hmm?', 'Deyumnn', 'wait WHAT 😭', 'WTTTT', 'FRRRR?',
  'haha sheesh', 'tapos?', 'cuteeee', 'noted', 'explanationn ng joke??',
];

export function generateReply(input) {
  const text = (input || '').trim();
  if (!text) return season('say something muna 👀');
  for (const p of PATTERNS) {
    if (p.re.test(text)) return season(pick(p.out));
  }
  return season(pick(FALLBACKS));
}

// ---------- chat UI ----------

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-60))); } catch {}
}

export function openChat() {
  const overlay = document.getElementById('chatNatOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  renderChat();
  setTimeout(() => document.getElementById('chatNatInput')?.focus(), 100);
}

export function closeChat() {
  const overlay = document.getElementById('chatNatOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  return Math.floor(diff / 3600000) + 'h ago';
}

function renderChat() {
  const list = document.getElementById('chatNatList');
  if (!list) return;
  const hist = loadHistory();
  if (!hist.length) {
    list.innerHTML = `
      <div class="cn-day-label">Today</div>
      <div class="cn-bubble cn-bot">
        <div class="cn-avatar-sm">🤖</div>
        <div class="cn-bubble-inner">
          <div class="cn-msg">heyyy! i'm AI nat 🥺<br>ask me anything, i answer honestly (mostly 😆)</div>
          <div class="cn-time">just now</div>
        </div>
      </div>`;
    return;
  }

  let html = '<div class="cn-day-label">Chat History</div>';
  hist.forEach(m => {
    if (m.who === 'bot') {
      html += `
        <div class="cn-bubble cn-bot">
          <div class="cn-avatar-sm">🤖</div>
          <div class="cn-bubble-inner">
            <div class="cn-msg">${escapeChat(m.text)}</div>
            <div class="cn-time">${timeAgo(m.at || Date.now())}</div>
          </div>
        </div>`;
    } else {
      html += `
        <div class="cn-bubble cn-me">
          <div class="cn-bubble-inner">
            <div class="cn-msg">${escapeChat(m.text)}</div>
            <div class="cn-time">${timeAgo(m.at || Date.now())}</div>
          </div>
          <div class="cn-avatar-sm cn-me-avatar">👤</div>
        </div>`;
    }
  });
  list.innerHTML = html;
  list.scrollTop = list.scrollHeight;
}

function escapeChat(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function sendChatMessage(text) {
  const t = (text || '').trim();
  if (!t) return;
  const hist = loadHistory();
  hist.push({ who: 'me', text: t, at: Date.now() });
  saveHistory(hist);
  renderChat();

  const list = document.getElementById('chatNatList');
  if (list) {
    list.insertAdjacentHTML('beforeend', `
      <div class="cn-bubble cn-bot cn-typing" id="cnTyping">
        <div class="cn-avatar-sm">🤖</div>
        <div class="cn-bubble-inner">
          <div class="cn-msg cn-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`);
    list.scrollTop = list.scrollHeight;
  }

  const delay = 600 + Math.random() * 700;
  setTimeout(() => {
    document.getElementById('cnTyping')?.remove();
    const reply = generateReply(t);
    const h2 = loadHistory();
    h2.push({ who: 'bot', text: reply, at: Date.now() });
    saveHistory(h2);
    renderChat();
  }, delay);
}

export function clearChatHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderChat();
}

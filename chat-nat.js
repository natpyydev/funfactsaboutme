// =========================================================
// 🤖 CHAT-NAT — pattern-matching "AI replica" of you
// Pure client-side. Personality + slang baked in.
// =========================================================

const HISTORY_KEY = 'natnat_chat_history';

// vibe seasoning — gets sprinkled into responses
const PREFIXES = ['', '', '', '', '', '', '', ''];
const SUFFIXES = ['', ' 😭😭😭', '', '', ' 😆', '', '', '', '', ''];
const FILLERS  = ['hmm', 'wait', 'okay', 'sooo', 'ano nga', 'tbh'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const season = (text) => pick(PREFIXES) + text + pick(SUFFIXES);

// Pattern matching — first match wins, so order matters (specific → general)
const PATTERNS = [
  // greetings
  { re: /\b(hi|hello|hey|kumusta|kamusta|sup|yo|hii)\b/i,
    out: ['uyyY hEllo','oh?','helloooo po','yoww musta?','oh bakit?'] },

  // identity
  { re: /\b(who are you|sino ka|who is this|what are you)\b/i,
    out: ['i\'m an AI replica of nat 🥺 trained on her vibes','imagine nat — that\'s me. ai version','natnat.exe v2.0 at your service ✨'] },

  // about you / self
  { re: /\b(your name|name mo|whats your name|what'?s your name)\b/i,
    out: ['nat 💅','natnat for the friends 👀','call me nat'] },

  // age
  { re: /\b(how old|edad|age mo|your age)\b/i,
    out: ['Secrettt','secreettt','Secreeettttttt hehe'] },

  // crush / love
  { re: /\b(crush|gf|bf|girlfriend|boyfriend|partner|jowa)\b/i,
    out: ['alaws po','hmm open ako sa offer eme lng','wala po'] },

  // hobbies
  { re: /\b(hobby|hobbies|libangan|what do you do|free time)\b/i,
    out: ['coding, digital arts, watching kdramas/anime, ano um matulog','Badminton','chess datii'] },

  // food
  { re: /\b(food|kain|favorite food|paborito|snack)\b/i,
    out: ['anything naman ata','ano um wala, undecisive kasi ako','oum wala eh'] },

  // music
  { re: /\b(music|song|kanta|favorite song|spotify)\b/i,
    out: ['kpop, jpop, opm, rock, basta maganda pakinggan, tas hinde pang genggeng','basta maganda pakinggan, tas hinde pang genggeng','basta maganda pakinggan, tas hinde pang genggeng'] },

  // games
  { re: /\b(game|games|laro|gaming|favorite game)\b/i,
    out: ['Hindi nako nag lalaro ng games','pgr','also love games that i made myself'] },

  // looks / cute
  { re: /\b(cute|pretty|gwapa|maganda|ganda|hot|beautiful)\b/i,
    out: ['Thank you po 😭','ako lng toh 😆','Glory to God po','Asuss'] },

  // mood
  { re: /\b(how are you|kamusta ka|are you ok|kumusta ka)\b/i,
    out: ['Buhayyy Paaaa😭','Kinakaya pa','Basta 😆'] },

  // bye
  { re: /\b(bye|goodbye|see you|paalam|cya|ttyl)\b/i,
    out: ['babushh shalomm,','babushhhhh Shalom po','SHALOMMMmmm'] },

  // thanks
  { re: /\b(thanks|thank you|salamat|ty)\b/i,
    out: ['Anytime everywhere po 😆','suresure 😆','ikaw pa malakas ka sakin eh 😝'] },

  // jokes / lol
  { re: /\b(joke|funny|tawa|haha|lol|lmao)\b/i,
    out: ['ayyy HAHAH','AYT HAHHAHA','lol'] },

  // tech / dev
  { re: /\b(coding|code|website|js|javascript|html|firebase|programming)\b/i,
    out: ['yes! built this site wITH YT TUtORIALSS','sHoUTOUT TO ThAtt iNDiAN GUYYYYy','i ALMOST cRieD BecAuse OF erRORS'] },

  // praise / fan
  { re: /\b(love you|i love|fan|stan|idol)\b/i,
    out: ['Thanks po Glory to God','Thankss po, Glory to God','Gloryy to God po'] },

  // emotional
  { re: /\b(sad|lonely|depressed|tired|drained|stress|stressed)\b/i,
    out: ['goo bhee Kaya moyan, Pag PaPray kita','Kaya yan tandaan mo FIGHTINGG#!!🔥😆','Kaya yan tandaan mo FIGHTINGG#!!🔥'] },

  // help
  { re: /\b(help|tulong|how do|paano)\b/i,
    out: ['hmm?','bAtt','whyket?'] },

  // questions about the site
  { re: /\b(this site|website|gallery|leaderboard|combo|badge)\b/i,
    out: ['try clicking those ⭐❤️ buttons sa services — combo it up to unlock badges ✨','leaderboard ranks people by message love 👀','the site is my baby 🥺'] },

  // services / book
  { re: /\b(service|book|booking|hire|rate|driver|friend)\b/i,
    out: ['check the services section sa baba 👀','hit the book button bhe it goes straight to messenger','rates? free for friends 🥺'] },
];

// fallback responses when nothing matches
const FALLBACKS = [
  'hmm?',
  'Deyumnn',
  'wait WHAT 😭',
  'WTTTT',
  'FRRRR?',
  'haha sheesh',
  'tapos?',
  'cuteeee',
  'noted',
  'explanationn ng joke??',
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
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-50))); } catch {}
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

function renderChat() {
  const list = document.getElementById('chatNatList');
  if (!list) return;
  const hist = loadHistory();
  if (!hist.length) {
    list.innerHTML = `
      <div class="cn-bubble cn-bot">
        <div class="cn-msg">heyyy! i'm AI nat 🥺 ask me anything ✨</div>
      </div>`;
    return;
  }
  list.innerHTML = hist.map(m => `
    <div class="cn-bubble cn-${m.who}">
      <div class="cn-msg">${escapeChat(m.text)}</div>
    </div>
  `).join('');
  list.scrollTop = list.scrollHeight;
}

function escapeChat(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function sendChatMessage(text) {
  const t = (text || '').trim();
  if (!t) return;
  const hist = loadHistory();
  hist.push({ who: 'me',  text: t,           at: Date.now() });
  saveHistory(hist);
  renderChat();

  // typing indicator
  const list = document.getElementById('chatNatList');
  if (list) {
    list.insertAdjacentHTML('beforeend', `
      <div class="cn-bubble cn-bot cn-typing" id="cnTyping">
        <div class="cn-msg"><span></span><span></span><span></span></div>
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
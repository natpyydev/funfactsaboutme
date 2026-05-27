/* 🌊 UNDERWATER CUTSCENE — full cinematic visual experience
   The "nat.exe" website appears, breaks, floods, and sinks.
   
   NEW: Click-to-begin approach — user must click to start audio + visuals
   in perfect sync. No "tap to enable audio" hint needed.
   window._launchWaterCutsceneNow() is the entry point. */
(() => {
  const AUDIO_SRC = 'audio/cutscenewater.wav';
  const AFTER_SRC = 'audio/cozywater.wav';
  const TOTAL_S   = 146;

  const LINES = [
    [0,   "it wasn't always like this",                              'normal'],
    [3,   "before the silence...\nbefore the static...",            'whisper'],
    [6,   "before everything sank\nthis place was alive.",          'normal'],
    [10,  "a collection of thoughts",                                'whisper'],
    [13,  "fragments of a person\ntrying to be understood",         'normal'],
    [18,  "lines of code stitched like memories",                   'whisper'],
    [22,  "fragile, imperfect... human.",                           'fragment'],
    [28,  "they called it a site.",                                  'normal'],
    [30,  "but it was never just a site.",                          'normal'],
    [33,  "it was a confession.",                                    'fragment'],
    [36,  "no one noticed\nwhen it started breaking.",              'normal'],
    [39,  "a missing file here...",                                  'whisper'],
    [41,  "a corrupted message there...",                           'whisper'],
    [44,  "reactions stopped counting...",                           'whisper'],
    [46,  "voices stopped appearing...",                             'whisper'],
    [48,  "it was subtle. quiet.",                                   'whisper'],
    [51,  "like drowning —\nbut from the inside.",                  'fragment'],
    [64,  "then came the flood.\nnot water — but data.",            'fragment'],
    [70,  "endless, overwhelming data.\nupdates that erased meaning.", 'normal'],
    [76,  "systems that forgot\nwhat they were built for.",         'normal'],
    [85,  "a world where everything was saved...\nbut not the creator.", 'whisper'],
    [90,  "stayed...\nwatching as their own creation",              'whisper'],
    [94,  "slipped beneath the surface.",                           'fragment'],
    [102, "watching as every message,\nevery interaction...",       'whisper'],
    [107, "became unreadable noise.\nthey tried to fix it.",        'normal'],
    [111, "they always tried.\nbut some things\ndon't break all at once.", 'whisper'],
    [116, "s̸̡o̸̢m̵̺e̵̩ ̴̯t̵̠h̵̟i̴̘n̷̝g̶̞s̸̤ ̶̮d̶̯e̷̮c̷̩a̷͔y̵̫.",  'glitch'],
    [118, "now it rests here.\nburied beneath\nforgotten requests",  'whisper'],
    [122, "and abandoned sessions.\na digital ruin.\nstill running.","whisper"],
    [126, "but no longer understood.",                               'normal'],
    [128, "if you're hearing this —\nyou made it inside.",          'fragment'],
    [131, "be careful.\nthe deeper you go...",                      'normal'],
    [133, "the more it remembers you.",                              'whisper'],
    [135, "it remembers your clicks,\nyour inputs...",              'whisper'],
    [138, "y̶̘̕o̵͓͝ǘ̴̗ṙ̶͜ ̷̘͘n̵̼̽ȧ̵͜m̷̠͠e̸͉͝.\ndon't go deeper.",    'glitch'],
    [140, "and not everything\ndown here\nwants to be forgotten.",  'fragment'],
  ];

  const VIS = [
    { t:  0,  fn: 'showSite'          },
    { t:  0,  fn: 'siteGlitchFeatures'},
    { t:  6,  fn: 'siteAlive'         },
    { t: 10,  fn: 'showMsgPhotowall'  },
    { t: 13,  fn: 'showGalleryPreview'},
    { t: 18,  fn: 'showCodeLines'     },
    { t: 22,  fn: 'siteGlow'          },
    { t: 28,  fn: 'siteColorPulse'    },
    { t: 33,  fn: 'showConfessionFx'  },
    { t: 36,  fn: 'siteBreaking'      },
    { t: 41,  fn: 'showCorruptedMsg'  },
    { t: 44,  fn: 'showReactionError' },
    { t: 44,  fn: 'glitchPulse'       },
    { t: 48,  fn: 'showSilenceDark'   },
    { t: 51,  fn: 'waterStarts'       },
    { t: 57,  fn: 'preFloodTremor'    },
    { t: 64,  fn: 'floodRushes'       },
    { t: 64,  fn: 'showCinematicFloat'},
    { t: 70,  fn: 'dataRain'          },
    { t: 76,  fn: 'showAiCode'        },
    { t: 85,  fn: 'siteSubmerged'     },
    { t: 85,  fn: 'showCreatorSinking'},
    { t: 94,  fn: 'siteSinks'         },
    { t: 98,  fn: 'ruinsFlicker'      },
    { t: 107, fn: 'showStatic'        },
    { t: 116, fn: 'showRuins'         },
    { t: 119, fn: 'abyssCreep'        },
    { t: 126, fn: 'flashlight'        },
    { t: 131, fn: 'zoomDeep'          },
    { t: 135, fn: 'cursorWanders'     },
    { t: 140, fn: 'finalShadow'       },
    { t: 143, fn: 'finalWhisper'      },
  ];

  function buildHTML() {
    return `
    <div class="cs-bg" id="csBg"></div>
    <div class="cs-lb cs-lb-top"></div>
    <div class="cs-lb cs-lb-bot"></div>

    <!-- CLICK TO BEGIN SPLASH -->
    <div class="cs-begin-splash" id="csBeginSplash">
      <div class="cs-begin-inner">
        <div class="cs-begin-icon">🌊</div>
        <div class="cs-begin-title">The Sunken Archive</div>
        <div class="cs-begin-sub">click anywhere to descend</div>
        <div class="cs-begin-pulse"></div>
      </div>
    </div>

    <div class="cs-world" id="csWorld">

      <!-- THE WEBSITE MOCK -->
      <div class="cs-site-wrap" id="csSiteWrap">
        <div class="cs-browser" id="csBrowser">
          <div class="cs-browser-bar">
            <span class="cs-dot" style="background:#ff5f57"></span>
            <span class="cs-dot" style="background:#febc2e"></span>
            <span class="cs-dot" style="background:#28c840"></span>
            <span class="cs-url-bar">nieytan.github.io/funfactsaboutme</span>
          </div>
          <div class="cs-page" id="csPage">
            <div class="cs-pg-header">
              <div class="cs-pg-avatar">🎀</div>
              <div class="cs-pg-nameblock">
                <div class="cs-pg-name">nat.exe ✨</div>
                <div class="cs-pg-sub">welcome to my world 😈</div>
              </div>
            </div>
            <div class="cs-pg-tabs">
              <span class="cs-tab active">about</span>
              <span class="cs-tab">messages</span>
              <span class="cs-tab">gallery</span>
            </div>
            <div class="cs-pg-cards">
              <div class="cs-pg-card" style="--c:#ffd6e8">💗 fun facts</div>
              <div class="cs-pg-card" style="--c:#d6e8ff">🎮 hobbies</div>
              <div class="cs-pg-card sm" style="--c:#e8d6ff">✨ messages</div>
              <div class="cs-pg-card sm" style="--c:#d6ffe8">🎵 music</div>
            </div>
            <div class="cs-pg-react">
              <span>💗 234</span><span>✨ 189</span><span>🎮 77</span><span>🌸 156</span>
            </div>
            <div class="cs-pg-msg">
              <div class="cs-msg-bubble">hi nat!! love ur site 🥹</div>
              <div class="cs-msg-bubble">omg so cuteee 💕</div>
            </div>
          </div>
          <!-- CRACK OVERLAY -->
          <div class="cs-cracks" id="csCracks">
            <svg viewBox="0 0 360 228" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M80,20 L95,60 L70,90 L110,130 L85,180" stroke="rgba(0,0,0,0.4)" stroke-width="1.5" opacity="0"/>
              <path d="M200,10 L185,55 L220,85 L195,140 L230,180" stroke="rgba(0,0,0,0.35)" stroke-width="1.2" opacity="0"/>
              <path d="M300,40 L280,80 L310,120 L290,170" stroke="rgba(0,0,0,0.3)" stroke-width="1" opacity="0"/>
            </svg>
          </div>
          <!-- PIXEL GLITCH STRIPS -->
          <div class="cs-glitch-strips" id="csGlitchStrips"></div>
          <!-- WATER FILL -->
          <div class="cs-site-water" id="csSiteWater">
            <div class="cs-site-wave"></div>
          </div>
        </div>
      </div>

      <!-- GLOBAL WATER LEVEL -->
      <div class="cs-water-level" id="csWaterLevel">
        <div class="cs-water-wave" id="csWaterWave">
          <svg viewBox="0 0 1440 56" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path id="csWavePath" d="M0,28 C240,5 480,50 720,28 C960,5 1200,50 1440,28 L1440,56 L0,56 Z" fill="rgba(0,100,180,0.88)"/>
          </svg>
        </div>
        <div class="cs-water-fill" id="csWaterFill"></div>
      </div>

      <!-- EFFECTS LAYERS -->
      <div class="cs-errors"   id="csErrors"></div>
      <div class="cs-debris"   id="csDebris"></div>
      <div class="cs-rain"     id="csRain"></div>
      <div class="cs-bubbles"  id="csBubbles"></div>
      <!-- EXTRA CINEMATIC LAYERS -->
      <div class="cs-cinematic-floats" id="csCinematicFloats"></div>
      <div class="cs-code-rain" id="csCodeRain"></div>
      <div class="cs-ai-terminal" id="csAiTerminal"></div>
      <div class="cs-corrupted-msg" id="csCorruptedMsg"></div>
      <div class="cs-react-error" id="csReactError"></div>

      <!-- END-GAME ELEMENTS -->
      <div class="cs-flashlight"   id="csFlashlight"></div>
      <div class="cs-cursor-el"    id="csCursorEl">▸</div>
      <div class="cs-shadow-thing" id="csShadow"></div>
    </div>

    <div class="cs-vignette"></div>
    <div class="cs-glitch-frame" id="csGlitchFrame"></div>

    <!-- SUBTITLE -->
    <div class="cs-sub-wrap">
      <div class="cs-sub" id="csSub"></div>
    </div>

    <div class="cs-time-bar"><div class="cs-time-fill" id="csTimeFill"></div></div>
    <button class="cs-skip-btn" id="csSkipBtn">skip ▸▸</button>`;
  }

  function showSub(text, style, el) {
    // Step 1: fade OUT (remove .show — CSS transition handles opacity 1→0)
    el.classList.remove('show');
    // Step 2: after fade-out completes (~380ms), swap content and fade IN
    setTimeout(() => {
      el.className = 'cs-sub cs-sub-' + style;
      el.innerHTML = text.split('\n').map(l => `<span>${l}</span>`).join('');
      // Double-rAF ensures the class-change layout is committed before adding .show
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      if (style === 'glitch') scramble(el, text);
    }, 380);
  }

  const GLITCH_CHARS = '█▓▒░?!/|~<>[]アイウカキク01';
  function scramble(el, final) {
    const plain = final.replace(/\n/g, ' ');
    let r = 0;
    const iv = setInterval(() => {
      if (r >= plain.length) {
        clearInterval(iv);
        el.innerHTML = final.split('\n').map(l => `<span>${l}</span>`).join('');
        return;
      }
      el.innerHTML = `<span>${plain.slice(0,r) + Array.from({length:plain.length-r}, ()=>GLITCH_CHARS[Math.floor(Math.random()*GLITCH_CHARS.length)]).join('')}</span>`;
      r += 4;
    }, 45);
  }

  let waveIv   = null;
  let rainIv   = null;
  let glitchIv = null;
  let waterPct = 0;
  let waterRafId = null;

  const actions = {

    showSite() {
      const wrap = document.getElementById('csSiteWrap');
      if (wrap) wrap.classList.add('visible');
      spawnDebris();
      spawnBubbles();
    },

    // ── NEW: Glitchy site showing features at 0:00 ──
    siteGlitchFeatures() {
      const host = document.getElementById('csCinematicFloats');
      if (!host) return;
      const features = ['💗 fun facts', '🎮 hobbies', '💌 messages', '📷 gallery', '🎵 music', '🏆 leaderboard', '🐱 chibi', '🎯 quests', '🌍 world map', '🎁 items'];
      features.forEach((f, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cs-feature-tag';
          el.textContent = f;
          el.style.cssText = `left:${10+Math.random()*80}%;top:${10+Math.random()*80}%;animation-delay:${i*0.1}s;`;
          host.appendChild(el);
          setTimeout(() => el.remove(), 4000);
        }, i * 180);
      });
      setTimeout(() => triggerGlitch(2), 500);
    },

    siteAlive() {
      document.getElementById('csPage')?.classList.add('alive');
      document.getElementById('csBg')?.classList.add('bg-alive');
    },

    // ── NEW: Show messages & photowall preview at 0:10 ──
    showMsgPhotowall() {
      const host = document.getElementById('csCinematicFloats');
      if (!host) return;
      const msgs = [
        '"hi nat!! love ur site 🥹"',
        '"omg so cuteee 💕"',
        '"slayyy 💅✨"',
        '"who made this?? 👀"',
        '"bestie era 🎀"',
      ];
      msgs.forEach((m, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cs-float-msg';
          el.textContent = m;
          el.style.cssText = `left:${5+Math.random()*85}%;top:${15+Math.random()*65}%;animation-delay:${i*0.15}s;`;
          host.appendChild(el);
          setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),800); }, 3500);
        }, i * 280);
      });
      const photoIcons = ['📷','📸','🖼','🌸','💗'];
      photoIcons.forEach((p, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cs-float-photo-icon';
          el.textContent = p;
          el.style.cssText = `left:${Math.random()*90}%;bottom:${Math.random()*40+10}%;font-size:${22+Math.random()*18}px;animation-delay:${i*0.2}s;`;
          host.appendChild(el);
          setTimeout(() => el.remove(), 4000);
        }, i * 200);
      });
    },

    // ── NEW: Show gallery section preview at 0:13 ──
    showGalleryPreview() {
      const host = document.getElementById('csCinematicFloats');
      if (!host) return;
      const colors = ['#ffd6e8','#d6e8ff','#e8d6ff','#d6ffe8','#ffd6b8','#c8f0ff'];
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cs-float-gallery-thumb';
          el.style.cssText = `left:${5+Math.random()*85}%;top:${10+Math.random()*75}%;background:${colors[i%colors.length]};animation-delay:${i*0.12}s;`;
          el.innerHTML = ['😍','🥺','💅','📷','🌸','✨'][i] + '<br><span style="font-size:7px;opacity:.6">photo '+(i+1)+'</span>';
          host.appendChild(el);
          setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),800); }, 3500);
        }, i * 220);
      }
    },

    // ── NEW: Show HTML code lines at 0:18 ──
    showCodeLines() {
      const host = document.getElementById('csCodeRain');
      if (!host) return;
      host.style.opacity = '1';
      const codeBits = [
        '<div class="nat-site">',
        'background: pink;',
        'border-radius: 16px;',
        '💗 { overflow: hidden; }',
        '<section id="gallery">',
        'font-family: "Nunito";',
        'animation: bounce 0.8s;',
        '.msg-bubble { opacity: 1; }',
        'const db = getDatabase(app);',
        '<h1>nat.exe ✨</h1>',
        'onValue(ref(db,"rateme"), ...)',
        '.chibi { cursor: pointer; }',
        'import { computeBadges }',
        '<button onclick="sendMessage()">',
        'localStorage.setItem("theme")',
        'position: fixed; bottom: 20px;',
      ];
      codeBits.forEach((code, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cs-code-line';
          el.textContent = code;
          el.style.cssText = `left:${Math.random()*80}%;top:${Math.random()*90}%;animation-delay:${i*0.08}s;`;
          host.appendChild(el);
          setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),600); }, 3800);
        }, i * 160);
      });
      setTimeout(() => { host.style.opacity='0'; }, 5500);
    },

    siteGlow() {
      document.getElementById('csBrowser')?.classList.add('glowing');
    },

    siteBreaking() {
      const browser = document.getElementById('csBrowser');
      browser?.classList.remove('glowing');
      browser?.classList.add('breaking');
      document.querySelectorAll('#csCracks path').forEach((p, i) => {
        setTimeout(() => { p.style.opacity = '1'; p.style.transition = 'opacity 0.8s ease'; }, i * 600);
      });
      spawnErrors();
      glitchIv = setInterval(() => triggerGlitch(1), 3000 + Math.random()*2000);
    },

    // ── NEW: Corrupted message at 0:41 ──
    showCorruptedMsg() {
      const host = document.getElementById('csCorruptedMsg');
      if (!host) return;
      host.style.opacity = '1';
      host.innerHTML = `
        <div class="cs-corrupt-wrap">
          <div class="cs-corrupt-label">💌 messages</div>
          <div class="cs-corrupt-bubble">
            <span class="cs-corrupt-text">m̷̛e̸̛s̸̡͞s̷͡a̸̢g̴̡e̸͜ ̸̨̕c̵͝o̷̧͢r̵̀r̸̡ǘ̷p̷̛t̷e̸͜d͡</span>
          </div>
          <div class="cs-corrupt-bubble cs-corrupt-bubble-2">
            <span class="cs-corrupt-text">▓▓▓▓▒░░░NULL</span>
          </div>
          <div class="cs-corrupt-bubble cs-corrupt-bubble-3">
            <span class="cs-corrupt-text">E̶R̶R̶O̶R̶:̶ ̶m̶s̶g̶ ̶n̶o̶t̶ ̶f̶o̶u̶n̶d̶</span>
          </div>
        </div>`;
      setTimeout(() => { host.style.opacity='0'; }, 4000);
    },

    // ── NEW: Reactions going infinite/red at 0:44 ──
    showReactionError() {
      const host = document.getElementById('csReactError');
      if (!host) return;
      host.style.opacity = '1';
      const reacts = ['💗', '✨', '🎮', '🌸'];
      let count = 234;
      const el = document.createElement('div');
      el.className = 'cs-react-error-wrap';
      el.innerHTML = reacts.map((r, i) =>
        `<span class="cs-react-err-btn" id="cs-re-${i}">${r} <span class="cs-re-cnt" id="cs-re-cnt-${i}">${count + i*40}</span></span>`
      ).join('');
      host.appendChild(el);

      const iv = setInterval(() => {
        count += Math.floor(Math.random() * 9999 + 5000);
        reacts.forEach((_, i) => {
          const cnt = document.getElementById('cs-re-cnt-'+i);
          if (cnt) {
            cnt.textContent = count + i * Math.floor(Math.random()*10000);
            cnt.style.color = '#ff0000';
          }
          const btn = document.getElementById('cs-re-'+i);
          if (btn) { btn.style.background = `rgba(255,${Math.floor(Math.random()*50)},${Math.floor(Math.random()*50)},0.3)`; }
        });
      }, 200);

      setTimeout(() => {
        clearInterval(iv);
        host.style.opacity = '0';
        setTimeout(() => host.innerHTML = '', 600);
      }, 3500);
    },

    glitchPulse() { triggerGlitch(2); },

    waterStarts() {
      const wl = document.getElementById('csWaterLevel');
      if (wl) wl.style.display = 'block';
      startWave();
      animateWater(0, 15, 20000);
      const sw = document.getElementById('csSiteWater');
      if (sw) { sw.style.transition = 'height 20s ease-in'; sw.style.height = '35%'; }
    },

    floodRushes() {
      triggerGlitch(3);
      animateWater(waterPct, 80, 14000);
      document.getElementById('csBg')?.classList.add('bg-flood');
      const sw = document.getElementById('csSiteWater');
      if (sw) { sw.style.transition = 'height 12s ease-in'; sw.style.height = '90%'; }
    },

    // ── NEW: Cinematic floating pictures/icons at 1:04 ──
    showCinematicFloat() {
      const host = document.getElementById('csCinematicFloats');
      if (!host) return;
      const items = ['📷','💗','🎀','✨','🌊','📼','💌','🏆','🎮','🌸','💕','🎵','📸','🌷'];
      const images = ['images/hobby_photo.jpg','images/hobby_coding.jpg','images/hobby_music.jpg'];
      items.forEach((item, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cs-cinematic-item';
          el.textContent = item;
          el.style.cssText = `left:${Math.random()*95}%;top:${Math.random()*90}%;font-size:${20+Math.random()*30}px;animation-duration:${6+Math.random()*8}s;animation-delay:${i*0.15}s;`;
          host.appendChild(el);
          setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),1000); }, 10000);
        }, i * 200);
      });
      images.forEach((src, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'cs-cinematic-photo';
          el.style.cssText = `left:${15+i*28}%;top:${20+Math.random()*40}%;animation-delay:${i*0.4}s;background-image:url(${src});`;
          host.appendChild(el);
          setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),1200); }, 12000);
        }, i * 600 + 400);
      });
    },

    dataRain() {
      const host = document.getElementById('csRain');
      if (!host) return;
      host.style.opacity = '1';
      let count = 0;
      rainIv = setInterval(() => {
        count++;
        const s = document.createElement('span');
        s.className = 'cs-rain-char';
        const chars = '01ABCDEFabcdef!@#$%&<>';
        s.textContent = chars[Math.floor(Math.random()*chars.length)];
        s.style.left = Math.random()*100 + '%';
        s.style.animationDuration = (1.2 + Math.random()*1.8) + 's';
        s.style.fontSize = (9 + Math.random()*8) + 'px';
        s.style.color = Math.random() > 0.7 ? 'rgba(255,80,80,.7)' : 'rgba(0,220,180,.6)';
        host.appendChild(s);
        setTimeout(() => s.remove(), 3500);
        if (count > 180) clearInterval(rainIv);
      }, 80);
    },

    // ── NEW: AI Nat saying random codes at 1:16 ──
    showAiCode() {
      const host = document.getElementById('csAiTerminal');
      if (!host) return;
      host.style.opacity = '1';
      const aiLines = [
        'AI Nat: hello, how can i help you today?',
        '> undefined is not a function',
        'AI Nat: i am nat, i am here for you',
        '> NaN + love = NaN',
        'AI Nat: 01100001 01101100 01101111 01101110 01100101',
        '> ERROR: emotion overflow',
        'AI Nat: [object Object][object Object]',
        '> stack trace: heart.js line 1',
        'AI Nat: f̶u̶n̶c̶t̶i̶o̶n̶ ̶b̶e̶(̶)̶ ̶{̶ ̶r̶e̶t̶u̶r̶n̶ ̶n̶u̶l̶l̶;̶ ̶}̶',
        '> WARN: memory of creator not found',
      ];
      let lineIdx = 0;
      const typed = document.createElement('div');
      typed.className = 'cs-ai-terminal-box';
      host.appendChild(typed);

      const typeNext = () => {
        if (lineIdx >= aiLines.length) return;
        const line = document.createElement('div');
        line.className = 'cs-ai-line';
        line.textContent = aiLines[lineIdx++];
        typed.appendChild(line);
        typed.scrollTop = typed.scrollHeight;
        setTimeout(typeNext, 900 + Math.random() * 400);
      };
      typeNext();

      setTimeout(() => { host.style.opacity='0'; setTimeout(()=>host.innerHTML='',800); }, 9500);
    },

    siteSubmerged() {
      document.getElementById('csBrowser')?.classList.add('submerged');
      animateWater(waterPct, 90, 10000);
    },

    // ── NEW: Creator sinking at 1:25 ──
    showCreatorSinking() {
      const host = document.getElementById('csCinematicFloats');
      if (!host) return;
      const el = document.createElement('div');
      el.className = 'cs-creator-sinking';
      el.innerHTML = `
        <div class="cs-creator-silhouette">🧑‍💻</div>
        <div class="cs-creator-bubble">i made this...</div>
        <div class="cs-creator-bubble cs-creator-bubble2">...where did it go?</div>
      `;
      el.style.cssText = 'left:50%;transform:translateX(-50%) translateY(0);bottom:30%;opacity:0;transition:all 12s ease-in;';
      host.appendChild(el);
      requestAnimationFrame(() => {
        el.style.opacity = '0.7';
        setTimeout(() => {
          el.style.transform = 'translateX(-50%) translateY(200px)';
          el.style.opacity = '0';
          el.style.filter = 'blur(4px)';
        }, 800);
      });
      setTimeout(() => el.remove(), 14000);
    },

    siteSinks() {
      const wrap = document.getElementById('csSiteWrap');
      if (wrap) {
        wrap.style.transition = 'transform 16s cubic-bezier(.4,0,.8,1), opacity 14s ease-in, filter 10s ease';
        wrap.style.transform = 'translateY(280px) rotate(12deg) scale(0.55)';
        wrap.style.opacity   = '0.15';
        wrap.style.filter    = 'grayscale(90%) blur(2px) brightness(0.3)';
      }
      clearInterval(glitchIv);
      animateWater(waterPct, 100, 12000);
    },

    showStatic() {
      const gf = document.getElementById('csGlitchFrame');
      if (!gf) return;
      gf.classList.add('full-static');
      triggerGlitch(4);
      setTimeout(() => gf.classList.remove('full-static'), 1800);
    },

    showRuins() {
      document.getElementById('csBg')?.classList.add('bg-abyss');
      const wrap = document.getElementById('csSiteWrap');
      if (wrap) {
        wrap.style.filter    = 'grayscale(100%) blur(3px) brightness(0.12)';
        wrap.style.opacity   = '0.25';
        wrap.style.transform = 'translateY(260px) rotate(10deg) scale(0.5)';
      }
      const bubbles = document.getElementById('csBubbles');
      if (bubbles) {
        for (let i=0; i<8; i++) {
          setTimeout(() => {
            const b = document.createElement('div');
            b.className = 'cs-bubble ruins-bubble';
            const sz = 3 + Math.random()*10;
            b.style.cssText = `left:${35+Math.random()*30}%;width:${sz}px;height:${sz}px;animation-duration:${5+Math.random()*8}s;`;
            bubbles.appendChild(b);
          }, i*700);
        }
      }
    },

    flashlight() {
      const fl = document.getElementById('csFlashlight');
      if (!fl) return;
      fl.style.opacity = '1';
      let px = 15, py = 60, vx = .25, vy = -.15;
      setInterval(() => {
        px += vx + (Math.random()-.5)*.2;
        py += vy + (Math.random()-.5)*.15;
        if (px < 10 || px > 80) vx *= -1;
        if (py < 40 || py > 80) vy *= -1;
        fl.style.background = `radial-gradient(ellipse 150px 100px at ${px}% ${py}%, rgba(200,235,255,0.13) 0%, rgba(100,180,255,0.04) 40%, transparent 70%)`;
      }, 120);
    },

    zoomDeep() {
      document.getElementById('csWorld')?.classList.add('zoom-deep');
    },

    cursorWanders() {
      const el = document.getElementById('csCursorEl');
      if (!el) return;
      el.style.opacity = '1';
      const wrap = document.getElementById('csSiteWrap');
      const base = wrap ? wrap.getBoundingClientRect() : { left: window.innerWidth/2 - 80, top: window.innerHeight/2 + 100, width:160, height:120 };
      const moves = [
        [base.left + base.width*.3,  base.top + base.height*.4,  0],
        [base.left + base.width*.6,  base.top + base.height*.25, 1400],
        [base.left + base.width*.45, base.top + base.height*.7,  2600],
        [base.left + base.width*.7,  base.top + base.height*.5,  4000],
      ];
      moves.forEach(([tx, ty, delay]) => {
        setTimeout(() => {
          el.style.left = tx + 'px';
          el.style.top  = ty + 'px';
          setTimeout(() => { el.classList.add('clicking'); setTimeout(() => el.classList.remove('clicking'), 350); }, delay + 800);
        }, delay);
      });
    },

    finalShadow() {
      const sh = document.getElementById('csShadow');
      if (!sh) return;
      sh.style.opacity = '1';
      sh.style.right = '-280px';
      setTimeout(() => {
        sh.style.transition = 'right 6s ease-in-out, opacity 4s ease';
        sh.style.right = '15%';
        setTimeout(() => { sh.style.opacity = '0'; }, 5000);
      }, 100);
    },

    // ── NEW: subtle background color pulse at t=28 ("they called it a site") ──
    siteColorPulse() {
      const bg = document.getElementById('csBg');
      if (!bg) return;
      bg.style.transition = 'background 3s ease';
      bg.style.background = 'radial-gradient(ellipse 85% 75% at 38% 28%, rgba(60,12,100,.92) 0%, #060410 100%)';
      setTimeout(() => {
        bg.style.background = 'radial-gradient(ellipse 90% 80% at 40% 30%, rgba(30,8,75,.95) 0%, #060410 100%)';
      }, 3500);
    },

    // ── NEW: glitch + text flash at t=33 ("it was a confession") ──
    showConfessionFx() {
      triggerGlitch(2);
      const host = document.getElementById('csCinematicFloats');
      if (!host) return;
      const el = document.createElement('div');
      el.className = 'cs-confession-tag';
      el.textContent = 'c o n f e s s i o n';
      el.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);position:absolute;';
      host.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 800); }, 2200);
    },

    // ── NEW: darkness pulse at t=48 ("it was subtle. quiet.") ──
    showSilenceDark() {
      const gf = document.getElementById('csGlitchFrame');
      if (gf) { gf.style.opacity = '0.5'; setTimeout(() => { gf.style.opacity = '0'; }, 2000); }
      const bg = document.getElementById('csBg');
      if (bg) {
        bg.style.transition = 'background 2s ease';
        bg.style.background = 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(10,4,30,.98) 0%, #020208 100%)';
      }
    },

    // ── NEW: subtle tremor just before the flood at t=57 ──
    preFloodTremor() {
      const world = document.getElementById('csWorld');
      if (!world) return;
      let shakes = 0;
      const iv = setInterval(() => {
        shakes++;
        const dx = (Math.random() - 0.5) * 6;
        const dy = (Math.random() - 0.5) * 4;
        world.style.transform = `translate(${dx}px,${dy}px)`;
        if (shakes > 14) { clearInterval(iv); world.style.transform = ''; }
      }, 120);
      triggerGlitch(2);
    },

    // ── NEW: debris flicker in ruins at t=98 ──
    ruinsFlicker() {
      const gf = document.getElementById('csGlitchFrame');
      if (!gf) return;
      let f = 0;
      const iv = setInterval(() => {
        f++;
        gf.style.opacity = String(Math.random() * 0.4);
        if (f > 8) { clearInterval(iv); gf.style.opacity = '0'; }
      }, 180);
    },

    // ── NEW: abyss creep — slow darkness closing in at t=119 ──
    abyssCreep() {
      const bg = document.getElementById('csBg');
      if (!bg) return;
      bg.style.transition = 'background 6s ease';
      bg.style.background = 'radial-gradient(ellipse 50% 40% at 50% 100%, rgba(0,10,20,.99) 0%, #000 100%)';
    },

    // ── NEW: final whisper text at t=143 ──
    finalWhisper() {
      const host = document.getElementById('csCinematicFloats');
      if (!host) return;
      const el = document.createElement('div');
      el.className = 'cs-final-whisper';
      el.textContent = 'you were warned.';
      el.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);position:absolute;';
      host.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 1200); }, 2500);
    },
  };

  function animateWater(fromPct, toPct, durMs) {
    if (waterRafId) cancelAnimationFrame(waterRafId);
    const start = performance.now();
    const step = (now) => {
      const p    = Math.min(1, (now - start) / durMs);
      const ease = p < .5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
      waterPct   = fromPct + (toPct - fromPct) * ease;
      const wl   = document.getElementById('csWaterLevel');
      if (wl) wl.style.height = waterPct + 'vh';
      if (p < 1) waterRafId = requestAnimationFrame(step);
    };
    waterRafId = requestAnimationFrame(step);
  }

  function startWave() {
    if (waveIv) return;
    const path = document.getElementById('csWavePath');
    if (!path) return;
    let t = 0;
    waveIv = setInterval(() => {
      t += 0.06;
      const s = Math.sin, c = Math.cos;
      path.setAttribute('d',
        `M0,28 C${240+s(t)*30},${5+s(t+1)*12} ${480+c(t+.5)*25},${50+c(t+2)*12} ${720},${28+s(t+.8)*10} C${960+s(t+2)*30},${5+s(t+3)*12} ${1200+c(t+1)*25},${50+c(t+4)*12} 1440,${28+s(t+1.5)*10} L1440,56 L0,56 Z`
      );
    }, 80);
  }

  function triggerGlitch(intensity) {
    const gf = document.getElementById('csGlitchFrame');
    if (!gf) return;
    let f = 0;
    const total = intensity * 3;
    gf.classList.add('active');
    const iv = setInterval(() => {
      f++;
      gf.style.transform = `translateX(${(Math.random()-.5)*6*intensity}px)`;
      gf.style.opacity   = String(.18 + Math.random()*.45);
      if (f >= total) {
        clearInterval(iv);
        gf.classList.remove('active');
        gf.style.cssText = '';
      }
    }, 80);
  }

  const ERRORS = ['404: page not found','ERR: file missing','TypeError: undefined','WARN: memory leak','Connection reset','null reference','Stack overflow','Uncaught error','[object Object]','heap corruption','NaN is not a number'];
  function spawnErrors() {
    const host = document.getElementById('csErrors');
    if (!host) return;
    ERRORS.slice(0,6).forEach((txt, i) => {
      setTimeout(() => {
        const e = document.createElement('div');
        e.className = 'cs-error-msg';
        e.textContent = txt;
        e.style.left   = (15 + Math.random()*70) + '%';
        e.style.bottom = (50 + Math.random()*120) + 'px';
        e.style.animationDelay = (i * .15) + 's';
        host.appendChild(e);
        setTimeout(() => e.remove(), 7000);
      }, i * 550 + Math.random() * 300);
    });
  }

  function spawnDebris() {
    const host = document.getElementById('csDebris');
    if (!host) return;
    const colors = ['#ff7eb6','#f7b8c8','#ffd6e8','#c47bff','#e8f0ff','#ffecd6'];
    for (let i=0; i<10; i++) {
      const d = document.createElement('div');
      d.className = 'cs-debris-piece';
      const w = 18 + Math.random()*60, h = 6 + Math.random()*18;
      d.style.cssText = `left:${8+Math.random()*84}%;top:${15+Math.random()*65}%;width:${w}px;height:${h}px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${10+Math.random()*16}s;animation-delay:${Math.random()*-12}s;opacity:${.06+Math.random()*.2};border-radius:${Math.random()>.5?'4px':'999px'};`;
      host.appendChild(d);
    }
  }

  function spawnBubbles() {
    const host = document.getElementById('csBubbles');
    if (!host) return;
    for (let i=0; i<20; i++) {
      const b = document.createElement('div');
      b.className = 'cs-bubble';
      const sz = 3 + Math.random()*16;
      b.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz}px;animation-duration:${8+Math.random()*18}s;animation-delay:${Math.random()*-24}s;opacity:${.05+Math.random()*.2};`;
      host.appendChild(b);
    }
  }

  let _launched = false;

  function launch() {
    if (_launched) return;
    _launched = true;

    const ov = document.createElement('div');
    ov.id    = 'waterCutscene';
    ov.innerHTML = buildHTML();
    document.body.appendChild(ov);
    ov.classList.add('show');

    const audio = new Audio(AUDIO_SRC);
    audio.volume = 0.88;

    const subEl    = document.getElementById('csSub');
    const timeFill = document.getElementById('csTimeFill');
    const splash   = document.getElementById('csBeginSplash');

    let skipped  = false;
    let lastLine = -1;
    let lastVis  = -1;
    let rafId    = null;
    let started  = false;

    function startTimeline() {
      if (started) return;
      started = true;

      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => { if (splash) splash.style.display = 'none'; }, 700);
      }

      audio.play().catch(() => {});

      const startMs = performance.now();

      function tick() {
        if (skipped) return;
        const t = (performance.now() - startMs) / 1000;

        if (timeFill) timeFill.style.width = Math.min(100, t / TOTAL_S * 100) + '%';

        for (let i = lastVis + 1; i < VIS.length; i++) {
          if (t >= VIS[i].t) { actions[VIS[i].fn]?.(); lastVis = i; }
          else break;
        }

        let li = -1;
        for (let i = 0; i < LINES.length; i++) { if (t >= LINES[i][0]) li = i; else break; }
        if (li !== lastLine && li >= 0) { lastLine = li; showSub(LINES[li][1], LINES[li][2], subEl); }

        if (t < TOTAL_S) {
          rafId = requestAnimationFrame(tick);
        } else {
          finish(false);
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    // ── User must click to begin (ensures audio plays in user gesture) ──
    ov.addEventListener('click', function onFirstClick(e) {
      if (e.target.id === 'csSkipBtn') return;
      ov.removeEventListener('click', onFirstClick);
      startTimeline();
    }, { capture: true });

    // Also start when skip is pressed (skip = start immediately + finish)
    function finish(wasSkipped) {
      if (skipped) return;
      skipped = true;
      if (!started) startTimeline(); // ensure audio started
      if (rafId) cancelAnimationFrame(rafId);
      clearInterval(waveIv);
      clearInterval(rainIv);
      clearInterval(glitchIv);
      if (waterRafId) cancelAnimationFrame(waterRafId);
      audio.pause();
      ov.classList.add('cs-ending');
      setTimeout(() => {
        ov.remove();
        const bg = document.getElementById('bgMusic');
        if (bg) {
          bg.src = AFTER_SRC;
          bg.volume = window.natVolume || 0.8;
          bg.muted = false;
          bg.loop  = true;
          bg.load();
          bg.play().catch(() => {});
        }
      }, 900);
      if (!wasSkipped) {
        setTimeout(() => {
          // Award item (shows item toast)
          if (window.awardItem) window.awardItem('item_deep_archive');
          // Award badge — persists to localStorage so it survives page refresh
          if (window.awardLocalBadge) window.awardLocalBadge('badge_deep_abyss');
          // Also write to Firebase for cross-device persistence
          const db = window._natDB;
          if (db) {
            const uid = db.getUID?.();
            if (uid) {
              db.set(db.ref(db.db, 'userSpecialBadges/' + uid + '/badge_deep_abyss'), true).catch(() => {});
            }
          }
        }, 1500);
      }
    }

    audio.addEventListener('ended', () => finish(false));
    document.getElementById('csSkipBtn')?.addEventListener('click', () => finish(true));
  }

  (function watchLoader() {
    if (localStorage.getItem('nat-theme-override') !== 'underwater') return;
    function startWatch() {
      const loader = document.getElementById('loader');
      if (!loader) return;
      if (loader.style.display === 'none' || parseFloat(loader.style.opacity || '1') < 0.5) {
        setTimeout(launch, 50);
        return;
      }
      const obs = new MutationObserver(() => {
        const op = parseFloat(loader.style.opacity || '1');
        const dn = loader.style.display === 'none';
        if (op < 0.5 || dn) {
          obs.disconnect();
          setTimeout(launch, 50);
        }
      });
      obs.observe(loader, { attributes: true, attributeFilter: ['style'] });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startWatch, { once: true });
    } else {
      startWatch();
    }
  })();

  window._launchWaterCutsceneNow = launch;
})();

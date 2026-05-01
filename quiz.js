/* 🎯 HOW WELL DO YOU KNOW NAT — quiz (last Q has no correct answer 😈) */
(() => {
  const QUESTIONS = [
    { q: "What month is natnat's birthday?",
      a: ['August','September','October','November'], correct: 1 },
    { q: "What does nat call this site?",
      a: ['my portfolio','my hidden corner','my blog','my domain'], correct: 1 },
    { q: "Default song that plays in the background?",
      a: ['Lofi Nights','Cozy Clicks','Pink Noise','Aesthetic Beats'], correct: 1 },
    { q: "What's nat's overall vibe?",
      a: ['emo & quiet','Random','Bipolar','inverter'], correct: 1 },
    { q: "Which emoji does nat overuse the most?",
      a: ['😭','🥺','😆','all of the above'], correct: 3 },
    { q: "How many service categories are there?",
      a: ['1 (Driving only)','2 (Driving + Special)','3','5'], correct: 1 },
    { q: "What does the 🐛 Debugger role unlock?",
      a: ['rainbow text','live console overlay','admin panel','flying chibi'], correct: 1 },
    { q: "What language does nat slip into messages?",
      a: ['Spanish','Filipino','Korean','Japanese'], correct: 1 },
    { q: "What's the highest combo badge tier called?",
      a: ['Legend','Volcanic','Mythic','Immortal'], correct: 1 },
    /* FINAL — every answer is wrong on purpose */
    { q: "FINAL: Who is the cutest person in the world?",
      a: ['ikaw', 'ako', 'Natnat', 'Nobody'], correct: -1 },
  ];

  function build() {
    if (document.getElementById('quizSection')) return;
    const sec = document.createElement('section');
    sec.id = 'quizSection';
    sec.className = 'quiz-section';
    sec.innerHTML = `
      <h2 class="section-title">🎯 how well do you know me?</h2>
      <p class="section-sub">10 questions · btw the last one is rigged 😈 (no perfect score allowed lol)</p>
      <div id="quizBox" class="quiz-box"></div>
    `;
    document.querySelector('main').appendChild(sec);
    showStart();
  }

  let answers = [], idx = 0;

  function showStart() {
    const best = parseInt(localStorage.getItem('nat-quiz-best') || '0', 10);
    const max = QUESTIONS.length - 1; // last Q can't be right
    document.getElementById('quizBox').innerHTML = `
      <div class="quiz-start">
        <div class="quiz-emoji">🎯</div>
        <h3>your best: <b>${best}</b> / ${QUESTIONS.length}</h3>
        <p style="opacity:.7;font-size:13px">max possible: ${max} (the final q is impossible 💀)</p>
        <button class="quiz-start-btn" onclick="window._startQuiz()">start quiz 🚀</button>
      </div>
    `;
  }
  window._startQuiz = function() { answers = []; idx = 0; showQ(); };

  function showQ() {
    const q = QUESTIONS[idx];
    const isFinal = idx === QUESTIONS.length - 1;
    document.getElementById('quizBox').innerHTML = `
      <div class="quiz-q">
        <div class="quiz-num">Question ${idx+1} / ${QUESTIONS.length}${isFinal?' · 😈 final':''}</div>
        <h3 class="quiz-text">${q.q}</h3>
        <div class="quiz-options">
          ${q.a.map((opt, i) => `<button class="quiz-opt" data-i="${i}">${opt}</button>`).join('')}
        </div>
        <div class="quiz-progress"><span style="width:${(idx/QUESTIONS.length)*100}%"></span></div>
      </div>
    `;
    document.querySelectorAll('.quiz-opt').forEach(b => {
      b.onclick = () => answer(parseInt(b.dataset.i, 10));
    });
  }

  function answer(picked) {
    const q = QUESTIONS[idx];
    const correct = q.correct === picked;
    answers.push({ picked, correct });
    document.querySelectorAll('.quiz-opt').forEach((b, i) => {
      b.disabled = true;
      if (i === picked) b.classList.add(correct ? 'right' : 'wrong');
      if (q.correct === i) b.classList.add('right');
    });
    // For the rigged final, mark all as wrong
    if (q.correct === -1) {
      document.querySelectorAll('.quiz-opt').forEach(b => {
        b.classList.remove('right');
        if (b.dataset.i == picked) b.classList.add('wrong');
      });
    }
    setTimeout(() => {
      idx++;
      if (idx >= QUESTIONS.length) finish();
      else showQ();
    }, 950);
  }

  function finish() {
    const correct = answers.filter(a => a.correct).length;
    const total = QUESTIONS.length;
    const max = total - 1;
    const best = Math.max(parseInt(localStorage.getItem('nat-quiz-best')||'0',10), correct);
    localStorage.setItem('nat-quiz-best', best);
    let msg, emoji;
    if (correct === max) { msg = "🤩 literal max possible — you basically know me fr"; emoji = '🏆'; }
    else if (correct >= 7) { msg = "✨ basically my soulmate"; emoji = '💖'; }
    else if (correct >= 4) { msg = "🌸 not bad, you do listen sometimes"; emoji = '🌸'; }
    else { msg = "😭 do you even know me?? read the site bestie"; emoji = '😭'; }
    document.getElementById('quizBox').innerHTML = `
      <div class="quiz-end">
        <div class="quiz-emoji">${emoji}</div>
        <h3>you got <b>${correct}</b> / ${total}</h3>
        <p class="quiz-msg">${msg}</p>
        <p style="opacity:.6;font-size:12px">(no one will ever get ${total}/${total} — the last q is rigged 😈)</p>
        <button class="quiz-start-btn" onclick="window._startQuiz()">try again 🔄</button>
      </div>
    `;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

/* MyBadQuiz – About page. Edit the text here. */
QB.viewAbout = function () {
  const { app, SUBJ, BADGES } = QB, total = SUBJ.reduce((n, s) => n + s.questions.length, 0);
  app.innerHTML = `<section class="hero"><h1>About MyBadQuiz</h1><p>A free review tool for students. Built to make studying for exams feel more like a game.</p></section>
  <div class="about">
  <div class="panel"><h2>What this website is</h2>
  <p>MyBadQuiz is a quiz reviewer made <b>for educational purposes and exam review only</b>. It turns lesson handouts into practice questions so you can test yourself, find weak spots and revise faster. It is not a replacement for attending class, reading the full handouts or asking your instructor.</p></div>
  <div class="panel"><h2>Please note</h2><ul>
  <li>The questions are written from the course handouts (${SUBJ.map(s => s.code + ' / ' + s.course).join(', ')}). Handout content belongs to its respective owners. This site is a student-made study aid and is <b>not an official product</b> of any school.</li>
  <li>Questions can contain mistakes. Always check answers against your handouts and your instructor. If a question looks wrong, trust the handout and tell whoever maintains the site.</li>
  <li>Scores, XP and badges are for fun and motivation. They do not predict your real exam results.</li></ul></div>
  <div class="panel"><h2>What is inside</h2><div class="stats" style="margin:0 0 12px"><span class="pill"><b>${SUBJ.length}</b> subjects</span><span class="pill"><b>${total}</b> questions</span><span class="pill"><b>${Object.keys(BADGES).length}</b> badges</span></div><ul>
  <li><b>Subjects:</b> quizzes with a timer, hints, instant feedback, 50/50 lifelines, retry and a score review.</li>
  <li><b>Practice:</b> endless relaxed mode with streaks.</li>
  <li><b>Arena:</b> an 11-boss quiz shooter with music, daily quests, coins and a shop, a daily challenge, survival, weak-spot review, and online multiplayer (Race, co-op Boss Raid and the wacky Super Chaos mode) with power-ups, including jumpscares.</li>
  <li><b>Ranks:</b> a global leaderboard (when the host enables it) and a "This device" board of players you met online. Sharing your stats is off by default.</li>
  <li><b>Profile:</b> pick an emoji avatar or upload your own photo, choose a name, and unlock ship skins and avatar frames.</li>
  <li><b>Cards:</b> flashcards, including weak-only decks.</li>
  <li><b>Library:</b> search every question, filter by mastery, save favorites and print a reviewer.</li>
  <li><b>History:</b> filter by subject, with tabs for overview, mastery map, badges and attempts; export and import everything.</li>
  <li><b>Handy extras:</b> read questions aloud, look up topics on Wikipedia, share your score card, keep the screen awake, fullscreen boss fights, and install it as an app that works offline.</li></ul></div>
  <div class="panel"><h2>Online race and privacy</h2>
  <p>Your progress, history and settings are stored only in your own browser. There is no account and nothing is uploaded. Online Race connects players directly (peer to peer) through a free public connection service that only helps two browsers find each other. Only your display name and race answers are shared with the people in your room.</p></div>
  <div class="panel"><h2>Shortcuts</h2><ul class="kbd">
  <li><kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>/</kbd> command palette</li><li><kbd>1</kbd>–<kbd>4</kbd> / <kbd>A</kbd>–<kbd>D</kbd> answer</li><li><kbd>H</kbd> hint · <kbd>F</kbd> 50/50 (quiz) or freeze (boss)</li><li><kbd>S</kbd> save question · <kbd>P</kbd> pause</li><li><kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>Space</kbd> flip card / ultimate</li></ul></div>
  <div class="panel"><h2>For whoever hosts it</h2><p>Everything is plain HTML, CSS and JavaScript, so it runs on GitHub Pages with no build step. Add a subject by copying a file in <code>data/</code>, editing the questions, and adding one <code>&lt;script&gt;</code> line to <code>index.html</code>. The README explains the details.</p></div>
  <p class="sub" style="text-align:center">MyBadQuiz v1.7 · made by students, for students. Study hard, and rest too.</p></div>`;
};

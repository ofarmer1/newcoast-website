/* Home page motion and interaction. Every effect checks reduced motion first,
   and the page reads completely without this script. */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Video buttons (WCAG 2.2.2: anything that moves can be paused) ---------- */
  const userPaused = new Set();
  function syncBtn(btn, video) {
    const paused = video.paused;
    btn.setAttribute('aria-pressed', paused);
    btn.setAttribute('aria-label', (paused ? 'Play ' : 'Pause ') + (video.id === 'heroVideo' ? 'background video' : 'construction video'));
  }
  $$('.vid-btn[data-video]').forEach(btn => {
    const video = document.getElementById(btn.dataset.video);
    btn.hidden = false;
    btn.addEventListener('click', () => {
      if (video.paused) { userPaused.delete(video); video.play().catch(() => {}); }
      else { userPaused.add(video); video.pause(); }
    });
    video.addEventListener('play', () => syncBtn(btn, video));
    video.addEventListener('pause', () => syncBtn(btn, video));
    syncBtn(btn, video);
  });

  /* ---------- 1 Hero: blueprint, push down the drive aisle, then the film ---------- */
  const film = $('#film'), heroVideo = $('#heroVideo'), filmCopy = $('#filmCopy'), fpSvg = $('.fp-svg', film), fpG = $('.fp-g', film);
  // MP4 (H.264) everywhere it plays; WebM for the few browsers without it.
  const heroSrc = matchMedia('(max-width: 760px)').matches ? heroVideo.dataset.srcSm : heroVideo.dataset.src;
  heroVideo.src = heroVideo.canPlayType('video/mp4; codecs="avc1.640028"') ? heroSrc : heroSrc.replace(/\.mp4$/, '.webm');
  const clamp = v => Math.min(1, Math.max(0, v));
  const ease = v => v * v * (3 - 2 * v);
  // The camera starts on the whole site (s0) and ends over the drive aisle (s1, focus fx/fy),
  // framed like the clip's first frame.
  const vb = fpSvg.viewBox.baseVal, vcx = vb.x + vb.width / 2, vcy = vb.y + vb.height / 2;
  const [s0, s1, fx, fy, cx0, cy0] = ['s0', 's1', 'fx', 'fy', 'cx0', 'cy0'].map(k => +fpSvg.dataset[k]);
  // Where the aisle sits on screen in the opening view; it glides to the centre as the camera closes in.
  const ax0 = vcx + s0 * (fx - cx0), ay0 = vcy + s0 * (fy - cy0);
  let heroPinned = false, fpDraw = 0, fpStarted = false;
  function setHeroPin() {
    heroPinned = motion.matches && innerHeight >= 600;
    film.classList.toggle('pin', heroPinned);
    if (heroPinned && !fpStarted) {
      // The plan draws itself once on arrival; scrolling then takes over.
      fpStarted = true;
      const t0 = performance.now();
      const step = t => { fpDraw = ease(clamp((t - t0) / 2000)); heroScroll(); if (fpDraw < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  }
  function heroScroll() {
    const H = innerHeight;
    let filmShown = true, fade = scrollY / H;
    if (heroPinned) {
      const p = scrollY / (2 * H);                     // 0..1 while the stage holds
      const z = ease(clamp((p - 0.04) / 0.56)), s = s0 * Math.pow(s1 / s0, z);
      const sx = ax0 + (vcx - ax0) * z, sy = ay0 + (vcy - ay0) * z;
      fpG.setAttribute('transform', `translate(${sx.toFixed(2)} ${sy.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-fx} ${-fy})`);
      const ppu = Math.max(fpSvg.clientWidth / vb.width, fpSvg.clientHeight / vb.height) || 1;
      const fo = clamp((p - 0.56) / 0.2), st = film.style;
      st.setProperty('--sw', (1.2 / (s * ppu)).toFixed(4));
      st.setProperty('--pd', fpDraw.toFixed(3));
      st.setProperty('--zl', clamp(z * 2.5).toFixed(3));
      st.setProperty('--zs', clamp((z - 0.55) / 0.3).toFixed(3));
      st.setProperty('--fo', fo.toFixed(3));
      // The clip starts only once it has fully replaced the drawing, so the hand-over shows frame one.
      filmShown = heroVideo.paused ? fo > 0.9 : fo > 0.05;
      // Before the hand-over the clip waits on its first frame, which matches the drawn aisle.
      if (fo < 0.02 && heroVideo.currentTime > 0.1 && !userPaused.has(heroVideo)) { heroVideo.pause(); heroVideo.currentTime = 0; }
      fade = (scrollY - 2.2 * H) / H;                  // the copy leaves as the page slides over
    }
    if (motion.matches) {
      const q = Math.max(0, fade);
      filmCopy.style.opacity = Math.max(0, 1 - q * 1.25).toFixed(3);
      filmCopy.style.transform = `translate3d(0,${(-q * 80).toFixed(1)}px,0)`;
    }
    // The film plays only while it can be seen: never under reduced motion or data saver,
    // and not once the page has covered it.
    const covered = scrollY >= (heroPinned ? 3 : 1) * H;
    const play = filmShown && !covered && motion.matches && !saveData && !userPaused.has(heroVideo);
    if (play && heroVideo.paused) heroVideo.play().catch(() => {});
    else if (!play && !heroVideo.paused && !userPaused.has(heroVideo)) heroVideo.pause();
  }

  /* ---------- 1b Chapter 01: the plan draws, rises into the facility, then plays as a drawn film ---------- */
  const opCard = $('#opCard'), opSvg = $('#opSvg'), opPlan = $('.op-plan', opSvg), opBtn = $('#opBtn');
  const opAnims = $$('.op-a', opSvg), isoT = opPlan.getAttribute('transform');
  const [u0, u1, tx0, ty0] = ['u0', 'u1', 'tx0', 'ty0'].map(k => +opSvg.dataset[k]);
  const vbW = opSvg.viewBox.baseVal.width;
  let intro = 0, introStarted = false, loopOn = false, loopStarted = false, opUserPaused = false, opSeen = false;
  opSvg.pauseAnimations();
  function syncOpBtn() {
    opBtn.setAttribute('aria-pressed', opUserPaused);
    opBtn.setAttribute('aria-label', (opUserPaused ? 'Play' : 'Pause') + ' animation');
  }
  function opLoop(on) {
    on = on && motion.matches && !opUserPaused;
    if (on === loopOn) return;
    loopOn = on;
    if (on) {
      opSvg.unpauseAnimations();
      if (!loopStarted) { loopStarted = true; opSvg.classList.add('running'); opAnims.forEach(a => a.beginElement()); }
    } else opSvg.pauseAnimations();
  }
  opBtn.addEventListener('click', () => { opUserPaused = !opUserPaused; syncOpBtn(); opScene(); });
  // Outside the pinned stage the drawing sits finished and plays only while on screen.
  new IntersectionObserver(([e]) => { opSeen = e.isIntersecting; opScene(); }, { threshold: 0.3 }).observe(opCard);
  let chQ = 0;
  function opScene() {
    const pinned = chWrap.classList.contains('pin');
    opCard.classList.toggle('pin', pinned);
    if (!pinned) {
      opPlan.setAttribute('transform', isoT);
      opLoop(opSeen);
      return;
    }
    const q = chQ, t = ease(clamp((q - 0.08) / 0.3));
    const u = u0 + (u1 - u0) * t, sy = 1 - (1 - 0.57735) * t;
    opPlan.setAttribute('transform', `translate(${(tx0 * (1 - t)).toFixed(2)} ${(ty0 * (1 - t)).toFixed(2)}) scale(1 ${sy.toFixed(4)}) rotate(${(45 * t).toFixed(2)}) scale(${u.toFixed(4)})`);
    const st = opCard.style, lv = clamp((q - 0.58) / 0.08);
    st.setProperty('--sw', (1.3 / (u * (opSvg.clientWidth / vbW || 1))).toFixed(3));
    st.setProperty('--pd', intro.toFixed(3));
    st.setProperty('--lb', (intro * (1 - clamp(t * 3))).toFixed(3));
    st.setProperty('--io', clamp((q - 0.24) / 0.05).toFixed(3));
    st.setProperty('--id', clamp((q - 0.26) / 0.25).toFixed(3));
    st.setProperty('--if', clamp((q - 0.42) / 0.14).toFixed(3));
    st.setProperty('--lv', lv.toFixed(3));
    opLoop(lv > 0.5 && chCur === 0 && opSeen);
  }
  function opIntro() {
    // The plan draws itself once as the section arrives; scrolling then takes over.
    if (introStarted) return;
    introStarted = true;
    const t0 = performance.now();
    const step = t => { intro = ease(clamp((t - t0) / 1800)); opScene(); if (intro < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- 2 Counters: count up once, screen readers get the final figure ---------- */
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    if (!motion.matches) return;
    const el = e.target, n = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / 1400), eased = 1 - Math.pow(1 - k, 4);
      el.textContent = pre + Math.round(n * eased) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = pre + '0' + suf;
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- 3 Chapters: the section holds still and steps through four reasons ---------- */
  const chWrap = $('#chapters'), chs = $$('.ch', chWrap), bars = $$('.ch-progress i', chWrap);
  let chCur = -1;
  const canPin = () => motion.matches && innerWidth >= 768 && innerHeight >= 680;
  // Chapter 01 holds for 2.5 steps of scroll (plan, building, film); the others for one each.
  const W0 = 2.5, UNITS = W0 + 3;
  function setPin() {
    chWrap.classList.toggle('pin', canPin());
    chCur = -1;
    if (!canPin()) {
      chs.forEach(c => c.classList.remove('on', 'past'));
      $$('.sk-card', chWrap).forEach(c => c.classList.add('drawn'));
    }
    opScene();
  }
  function chScroll() {
    if (!chWrap.classList.contains('pin')) return;
    const r = chWrap.getBoundingClientRect();
    if (r.top < innerHeight * 0.5) opIntro();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))) * UNITS;
    const i = p < W0 ? 0 : Math.min(3, Math.floor(p - W0) + 1);
    if (i !== chCur) {
      chCur = i;
      chs.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('past', k < i); });
      const card = $('.sk-card', chs[i]);
      if (card) card.classList.add('drawn');
    }
    chQ = Math.min(1, p / W0);
    opScene();
    bars.forEach((b, k) => b.style.setProperty('--p', (k ? clamp(p - W0 - k + 1) : clamp(p / W0)).toFixed(3)));
  }

  /* ---------- 4 Panels: opening one widens it, the others become strips ---------- */
  const panels = $('#panels');
  $$('.panel', panels).forEach(panel => {
    const btn = $('button', panel);
    btn.addEventListener('click', () => {
      const open = !panel.classList.contains('open');
      $$('.panel', panels).forEach(p => { p.classList.remove('open'); $('button', p).setAttribute('aria-expanded', 'false'); });
      if (open) {
        panel.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
      panels.classList.toggle('has-open', open);
    });
  });

  /* ---------- 4b Film: grows to full width, plays only while on screen ---------- */
  const slot = $('#slot'), slotVideo = $('#slotVideo');
  slotVideo.src = slotVideo.canPlayType('video/mp4; codecs="avc1.640028"') ? slotVideo.dataset.src : slotVideo.dataset.src.replace(/\.mp4$/, '.webm');
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && motion.matches && !saveData && !userPaused.has(slotVideo)) slotVideo.play().catch(() => {});
    else if (!e.isIntersecting && !slotVideo.paused) slotVideo.pause();
  }, { threshold: 0.25 }).observe(slotVideo);
  function slotScroll() {
    if (!motion.matches) { slot.style.setProperty('--g', 1); return; }
    const r = slot.getBoundingClientRect();
    const g = 1 - Math.min(1, Math.max(0, (r.top - innerHeight * 0.2) / (innerHeight * 0.6)));
    slot.style.setProperty('--g', g.toFixed(3));
  }

  /* ---------- 5 Site plan draws itself ---------- */
  const bp = $('#bp');
  $$('.plan .d', bp).forEach(p => p.style.setProperty('--len', Math.ceil(p.getTotalLength())));
  if (motion.matches) {
    bp.classList.add('armed');
    new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) { bp.classList.add('drawn'); o.disconnect(); }
    }, { rootMargin: '0px 0px -25% 0px' }).observe(bp);
  }

  /* ---------- One scroll loop for everything tied to position ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; heroScroll(); chScroll(); slotScroll(); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { setHeroPin(); setPin(); onScroll(); });
  motion.addEventListener('change', () => {
    setHeroPin(); setPin();
    opBtn.hidden = !motion.matches;
    if (!motion.matches) { filmCopy.style.opacity = ''; filmCopy.style.transform = ''; bp.classList.remove('armed'); }
    onScroll();
  });
  opBtn.hidden = !motion.matches; syncOpBtn();
  setHeroPin(); setPin(); onScroll();

  /* ---------- 6 Map: only states with a facility open the sheet ---------- */
  const STATES = {
    IL: ['Illinois', [['Aurora', 41600, 'aurora'], ['Homer Glen', 52120, 'homer-glen'], ['Frankfort', 71250, 'frankfort'], ['McHenry', 23150, 'mchenry'], ['Crest Hill', 20000, 'crest-hill', 1], ['Plainfield', 28100, 'plainfield', 1]]],
    WI: ['Wisconsin', [['Pewaukee', 34600, 'pewaukee']]],
    MI: ['Michigan', [['Ypsilanti', 45000, 'ypsilanti']]],
    NY: ['New York', [['North Syracuse', 59275, 'north-syracuse']]],
    CT: ['Connecticut', [['Simsbury', 66120, 'simsbury']]],
    SC: ['South Carolina', [['Greenville', 46720, 'greenville']]],
    TX: ['Texas', [['Austin', 67450, 'austin']]],
    AZ: ['Arizona', [['Phoenix', 71600, 'phoenix']]]
  };
  const sheet = $('#sheet'), facs = $('#facs');
  let opener = null;
  function openState(code, el) {
    const [name, list] = STATES[code];
    opener = el;
    $('#sheet-h').textContent = name;
    $('#sheet-k').textContent = list.length + (list.length > 1 ? ' facilities' : ' facility');
    facs.className = 'facs' + (list.length > 2 ? ' many' : '');
    facs.innerHTML = list.map(([city, sf, img, realized]) => `
      <li class="fac">
        <figure class="ask" data-ask="Photo · ask Myles"><img src="assets/img/facilities/${img}.webp" alt="Newcoast self-storage facility in ${city}, ${name}" decoding="async"></figure>
        <h3>${city}, ${code}</h3>
        <dl>
          <dt>Location</dt><dd>${city}, ${name}</dd>
          <dt>Size</dt><dd>${sf.toLocaleString('en-US')} SF</dd>
          <dt>Status</dt><dd>${realized ? 'Realized' : 'Owned'}</dd>
        </dl>
        <span class="ask-tag" data-ask="Overview · ask Myles"></span>
      </li>`).join('');
    sheet.showModal();
    if (window.ncLenis) window.ncLenis.stop();
  }
  $$('.usmap .st').forEach(g => {
    g.addEventListener('click', () => openState(g.dataset.st, g));
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openState(g.dataset.st, g); }
    });
  });
  $('#sheetX').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => {
    if (window.ncLenis) window.ncLenis.start();
    if (opener) opener.focus();
  });
})();

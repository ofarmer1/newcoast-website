/* Home page motion and interaction. Every effect checks reduced motion first,
   and the page reads completely without this script. */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  // Scroll-tied writes skip values that have not changed. Each write restyles the whole
  // drawing beneath it, so a chapter that is only being read now costs nothing per frame.
  const setVar = (st, k, v) => { if (st.getPropertyValue(k) !== v) st.setProperty(k, v); };
  const setAttr = (el, k, v) => { if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const setStyle = (el, k, v) => { if (el.style[k] !== v) el.style[k] = v; };
  // Scroll maths use the small viewport height (100svh), which the pinned sections are built
  // from. innerHeight changes while a phone's address bar slides away, which made the hero
  // jump mid-scroll and could switch the pinning off and on.
  const svhProbe = document.createElement('div');
  svhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  svhProbe.setAttribute('aria-hidden', 'true');
  document.body.append(svhProbe);
  let VH = svhProbe.offsetHeight || innerHeight;
  // Drawing sizes come from observers, so the scroll loop never forces a layout to read them.
  const sizes = new Map();
  const sizeRO = new ResizeObserver(es => { es.forEach(e => sizes.set(e.target, e.contentRect)); onScroll(); });
  const sizeOf = el => sizes.get(el) || { width: 0, height: 0 };

  /* ---------- Video buttons (WCAG 2.2.2: anything that moves can be paused) ---------- */
  // A video the user paused stays paused; one they started stays playing, even under reduced
  // motion or data saver, until it scrolls out of sight.
  const userPaused = new Set(), userPlayed = new Set();
  function syncBtn(btn, video) {
    const paused = video.paused;
    btn.setAttribute('aria-pressed', paused);
    btn.setAttribute('aria-label', (paused ? 'Play ' : 'Pause ') + (video.id === 'heroVideo' ? 'background video' : 'facility video'));
  }
  $$('.vid-btn[data-video]').forEach(btn => {
    const video = document.getElementById(btn.dataset.video);
    btn.hidden = false;
    btn.addEventListener('click', () => {
      if (video.paused) { userPaused.delete(video); userPlayed.add(video); video.play().catch(() => {}); }
      else { userPaused.add(video); userPlayed.delete(video); video.pause(); }
    });
    video.addEventListener('play', () => syncBtn(btn, video));
    video.addEventListener('pause', () => syncBtn(btn, video));
    syncBtn(btn, video);
  });

  /* ---------- 1 Hero: blueprint, push down the drive aisle, then the film ---------- */
  const film = $('#film'), heroVideo = $('#heroVideo'), heroBtn = $('[data-video="heroVideo"]'), filmCopy = $('#filmCopy'), fpSvg = $('.fp-svg', film), fpG = $('.fp-g', film);
  // MP4 (H.264) everywhere it plays; WebM for the few browsers without it.
  const heroSrc = matchMedia('(max-width: 760px)').matches ? heroVideo.dataset.srcSm : heroVideo.dataset.src;
  heroVideo.src = heroVideo.canPlayType('video/mp4; codecs="avc1.640028"') ? heroSrc : heroSrc.replace(/\.mp4(?=\?|$)/, '.webm');
  // Fetch the clip while the drawing is on screen, so it is ready on its first frame at the
  // hand-over instead of only starting to download then (it showed late or froze on slow links).
  if (motion.matches && !saveData) { heroVideo.preload = 'auto'; heroVideo.load(); }
  let heroWarm = false;
  const clamp = v => Math.min(1, Math.max(0, v));
  const ease = v => v * v * (3 - 2 * v);
  // The camera starts on the whole site (s0) and ends over the drive aisle (s1, focus fx/fy),
  // framed like the clip's first frame.
  const vb = fpSvg.viewBox.baseVal, vcx = vb.x + vb.width / 2, vcy = vb.y + vb.height / 2;
  const [s1, fx, fy] = ['s1', 'fx', 'fy'].map(k => +fpSvg.dataset[k]);
  // Desktop opens on the whole parcel with room around it; phones, with less height, on the buildings.
  const boxL = fpSvg.dataset.box.split(' ').map(Number), boxS = (fpSvg.dataset.boxSm || fpSvg.dataset.box).split(' ').map(Number);
  let box = boxL;
  // In the last stretch the plan turns (th, degrees) and tips away (tilt) the way the drone's
  // camera sees the aisle, so the drawing lies over the clip's first frame.
  const th = +fpSvg.dataset.th || 0, tilt = +fpSvg.dataset.tilt || 0;
  // The clip's aisle is narrower than the drawn one, so the last stretch also narrows the plan
  // across the aisle (kx, about its west edge px) and the drawn car lands on the filmed car.
  const kx = +fpSvg.dataset.kx || 1, px = +fpSvg.dataset.px || 0;
  // The opening view fits the whole site (box) into the clear space beside the copy, or above it
  // on phones, so no line runs under the text. ax0/ay0: where the aisle sits on screen then; it
  // glides to the centre as the camera closes in.
  let s0 = 1, ax0 = vcx, ay0 = vcy, planB = 0;
  function fitPlan() {
    box = innerWidth > 760 ? boxL : boxS;
    const W = innerWidth, H = VH, ppu = Math.max(W / vb.width, H / vb.height);
    const toVb = (x, y) => [vb.x + (x - (W - vb.width * ppu) / 2) / ppu, vb.y + (y - (H - vb.height * ppu) / 2) / ppu];
    const copy = $$('.film-copy > *').map(e => e.getBoundingClientRect());
    const navB = $('.nav').getBoundingClientRect().bottom, g = W > 760 ? 40 : 16;
    const [l, t, r, b] = W > 760
      ? [Math.max(...copy.map(c => c.right)) + g, navB + 72, W - 64, H - 132]   // room above and below, so the plan doesn't fill the screen top to bottom
      : [g, navB + 16, W - g, Math.min(...copy.map(c => c.top)) - 24];
    planB = W > 760 ? 0 : b;                          // phones: the plan fades out above the copy
    const [x0, y0] = toVb(l, t), [x1, y1] = toVb(r, b);
    s0 = Math.min((x1 - x0) / (box[2] - box[0]), (y1 - y0) / (box[3] - box[1]));
    // Centre the box across the space and keep it under the nav.
    const bx = (box[0] + box[2]) / 2, rx = (x0 + x1) / 2, ry = y0 + s0 * (box[3] - box[1]) / 2;
    ax0 = rx + s0 * (fx - bx); ay0 = ry + s0 * (fy - (box[1] + box[3]) / 2);
    // The tilt pivots on the aisle's west wall wherever it lands on this screen, so phones tip like desktops.
    setStyle(fpSvg, 'transformOrigin', `${(W / 2 + (px - fx) * s1 * ppu).toFixed(1)}px 50%`);
  }
  let heroPinned = false, fpDraw = 0, fpStarted = false;
  function setHeroPin() {
    heroPinned = motion.matches && VH >= 600;
    film.classList.toggle('pin', heroPinned);
    fitPlan();
    if (heroPinned && !fpStarted) {
      // The plan draws itself once on arrival; scrolling then takes over.
      fpStarted = true;
      const t0 = performance.now();
      const step = t => { fpDraw = ease(clamp((t - t0) / 2000)); heroScroll(); if (fpDraw < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  }
  function heroScroll() {
    const H = VH;
    let filmShown = true, fade = scrollY / H;
    if (heroPinned) {
      const p = scrollY / (2 * H);                     // 0..1 while the stage holds
      const z = ease(clamp((p - 0.04) / 0.56)), s = s0 * Math.pow(s1 / s0, z);
      const sx = ax0 + (vcx - ax0) * z, sy = ay0 + (vcy - ay0) * z;
      const w = ease(clamp((z - 0.55) / 0.45));
      setAttr(fpG, 'transform', `translate(${sx.toFixed(2)} ${sy.toFixed(2)}) rotate(${(th * w).toFixed(2)}) scale(${s.toFixed(4)}) translate(${-fx} ${-fy}) translate(${px} 0) scale(${(1 + (kx - 1) * w).toFixed(4)} 1) translate(${-px} 0)`);
      setStyle(fpSvg, 'transform', w ? `perspective(1200px) rotateX(${+(tilt * w).toFixed(2)}deg)` : '');
      const fpBox = sizeOf(fpSvg), ppu = Math.max(fpBox.width / vb.width, fpBox.height / vb.height) || 1;
      const fo = clamp((p - 0.56) / 0.2), st = film.style;
      setVar(st, '--sw', (1.2 / (s * ppu)).toFixed(4));
      setVar(st, '--pd', fpDraw.toFixed(3));
      setVar(st, '--zl', clamp(z * 2.5).toFixed(3));
      setVar(st, '--zs', clamp((z - 0.55) / 0.3).toFixed(3));
      setVar(st, '--fo', fo.toFixed(3));
      if (planB) setVar(st, '--mb', `${(planB + (H - planB + 80) * clamp(z * 3)).toFixed(0)}px`);
      // The clip starts only once it has fully replaced the drawing, so the hand-over shows frame one.
      filmShown = heroVideo.paused ? fo > 0.9 : fo > 0.05;
      // While the drawing fills the screen there is no video to play or pause, so its button waits
      // until the clip shows (it stays put if it has focus, so keyboard users are never dropped).
      const noFilm = fo < 0.05 && document.activeElement !== heroBtn;
      if (heroBtn.hidden !== noFilm) heroBtn.hidden = noFilm;
      // Before the hand-over the clip waits on its first frame, which matches the drawn aisle.
      if (fo < 0.02 && heroVideo.currentTime > 0.1 && !userPaused.has(heroVideo)) { heroVideo.pause(); heroVideo.currentTime = 0; }
      // iPhones ignore preload, so the first scroll starts the clip and stops it straight away,
      // which makes it buffer.
      if (!heroWarm && z > 0 && heroVideo.readyState < 3 && !saveData) {
        heroWarm = true;
        heroVideo.play().then(() => { if (fo < 0.02) { heroVideo.pause(); heroVideo.currentTime = 0; } }).catch(() => {});
      }
      fade = (scrollY - 2.2 * H) / H;                  // the copy leaves as the page slides over
    }
    if (motion.matches) {
      const q = Math.max(0, fade);
      setStyle(filmCopy, 'opacity', String(+Math.max(0, 1 - q * 1.25).toFixed(3)));
      setStyle(filmCopy, 'transform', `translate3d(0px, ${+(-q * 80).toFixed(1)}px, 0px)`);
    }
    // The film plays only while it can be seen: never under reduced motion or data saver,
    // and not once the page has covered it.
    const covered = scrollY >= (heroPinned ? 3 : 1) * H;
    const play = filmShown && !covered && ((motion.matches && !saveData) || userPlayed.has(heroVideo)) && !userPaused.has(heroVideo);
    if (play && heroVideo.paused) heroVideo.play().catch(() => {});
    else if (!play && !heroVideo.paused && !userPaused.has(heroVideo)) heroVideo.pause();
  }

  /* ---------- 1b Chapter 01: the plan draws, rises into the facility, then plays as a drawn film ---------- */
  const opCard = $('#opCard'), opSvg = $('#opSvg'), opPlan = $('.op-plan', opSvg), opBtn = $('#opBtn');
  const opAnims = $$('.op-a', opSvg), isoT = opPlan.getAttribute('transform');
  const [u0, u1, tx0, ty0] = ['u0', 'u1', 'tx0', 'ty0'].map(k => +opSvg.dataset[k]);
  const vbW = opSvg.viewBox.baseVal.width, opVb = opSvg.viewBox.baseVal, opZoom = $('.op-zoom', opSvg);
  const zcx = opVb.x + opVb.width / 2, zcy = opVb.y + opVb.height / 2, zfx = +opSvg.dataset.zx, zfy = +opSvg.dataset.zy;
  // The closing shot moves in on the north drive and first aisle, where the car runs.
  function opZoomTo(w) {
    const Z = 1 + 0.9 * w, fx = zcx + (zfx - zcx) * w, fy = zcy + (zfy - zcy) * w;
    setAttr(opZoom, 'transform', `translate(${zcx.toFixed(1)} ${zcy.toFixed(1)}) scale(${Z.toFixed(4)}) translate(${(-fx).toFixed(1)} ${(-fy).toFixed(1)})`);
  }
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
  let chQ = 0, chP = 0;
  // Scroll position (0-4) to film time. Each change plays across the chapter boundary, starting
  // a little before the words switch and settling just after, so the drawing answers every bit of
  // scroll near a switch and holds still while a chapter is being read.
  function filmTime(p) {
    const k = Math.min(3, Math.max(1, Math.round(p))), span = [0, 0.45, 0.8, 0.45][k];
    const a = k - 0.32, b = k + 0.28;
    if (p <= a) return k === 1 ? 0 : k - 1 + [0, 0.45, 0.8][k - 1];
    if (p < b) return k + span * (p - a) / (b - a);
    return k + span + (k === 3 ? (4 - k - span) * clamp((p - b) / (4 - b)) : 0);
  }
  // One film across the four chapters (q runs 0 to 4): the construction plan with its notes,
  // the notes clear for the unit plan, the plan tilts and the buildings rise, then a car arrives.
  // Each stage's value goes on its own layer rather than the card, so a change restyles only
  // that layer and not all 2,400 lines of the drawing.
  const opLayers = { '--nt': '.op-notes', '--um': '.op-units', '--io': '.op-iso', '--id': '.op-iso', '--if': '.op-iso', '--lv': '.op-live' };
  Object.keys(opLayers).forEach(k => { opLayers[k] = $$(opLayers[k], opSvg); });
  const setOp = (k, v) => opLayers[k].forEach(el => setVar(el.style, k, v));
  const opSheet = $('#opSheet'), SHEETS = ['Sheet 01 · Construction plan', 'Sheet 02 · Unit plan', 'Sheet 03 · Facility', 'Sheet 04 · In operation'];
  function opScene() {
    const pinned = chWrap.classList.contains('pin');
    opCard.classList.toggle('pin', pinned);
    if (!pinned) {
      setAttr(opPlan, 'transform', isoT);
      if (opSheet.textContent !== SHEETS[3]) opSheet.textContent = SHEETS[3];
      opZoomTo(0.6);
      opLoop(opSeen);
      return;
    }
    const q = chQ, t = ease(clamp((q - 2) / 0.45));
    const u = u0 + (u1 - u0) * t, sy = 1 - (1 - 0.57735) * t;
    setAttr(opPlan, 'transform', `translate(${(tx0 * (1 - t)).toFixed(2)} ${(ty0 * (1 - t)).toFixed(2)}) scale(1 ${sy.toFixed(4)}) rotate(${(45 * t).toFixed(2)}) scale(${u.toFixed(4)})`);
    opZoomTo(ease(clamp((q - 3) / 0.45)));
    const st = opCard.style, lv = clamp((q - 3) / 0.12);
    setVar(st, '--sw', (1.3 / (u * (sizeOf(opSvg).width / vbW || 1))).toFixed(3));
    setVar(st, '--pd', intro.toFixed(3));
    setOp('--nt', (intro * (1 - clamp((q - 1) / 0.3))).toFixed(3));
    setOp('--um', (clamp((q - 1.05) / 0.3) * (1 - clamp((q - 2.1) / 0.25))).toFixed(3));
    setOp('--io', clamp((q - 2.2) / 0.08).toFixed(3));
    setOp('--id', clamp((q - 2.25) / 0.45).toFixed(3));
    setOp('--if', clamp((q - 2.5) / 0.3).toFixed(3));
    setOp('--lv', lv.toFixed(3));
    const label = SHEETS[pinned ? Math.min(3, Math.floor(chP)) : 3];
    if (opSheet.textContent !== label) opSheet.textContent = label;
    opLoop(lv > 0.5 && opSeen);
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
  const canPin = () => motion.matches && innerWidth >= 768 && VH >= 680;
  // Each chapter holds for one step of scroll while the film advances underneath.
  const UNITS = 4;
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
    if (r.top < VH * 0.5) opIntro();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - VH))) * UNITS;
    const i = Math.min(3, Math.floor(p));
    if (i !== chCur) {
      chCur = i;
      chs.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('past', k < i); });
    }
    chP = p;
    chQ = filmTime(p);
    opScene();
    bars.forEach((b, k) => setVar(b.style, '--p', clamp(p - k).toFixed(3)));
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
  const slotSrc = matchMedia('(max-width: 760px)').matches ? slotVideo.dataset.srcSm : slotVideo.dataset.src;
  slotVideo.src = slotVideo.canPlayType('video/mp4; codecs="avc1.640028"') ? slotSrc : slotSrc.replace(/\.mp4(?=\?|$)/, '.webm');
  // Start downloading a screen before it scrolls into view, so it is playing when it arrives.
  new IntersectionObserver(([e], o) => {
    if (e.isIntersecting && !saveData) { slotVideo.preload = 'auto'; slotVideo.load(); o.disconnect(); }
  }, { rootMargin: '100% 0px' }).observe(slotVideo);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && ((motion.matches && !saveData) || userPlayed.has(slotVideo)) && !userPaused.has(slotVideo)) slotVideo.play().catch(() => {});
    else if (!e.isIntersecting && !slotVideo.paused) slotVideo.pause();
  }, { threshold: 0.25 }).observe(slotVideo);
  function slotScroll() {
    if (!motion.matches) { setVar(slot.style, '--g', '1'); return; }
    const r = slot.getBoundingClientRect();
    const g = 1 - Math.min(1, Math.max(0, (r.top - VH * 0.2) / (VH * 0.6)));
    setVar(slot.style, '--g', g.toFixed(3));
  }

  /* ---------- 5 Investment focus: the four points turn over the drawing ---------- */
  const bp = $('#bp');
  if (motion.matches) {
    bp.classList.add('armed');
    new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) { bp.classList.add('drawn'); o.disconnect(); }
    }, { rootMargin: '0px 0px -25% 0px' }).observe(bp);
  }
  const fxItems = $$('#fxList li'), fxPause = $('#fxPause');
  let fxOn = 0, fxTimer = 0, fxHeld = false, fxStopped = false;
  function fxPlace(li, o, still) {
    const a = Math.abs(o);
    if (still) li.style.transition = 'none';
    li.style.setProperty('--y', (o * 2.1) + 'em');
    li.style.setProperty('--sc', a ? 0.82 : 1);
    li.style.setProperty('--op', a === 0 ? 1 : a === 1 ? 0.64 : 0);
    li.toggleAttribute('data-on', !o);
    if (still) { li.offsetWidth; li.style.transition = ''; }
  }
  // Each point lights its own building, and the pointer moves over to it. The buildings are
  // numbered left to right on screen (data-i), so the highlight steps across from left to right.
  const fxTickEl = $('#fxTick'), fxBlds = $$('.fx-bld', bp), fxAnchors = JSON.parse(fxTickEl.dataset.anchors);
  // Per Oliver (2026-10-23): the highlight steps left to right, one building every two seconds, and the
  // card glides over with it (a transform, so nothing reflows), then loops back to the first.
  let fxAt = 0;
  function fxPick(i = fxAt) {
    fxAt = i;
    fxBlds.forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    fxFit();
  }
  // The anchor is turned into px for the transform. On tablets the card would run past the
  // drawing's right edge (and make the page scroll sideways), so it slides left by the overhang
  // while the pin stays on the building.
  function fxFit() {
    const cb = fxTickEl.offsetParent, s = fxTickEl.style;
    if (!cb || getComputedStyle(fxTickEl).position !== 'absolute') { s.setProperty('--shift', '0px'); return; }
    const box = cb.getBoundingClientRect(), stage = $('.fx-stage', bp).getBoundingClientRect();
    const x = box.width * fxAnchors[fxAt][0] / 100, y = box.height * fxAnchors[fxAt][1] / 100;
    const over = x - 14 + $('.fx-list', bp).offsetWidth - (stage.right - 8 - box.left);
    s.setProperty('--tx', `${x.toFixed(1)}px`);
    s.setProperty('--ty', `${y.toFixed(1)}px`);
    s.setProperty('--shift', `${Math.max(0, Math.ceil(over))}px`);
  }
  new ResizeObserver(() => fxFit()).observe($('.fx-stage', bp));
  function fxShow(first) {
    fxPick(fxOn);
    fxItems.forEach((li, k) => {
      const o = ((k - fxOn + fxItems.length + 1) % fxItems.length) - 1;
      // The point leaving the top fades on upward, then waits out of sight at the bottom.
      if (!first && o === fxItems.length - 2) {
        fxPlace(li, -2);
        setTimeout(() => fxPlace(li, o, true), 850);
      } else fxPlace(li, o, first);
    });
  }
  function fxRun() {
    clearInterval(fxTimer);
    if (fxStopped || fxHeld || !bp.classList.contains('rot') || !bp.classList.contains('seen')) return;
    fxTimer = setInterval(() => { fxOn = (fxOn + 1) % fxItems.length; fxShow(); }, 2000);
  }
  function fxSetup() {
    const rot = motion.matches;
    bp.classList.toggle('rot', rot);
    fxPause.hidden = !rot;
    fxTickEl.style.transition = 'none';
    if (rot) fxShow(true); else { fxItems.forEach(li => { li.removeAttribute('style'); li.removeAttribute('data-on'); }); fxPick(0); }
    fxTickEl.offsetWidth; fxTickEl.style.transition = '';
    fxRun();
  }
  // The street traffic runs only while the drawing is on screen, and the pause button stops it too.
  // The points turn over only while on screen too.
  new IntersectionObserver(([e]) => { bp.classList.toggle('seen', e.isIntersecting); fxRun(); }).observe($('.fx-art', bp));
  fxPause.addEventListener('click', () => {
    fxStopped = !fxStopped;
    bp.classList.toggle('still', fxStopped);
    fxPause.setAttribute('aria-pressed', fxStopped);
    fxRun();
  });
  const fxTick = $('.fx-tick', bp);
  ['pointerenter', 'focusin'].forEach(ev => fxTick.addEventListener(ev, () => { fxHeld = true; fxRun(); }));
  ['pointerleave', 'focusout'].forEach(ev => fxTick.addEventListener(ev, () => { fxHeld = false; fxRun(); }));
  motion.addEventListener('change', fxSetup);
  fxSetup();

  /* ---------- One scroll loop for everything tied to position ---------- */
  let ticking = false;
  const update = () => { heroScroll(); chScroll(); slotScroll(); };
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }
  // With smooth scrolling on, Lenis reports each position in the same frame it scrolls, so the
  // pinned scenes move with the page rather than a frame behind it. Without it, native scroll.
  if (window.ncLenis) window.ncLenis.on('scroll', update);
  else addEventListener('scroll', onScroll, { passive: true });
  let lastW = innerWidth, lastVH = VH;
  addEventListener('resize', () => {
    VH = svhProbe.offsetHeight || innerHeight;
    // A phone's address bar showing or hiding changes neither, so nothing is refitted mid-scroll.
    if (innerWidth === lastW && VH === lastVH) return;
    lastW = innerWidth; lastVH = VH;
    setHeroPin(); setPin(); onScroll();
  });
  sizeRO.observe(fpSvg); sizeRO.observe(opSvg);
  motion.addEventListener('change', () => {
    setHeroPin(); setPin();
    opBtn.hidden = !motion.matches;
    if (!motion.matches) { filmCopy.style.opacity = ''; filmCopy.style.transform = ''; bp.classList.remove('armed'); }
    onScroll();
  });
  opBtn.hidden = !motion.matches; syncOpBtn();
  setHeroPin(); setPin(); onScroll();
  // The copy's width settles once the fonts load; refit the plan to it.
  document.fonts?.ready.then(() => { fitPlan(); onScroll(); });

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
        <figure class="ask" data-ask="Photo · ask Myles"><img src="../assets/img/facilities/${img}.webp" alt="Newcoast self-storage facility in ${city}, ${name}" decoding="async"></figure>
        <h3>${city}, ${code}</h3>
        <dl>
          <dt>Location</dt><dd>${city}, ${name}</dd>
          <dt>Size</dt><dd>${sf.toLocaleString('en-US')} SF</dd>
          <dt>Status</dt><dd>${realized ? 'Realized' : 'Active'}</dd>
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
  // Map or list: one button swaps them inside the same box, so the copy beside it and the
  // section below never move. Without the script the list simply sits under the map.
  const mapWrap = $('#mapWrap'), mapToggle = $('#mapToggle');
  mapToggle.hidden = false;
  mapToggle.addEventListener('click', () => {
    const list = mapWrap.classList.toggle('as-list');
    mapToggle.textContent = list ? 'View the map' : 'View as a list';
  });
  $('#sheetX').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => {
    if (window.ncLenis) window.ncLenis.start();
    if (opener) opener.focus();
  });
})();

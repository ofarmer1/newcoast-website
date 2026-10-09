/* Newcoast site script, shared by every page. Each block checks that its
   section is on the page first. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  function drawCoverFrame(context, canvasEl, image, alpha = 1) {
    const scale = Math.max(canvasEl.width / image.naturalWidth, canvasEl.height / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    context.globalAlpha = alpha;
    context.drawImage(image, (canvasEl.width - width) / 2, (canvasEl.height - height) / 2, width, height);
  }
  function drawBlendedFrame(context, canvasEl, frameSet, position) {
    let lower = Math.floor(position), upper = Math.ceil(position);
    while (lower >= 0 && !frameSet[lower]) lower--;
    while (upper < frameSet.length && !frameSet[upper]) upper++;
    if (lower < 0 && upper >= frameSet.length) return '';
    if (lower < 0) lower = upper;
    if (upper >= frameSet.length) upper = lower;
    const mix = lower === upper ? 0 : Math.min(Math.max((position - lower) / (upper - lower), 0), 1);
    context.globalAlpha = 1;
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    drawCoverFrame(context, canvasEl, frameSet[lower]);
    if (upper !== lower && mix > 0) drawCoverFrame(context, canvasEl, frameSet[upper], mix);
    context.globalAlpha = 1;
    return `${lower}:${upper}:${Math.round(mix * 1000)}`;
  }

  /* ---------- Nav colour follows the section beneath it ---------- */
  const nav = document.getElementById('nav');
  const themed = document.querySelectorAll('[data-theme]');
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) document.documentElement.dataset.nav = e.target.dataset.theme;
  }), { rootMargin: '0px 0px -96% 0px' });
  themed.forEach(s => navIO.observe(s));

  const menuBtn = document.getElementById('menuBtn'), links = document.getElementById('navLinks');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    setMenu(false);
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }));
  const mobileMenu = matchMedia('(max-width: 900px)');
  mobileMenu.addEventListener('change', () => setMenu(false));
  nav.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!nav.contains(document.activeElement)) setMenu(false); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && links.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

  const hero = document.querySelector('.hero');
  if (hero) {
    /* ---------- Hero: scroll-scrubbed build sequence ----------
       Scrolling moves the film from blueprint to opening night; nothing plays on
       its own. Reduced motion, Data Saver and short screens keep the finished
       frame as a still, and nothing extra is downloaded. */
    const bCanvas = document.getElementById('buildCanvas'), bCtx = bCanvas.getContext('2d');
    const bSteps = [...document.querySelectorAll('#buildSteps li')];
    const BN = 48, bFrames = new Array(BN), STEP_AT = [0, .25, .5, .75];
    const bUrl = i => `assets/build/f${String(i).padStart(2, '0')}.webp`;
    let bCur = 0, bTarget = 0, bRaf = 0, bDrawn = '', bLoaded = false, bLastTick = 0;
    const canBuild = () => !motionPreference.matches && !saveData && innerHeight >= 500;

    function loadBuild() {
      if (bLoaded) return; bLoaded = true;
      const order = [0, BN - 1];
      for (let step = 8; step >= 1; step /= 2) for (let i = 0; i < BN; i += step) if (!order.includes(i)) order.push(i);
      order.forEach(i => {
        const img = new Image();
        img.decoding = 'async';
        img.src = bUrl(i);
        // Decoded before the first draw, so scrubbing never stalls on a decode.
        img.decode().then(() => { bFrames[i] = img; drawBuild(true); }, () => {});
      });
    }
    function drawBuild(force) {
      if (!bCanvas.width) return;
      // While scrolling fast, draw the nearest frame alone; blend two frames only as it settles.
      const pos = Math.abs(bTarget - bCur) > 1.5 ? Math.round(bCur) : bCur;
      const signature = drawBlendedFrame(bCtx, bCanvas, bFrames, pos);
      if (!signature || (signature === bDrawn && !force)) return;
      bDrawn = signature;
    }
    function buildTick(now) {
      bRaf = 0;
      const elapsed = bLastTick ? Math.min(now - bLastTick, 64) : 16.7;
      bLastTick = now;
      bCur += (bTarget - bCur) * (1 - Math.exp(-elapsed / 82));
      if (Math.abs(bTarget - bCur) < 0.05) bCur = bTarget;
      drawBuild();
      if (bCur !== bTarget) bRaf = requestAnimationFrame(buildTick);
      else bLastTick = 0;
    }
    function onBuildScroll() {
      if (!hero.classList.contains('scrub')) return;
      const r = hero.getBoundingClientRect();
      const p = Math.min(Math.max(-r.top / (r.height - innerHeight), 0), 1);
      bTarget = p * (BN - 1);
      let step = 0; STEP_AT.forEach((at, i) => { if (p >= at) step = i; });
      bSteps.forEach((li, i) => li.classList.toggle('on', i === step));
      // Already inside a frame callback when scrolling, so draw now rather than a frame later.
      if (!bRaf) buildTick(performance.now());
    }
    function setBuildMode() {
      const on = canBuild();
      hero.classList.toggle('scrub', on);
      hero.classList.toggle('static', !on);
      if (!on) return;
      loadBuild();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      bCanvas.width = Math.round(bCanvas.clientWidth * dpr);
      bCanvas.height = Math.round(bCanvas.clientHeight * dpr);
      bDrawn = ''; onBuildScroll(); drawBuild(true);
    }
    let buildResizeT;
    addEventListener('resize', () => { clearTimeout(buildResizeT); buildResizeT = setTimeout(setBuildMode, 150); });
    motionPreference.addEventListener('change', setBuildMode);
    setBuildMode();

    // Hero scrub: the canvas needs scroll position, so it listens only while the hero is on
    // screen, batched to one read per frame (what GSAP ScrollTrigger does, without the library).
    let scrollRaf = 0;
    const onHeroScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; onBuildScroll(); });
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { addEventListener('scroll', onHeroScroll, { passive: true }); onBuildScroll(); }
      else removeEventListener('scroll', onHeroScroll);
    }).observe(hero);
  }

  /* ---------- Reveals ---------- */
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    // Reveal on entry, and also anything already above the viewport
    // (e.g. after a nav jump) so skipped sections never stay hidden.
    if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
    const el = e.target, sib = [...el.parentElement.children].filter(c => c.classList.contains('rv'));
    el.style.transitionDelay = (reduce ? 0 : Math.min(sib.indexOf(el), 5) * 70) + 'ms';
    el.classList.add('in');
    revealIO.unobserve(el);
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(el => revealIO.observe(el));
  let unrevealed = [...document.querySelectorAll('.rv')];
  function sweepReveals() {
    // Anything skipped over by a jump link is shown too, so no section stays hidden.
    unrevealed = unrevealed.filter(el => {
      if (el.classList.contains('in')) return false;
      if (el.getBoundingClientRect().bottom < 0) { el.classList.add('in'); revealIO.unobserve(el); return false; }
      return true;
    });
  }

  /* ---------- Scroll state, from observers ---------- */
  // Nav: solid once the top 40px have scrolled away (an observer, not a scroll listener).
  const navSentinel = document.createElement('div');
  navSentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:40px;pointer-events:none';
  navSentinel.setAttribute('aria-hidden', 'true');
  document.body.prepend(navSentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting)).observe(navSentinel);
  // Reveals skipped by a fast jump are caught once the scroll settles, not on every frame.
  addEventListener('scrollend', () => { if (unrevealed.length) sweepReveals(); });

  /* ---------- About headline: words brighten in order as it scrolls in ----------
     CSS scroll timeline only; the text itself is unchanged for assistive tech. */
  const plH = document.getElementById('pl-h');
  if (plH && typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()') && !motionPreference.matches) {
    plH.innerHTML = plH.textContent.trim().split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
    plH.classList.remove('rv'); plH.classList.add('words');
    unrevealed = unrevealed.filter(el => el !== plH); revealIO.unobserve(plH);
  }

  /* ---------- Portfolio filters ---------- */
  const facilities = [...document.querySelectorAll('#facilities li')];
  document.querySelectorAll('.filters button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach(x => x.setAttribute('aria-pressed', x === btn));
    const f = btn.dataset.f;
    let shown = 0;
    facilities.forEach(li => { const show = f === 'all' || li.dataset.s === f; li.hidden = !show; if (show) shown++; });
    document.getElementById('facilities').classList.toggle('filtered', f !== 'all');
    document.getElementById('portfolioStatus').textContent = `Showing ${shown} ${f === 'all' ? '' : f + ' '}facilities.`;
  }));

})();

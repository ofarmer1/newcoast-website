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
  $$('.vid-btn').forEach(btn => {
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

  /* ---------- 1 Hero film ---------- */
  const heroVideo = $('#heroVideo'), filmCopy = $('#filmCopy');
  // MP4 (H.264) everywhere it plays; WebM for the few browsers without it.
  const heroSrc = matchMedia('(max-width: 760px)').matches ? heroVideo.dataset.srcSm : heroVideo.dataset.src;
  heroVideo.src = heroVideo.canPlayType('video/mp4; codecs="avc1.640028"') ? heroSrc : heroSrc.replace(/\.mp4$/, '.webm');
  if (motion.matches && !saveData) heroVideo.play().catch(() => {});

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
  const canPin = () => motion.matches && innerWidth >= 768 && innerHeight >= 560;
  function setPin() {
    chWrap.classList.toggle('pin', canPin());
    chCur = -1;
    if (!canPin()) {
      chs.forEach(c => c.classList.remove('on', 'past'));
      $$('.sk-card', chWrap).forEach(c => c.classList.add('drawn'));
    }
  }
  function chScroll() {
    if (!chWrap.classList.contains('pin')) return;
    const r = chWrap.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))) * 4;
    const i = Math.min(3, Math.floor(p));
    if (i !== chCur) {
      chCur = i;
      chs.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('past', k < i); });
      const card = $('.sk-card', chs[i]);
      if (card) card.classList.add('drawn');
    }
    bars.forEach((b, k) => b.style.setProperty('--p', Math.min(1, Math.max(0, p - k)).toFixed(3)));
  }

  /* ---------- 4 Panels: opening one widens it, the others become strips ---------- */
  const panels = $('#panels'), buildVideo = $('#buildVideo');
  $$('.panel', panels).forEach(panel => {
    const btn = $('button', panel);
    btn.addEventListener('click', () => {
      const open = !panel.classList.contains('open');
      $$('.panel', panels).forEach(p => { p.classList.remove('open'); $('button', p).setAttribute('aria-expanded', 'false'); });
      buildVideo.pause();
      if (open) {
        panel.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        if (panel.contains(buildVideo) && motion.matches && !saveData && !userPaused.has(buildVideo)) buildVideo.play().catch(() => {});
      }
      panels.classList.toggle('has-open', open);
    });
  });

  /* ---------- 4b Film slot grows to full width ---------- */
  const slot = $('#slot');
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
  function heroScroll() {
    const p = Math.min(1.5, scrollY / innerHeight);
    if (motion.matches) {
      filmCopy.style.opacity = Math.max(0, 1 - p * 1.25).toFixed(3);
      filmCopy.style.transform = `translate3d(0,${(-p * 80).toFixed(1)}px,0)`;
    }
    // Once the page has covered the film, stop playing it; start again on the way back.
    if (p >= 1 && !heroVideo.paused) { heroVideo.pause(); heroVideo.dataset.auto = '1'; }
    else if (p < 1 && heroVideo.paused && heroVideo.dataset.auto && !userPaused.has(heroVideo)) { delete heroVideo.dataset.auto; heroVideo.play().catch(() => {}); }
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; heroScroll(); chScroll(); slotScroll(); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { setPin(); onScroll(); });
  motion.addEventListener('change', () => {
    setPin();
    if (!motion.matches) { filmCopy.style.opacity = ''; filmCopy.style.transform = ''; bp.classList.remove('armed'); }
    onScroll();
  });
  setPin(); onScroll();

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

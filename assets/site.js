/* Newcoast site script, shared by every page. Each block checks that its
   section is on the page first. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Smooth inertia scrolling on every page (Lenis, self-hosted) ----------
     Off for reduced motion; the page then scrolls natively. */
  if (!reduce && window.Lenis) {
    window.ncLenis = new Lenis({ autoRaf: true, lerp: 0.09, anchors: true });
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

  /* ---------- Reveals ---------- */
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    // Reveal on entry, and also anything already above the viewport
    // (e.g. after a nav jump) so skipped sections never stay hidden.
    if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
    const el = e.target, sib = [...el.parentElement.children].filter(c => c.classList.contains('rv'));
    el.style.transitionDelay = (reduce ? 0 : Math.min(sib.indexOf(el), 5) * 70) + 'ms';
    el.classList.add('in');
    revealIO.unobserve(el);
  }), { threshold: 0 });
  // Anything already on screen when the page opens appears straight away, even
  // if only its top edge shows, so no slot on the first screen sits empty.
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

  /* ---------- Sketch cards: the line drawing draws itself once, in view ----------
     Cards inside the pinned home chapters are drawn by home.js when their
     chapter comes up instead. Reduced motion: drawn and still from the start. */
  const sketches = document.querySelectorAll('.sk-card');
  if (!reduce && sketches.length) {
    const skIO = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || e.target.closest('.chapters.pin')) return;
      e.target.classList.add('drawn');
      skIO.unobserve(e.target);
    }), { rootMargin: '0px 0px -20% 0px' });
    sketches.forEach(c => { c.classList.add('armed'); skIO.observe(c); });
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

  /* ---------- Team: click anywhere on a person to open them in a popup ----------
     As on newcoastre.com: photo and contact on the left, bio on the right,
     arrows (or the arrow keys) step through the team. */
  const memberDialog = document.getElementById('memberDialog');
  if (memberDialog) {
    const members = [...document.querySelectorAll('.member')];
    const panel = memberDialog.querySelector('.md-in');
    let cur = 0, opener = null;
    const show = (i, dir) => {
      cur = (i + members.length) % members.length;
      const m = members[cur], btn = m.querySelector('.m-btn');
      document.getElementById('md-img').src = m.querySelector('.m-photo img').src;
      document.getElementById('md-name').textContent = btn.textContent;
      document.getElementById('md-role').textContent = m.querySelector('.m-role').textContent;
      document.getElementById('md-bio').innerHTML = document.getElementById(btn.dataset.bio).innerHTML;
      document.getElementById('md-contact').innerHTML = m.querySelector('.m-contact').innerHTML;
      document.getElementById('mdCount').textContent = `${cur + 1} / ${members.length}`;
      panel.scrollTop = 0;
      if (dir && !reduce) {
        panel.style.setProperty('--dir', dir > 0 ? '28px' : '-28px');
        panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
      }
    };
    members.forEach((m, i) => m.querySelector('.m-btn').addEventListener('click', e => {
      opener = e.currentTarget;
      panel.classList.remove('swap');
      show(i);
      memberDialog.showModal();
      if (window.ncLenis) window.ncLenis.stop();
    }));
    document.getElementById('mdPrev').addEventListener('click', () => show(cur - 1, -1));
    document.getElementById('mdNext').addEventListener('click', () => show(cur + 1, 1));
    document.getElementById('mdClose').addEventListener('click', () => memberDialog.close());
    memberDialog.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(cur - 1, -1);
      if (e.key === 'ArrowRight') show(cur + 1, 1);
    });
    // A click on the dimmed area outside the panel closes it.
    memberDialog.addEventListener('click', e => { if (e.target === memberDialog) memberDialog.close(); });
    memberDialog.addEventListener('close', () => {
      if (window.ncLenis) window.ncLenis.start();
      // Focus returns to whoever is now showing, so arrowing through then closing lands sensibly.
      const back = members[cur] ? members[cur].querySelector('.m-btn') : opener;
      (back || opener).focus();
    });
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

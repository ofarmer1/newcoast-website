/* Portfolio header film: plays muted while on screen unless reduced motion
   or data saver is on, and the button pauses it at any time (WCAG 2.2.2). */
(() => {
  const video = document.getElementById('pfVideo');
  if (!video) return;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const btn = document.querySelector('[data-video="pfVideo"]');
  let userPaused = false;
  // MP4 (H.264) everywhere it plays; WebM for the few browsers without it.
  video.src = video.canPlayType('video/mp4; codecs="avc1.640028"') ? video.dataset.src : video.dataset.src.replace(/\.mp4$/, '.webm');
  const sync = () => {
    btn.setAttribute('aria-pressed', video.paused);
    btn.setAttribute('aria-label', (video.paused ? 'Play' : 'Pause') + ' construction video');
  };
  btn.hidden = false;
  btn.addEventListener('click', () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); }
    else { userPaused = true; video.pause(); }
  });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  sync();
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && motion.matches && !saveData && !userPaused) video.play().catch(() => {});
    else if (!e.isIntersecting && !video.paused) video.pause();
  }, { threshold: 0.25 }).observe(video);
})();

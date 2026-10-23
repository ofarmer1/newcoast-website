// Contact fallbacks (preview). Copy buttons put the address on the clipboard and say so; the
// message form validates in place, then sends to the site's handler when one is set
// (data-endpoint), or opens the visitor's mail app with the message filled in. It never says a
// message was sent unless the handler confirmed it.
(() => {
  const ADDR = 'contact@newcoastre.com';
  document.querySelectorAll('button.copy').forEach(btn => {
    const ok = btn.parentElement.querySelector('.copy-ok');
    let t;
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy || ADDR;
      let done = false;
      try { await navigator.clipboard.writeText(text); done = true; } catch (e) {
        const addr = btn.parentElement.querySelector('.addr');
        if (addr) { const r = document.createRange(); r.selectNodeContents(addr); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
        try { done = document.execCommand('copy'); } catch (e2) {}
      }
      if (ok) { ok.textContent = done ? 'Copied' : 'Selected, press Ctrl or Cmd + C'; clearTimeout(t); t = setTimeout(() => { ok.textContent = ''; }, 4000); }
    });
  });

  const form = document.getElementById('ct-form');
  if (!form) return;
  const status = form.querySelector('.status');
  const rules = {
    first: v => v.trim() ? '' : 'Enter your first name.',
    last: v => v.trim() ? '' : 'Enter your last name.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter an email address like name@example.com.',
    phone: v => !v.trim() || /^[0-9+().\-\s]{7,}$/.test(v.trim()) ? '' : 'Enter a phone number, or leave it blank.',
    message: v => v.trim().length >= 10 ? '' : 'Tell us a little more (at least 10 characters).',
  };
  const check = el => {
    const rule = rules[el.name]; if (!rule) return true;
    const msg = rule(el.value), err = document.getElementById(el.id + '-err');
    el.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (err) err.textContent = msg;
    return !msg;
  };
  form.querySelectorAll('input,textarea').forEach(el => el.addEventListener('blur', () => { if (el.value) check(el); }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.textContent = '';
    let first = null;
    for (const el of form.querySelectorAll('input[name],textarea[name]')) if (!check(el) && !first) first = el;
    const consent = form.elements.consent, cErr = document.getElementById('ct-consent-err');
    if (!consent.checked) { cErr.textContent = 'Please agree to the privacy policy so we can reply.'; consent.setAttribute('aria-invalid', 'true'); first = first || consent; }
    else { cErr.textContent = ''; consent.setAttribute('aria-invalid', 'false'); }
    if (first) { first.focus(); return; }
    if (form.elements.website.value) return; // honeypot: a person never fills this in
    const f = form.elements, topic = f.topic.value === 'investor' ? 'Investor inquiry' : 'Facility inquiry';
    const data = { topic, first: f.first.value.trim(), last: f.last.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), message: f.message.value.trim(), token: (f['cf-turnstile-response'] || {}).value || '' };
    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true; status.textContent = 'Sending…';
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
        form.reset(); status.textContent = 'Thank you. Your message was sent, and the team will reply by email.';
      } catch (err) {
        status.textContent = `Your message could not be sent. Please email ${ADDR} instead.`;
      } finally { btn.disabled = false; }
      return;
    }
    // No handler yet: hand the message to the visitor's mail app.
    const body = `${data.message}\n\n${data.first} ${data.last}\n${data.email}${data.phone ? '\n' + data.phone : ''}`;
    status.textContent = `Your email app should open with this message ready to send. Nothing is sent until you press send there. If no email app opens, email ${ADDR} directly.`;
    const a = document.createElement('a'); a.href = `mailto:${ADDR}?subject=${encodeURIComponent(topic)}&body=${encodeURIComponent(body)}`; a.click();
  });
})();

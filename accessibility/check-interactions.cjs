// Tests the site's event handlers with DOM test doubles; no browser is launched.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/site.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../portfolio.html'), 'utf8');
class Element {
  constructor(id = '') {
    this.id = id; this.attrs = {}; this.dataset = {}; this.events = {}; this.style = {}; this.children = []; this.hidden = false;
    this.classes = new Set();
    this.classList = {add: x => this.classes.add(x), remove: x => this.classes.delete(x), contains: x => this.classes.has(x), toggle: (x, b) => { b ??= !this.classes.has(x); b ? this.classes.add(x) : this.classes.delete(x); }};
  }
  setAttribute(k, v) {this.attrs[k] = String(v);}
  getAttribute(k) {return this.attrs[k];}
  removeAttribute(k) {delete this.attrs[k];}
  toggleAttribute(k, on) {on ? this.attrs[k] = '' : delete this.attrs[k]; return on;}
  addEventListener(k, cb) {(this.events[k] ??= []).push(cb);}
  dispatch(k, e = {}) {for (const cb of this.events[k] || []) cb({target: this, ...e});}
  focus() {doc.activeElement = this; this.dispatch('focus');}
  contains(el) {return this === el || this.children.some(x => x.contains(el));}
  querySelector() {return null;}
  querySelectorAll() {return [];}
}
const ids = Object.fromEntries(['nav','menuBtn','navLinks','portfolioStatus','facilities','main','about','approach','portfolio','team','contact'].map(x => [x, new Element(x)]));

// Nav links, keyed by href, so the current-section indicator can be checked.
const navAnchors = ['#about', '#portfolio', '#team', '#contact'].map(href => {const e = new Element(); e.attrs.href = href; return e;});
ids.navLinks.children = navAnchors;
ids.navLinks.querySelector = sel => navAnchors.find(a => sel === `a[href="${a.attrs.href}"]`) || null;
ids.navLinks.querySelectorAll = sel => sel === 'a[aria-current]' ? navAnchors.filter(a => 'aria-current' in a.attrs) : [];
ids.nav.children = [ids.menuBtn, ids.navLinks];
const pageAnchors = ['#main', '#approach'].map(href => {const e = new Element(); e.attrs.href = href; return e;});

const filters = ['all','active','realized'].map(f => {const e = new Element(); e.dataset.f = f; return e;});
const items = Array.from(html.matchAll(/<li(?: class="lead")? data-s="([^"]+)"/g), m => {const e = new Element(); e.dataset.s = m[1]; return e;});
assert.equal(items.length, 13, 'thirteen facilities in the markup');

const hero = new Element('top');
const doc = new Element(); doc.activeElement = null; doc.documentElement = new Element();
doc.getElementById = id => ids[id];
doc.createElement = () => new Element(); doc.body = new Element(); doc.body.prepend = el => {doc.body.children.unshift(el);};
ids['pl-h'] = new Element('pl-h'); ids['pl-h'].textContent = 'Built to acquire';
doc.querySelector = sel => sel === '.hero' ? hero : ids[sel.slice(1)] || null;
doc.querySelectorAll = sel => sel === '.filters button' ? filters : sel === 'a[href^="#"]' ? pageAnchors : sel === '#facilities li' ? items : [];
const media = new Map();
const matchMedia = q => {if (!media.has(q)) {const e = new Element(); e.matches = q.includes('reduced-motion'); media.set(q, e);} return media.get(q);};
const observers = [];
class IO {constructor(cb, opts) {this.cb = cb; this.opts = opts; this.els = []; observers.push(this);} observe(el) {this.els.push(el);} unobserve() {} disconnect() {}}
const winEvents = {};
let lenisMade = 0;
const win = {Lenis: class {constructor() {lenisMade++;}}};
vm.runInNewContext(script, {window: win, document: doc, matchMedia, navigator: {}, IntersectionObserver: IO, addEventListener(k, cb) {(winEvents[k] ??= new Set()).add(cb);}, removeEventListener(k, cb) {winEvents[k]?.delete(cb);}, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: cb => cb(), performance: {now: () => 0}, console, Promise, Set, Object});

(async () => {
  // Reduced motion: smooth inertia scrolling is never started; the page scrolls natively.
  assert.equal(lenisMade, 0, 'no smooth scrolling under reduced motion');
  assert.equal(win.ncLenis, undefined);

  // Nav turns solid from an observer once the top of the page scrolls away; no scroll listener.
  const navIO2 = observers.find(o => o.els.length === 1 && o.els[0] === doc.body.children[0]);
  navIO2.cb([{isIntersecting: false}]); assert(ids.nav.classes.has('scrolled'));
  navIO2.cb([{isIntersecting: true}]); assert(!ids.nav.classes.has('scrolled'));
  // The shared script never listens to scroll; nav state and reveals come from observers.
  assert.equal(winEvents.scroll?.size ?? 0, 0, 'no scroll listener in the shared script');

  // Video lives only on the home page, in home.js, with its own pause buttons.
  assert(!/<video|\.play\(/.test(script), 'no video handling in the shared script');

  // Menu disclosure, Escape, and in-page links moving focus.
  ids.menuBtn.dispatch('click'); assert.equal(ids.menuBtn.attrs['aria-expanded'], 'true');
  doc.dispatch('keydown', {key: 'Escape'}); assert.equal(ids.menuBtn.attrs['aria-expanded'], 'false'); assert.equal(doc.activeElement, ids.menuBtn);
  ids.menuBtn.dispatch('click'); pageAnchors[1].dispatch('click'); assert.equal(doc.activeElement, ids.approach); assert.equal(ids.menuBtn.attrs['aria-expanded'], 'false');

  // Nav links are separate pages now: the script never rewrites which one is current.
  assert(!/aria-current/.test(script), 'current page is set in the markup, not by scroll position');

  // Portfolio filters: visible count, pressed state and a status announcement.
  filters[2].dispatch('click'); assert.equal(items.filter(x => !x.hidden).length, 2); assert.match(ids.portfolioStatus.textContent, /2 realized/); assert.equal(filters[2].attrs['aria-pressed'], 'true');
  assert(ids.facilities.classes.has('filtered'));
  filters[1].dispatch('click'); assert.equal(items.filter(x => !x.hidden).length, 11); assert.match(ids.portfolioStatus.textContent, /11 active/);
  filters[0].dispatch('click'); assert.equal(items.filter(x => !x.hidden).length, 13); assert(!ids.facilities.classes.has('filtered'));

  console.log('PASS: reduced motion (no smooth scrolling), no video in the shared script, observer-driven nav, no scroll listener, menu disclosure/Escape, anchor focus, pages marked in markup, facility filters with count announcements.');
})().catch(e => {console.error(e); process.exitCode = 1;});

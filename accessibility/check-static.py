"""Source checks, not a browser audit or conformance certification."""
from html.parser import HTMLParser
V="r2e"  # asset version in every ?v= link
from pathlib import Path
import re,json
root=Path(__file__).resolve().parent.parent
css=(root/'assets/site.css').read_text()
js=(root/'assets/site.js').read_text()
homejs=(root/'assets/home.js').read_text()
homecss=(root/'assets/home.css').read_text()
PAGES={'index.html':None,'about.html':'about','portfolio.html':'portfolio','team.html':'team','contact.html':'contact'}
class Audit(HTMLParser):
 def __init__(self): super().__init__();self.stack=[];self.nodes=[];self.errors=[]
 def handle_starttag(self,t,a):
  d=dict(a);self.nodes.append((t,d))
  if t not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.stack.append(t)
 def handle_endtag(self,t):
  if not self.stack or self.stack[-1]!=t:self.errors.append((self.getpos(),t))
  else:self.stack.pop()
nodes={}
for page,current in PAGES.items():
 html=(root/page).read_text()
 a=Audit();a.feed(html);nodes[page]=a.nodes
 assert not a.errors and not a.stack,(page,a.errors,a.stack)
 ids=[d['id'] for t,d in a.nodes if 'id'in d]
 assert len(ids)==len(set(ids)),page
 for t,d in a.nodes:
  for key in ('aria-labelledby','aria-describedby','aria-controls'):
   for ref in d.get(key,'').split():assert ref in ids,(page,t,key,ref)
  if t=='a' and d.get('href','').startswith('#'):assert d['href'][1:] in ids,(page,d['href'])
  # Links between pages point at pages that exist.
  if t=='a' and re.match(r'^[\w-]+\.html',d.get('href','')):assert (root/d['href'].split('#')[0]).is_file(),(page,d['href'])
  if t=='img':
   assert 'alt' in d,(page,d.get('src'))
   # Width and height on every image, so nothing shifts while photos load.
   assert 'width' in d and 'height' in d,(page,d.get('src'))
  for attr in ('src','href'):
   v=d.get(attr,'')
   if v.startswith('assets/'):assert(root/v.split('?')[0]).is_file(),(page,v)
 assert sum(t=='h1' for t,d in a.nodes)==1,page
 assert '<main id="main" tabindex="-1">'in html and '<a class="skip" href="#main">' in html,page
 # Each nav link is its own page, and the current page is marked.
 navlinks=re.search(r'<nav class="nav-links.*?</nav>',html,re.S).group(0)
 assert not re.search(r'href="#',navlinks),page
 marked=re.findall(r'href="([\w-]+)\.html" aria-current="page"',navlinks)
 assert marked==([current] if current else []),(page,marked)
 # One shared stylesheet and script, both local; no outside font request.
 # A ?v= query busts the browser cache after each release.
 sheets=['<link rel="stylesheet" href="assets/site.css?v=%s">'%V]+(['<link rel="stylesheet" href="assets/home.css?v=%s">'%V] if page=='index.html' else [])
 assert re.findall(r'<link[^>]+rel="stylesheet"[^>]*>',html)==sheets and 'fonts.g' not in html,page
 # Smooth scrolling library is self-hosted and loads before the site script.
 assert html.index('src="assets/vendor/lenis.min.js?v=%s"'%V) < html.index('src="assets/site.js?v=%s"'%V),page
 # Video only on the home and portfolio pages, and every video has its own pause/play button (WCAG 2.2.2).
 vids=re.findall(r'<video id="(\w+)"',html)
 assert page in ('index.html','portfolio.html') or not vids,page
 for v in vids: assert f'data-video="{v}"' in html,(page,v)
 for t,d in a.nodes:
  if t=='video':
   for k in ('data-src','data-src-sm','poster'):
    if k in d: assert (root/d[k]).is_file(),(page,k)
 # Every themed section names one of the two token sets.
 assert set(re.findall(r'data-theme="(\w+)"',html))<={'light','dark'},page
 # Draft media boxes: every photo or video slot is tagged for Myles.
 for m in re.finditer(r'<img [^>]*src="assets/img/(?:facilities|team)/[^>]+>',html):
  before=html[:m.start()]
  assert before.rfind('class="') > -1 and re.search(r'class="[^"]*\bask\b[^"]*" data-ask="[^"]+"[^<]*(?:<[^>]*>[^<]*){0,1}$',before[-400:]) or 'class="faces ask"' in before[-1600:],(page,m.group(0)[:80])
 # No em or en dashes in anything a visitor reads or hears (comments excluded).
 visible=re.sub(r'<!--.*?-->|<style>.*?</style>|<script>.*?</script>|data-ask="[^"]*"','',html,flags=re.S)
 assert not re.search('[–—]',visible),(page,re.findall('.{20}[–—].{20}',visible))
p=nodes['portfolio.html']
assert sum(t=='li' and 'data-s'in d for t,d in p)==13
assert sum(t=='li' and d.get('data-s')=='active' for t,d in p)==11
assert sum(t=='li' and d.get('data-s')=='realized' for t,d in p)==2
assert 'role="status" aria-live="polite"' in (root/'portfolio.html').read_text()
# Team photos are shown in color, as on newcoastre.com.
assert not re.search(r'\.person img\{[^}]*grayscale',css)
# Review tags are hidden from screen readers (empty alt text for generated content).
assert 'content:attr(data-ask) / ""' in css
# Scroll-linked motion is opt-in: only under prefers-reduced-motion: no-preference.
assert all(re.search(r'@media \(prefers-reduced-motion:no-preference\)[^{]*\{\s*'+sel,css) for sel in (r'\.beat\{animation',r'\.platform h1\.words'))
# The lever being read never dims below .6 opacity (on-dark at .6 over the canvas is still above 4.5:1).
assert re.search(r'@keyframes beat-focus\{0%,100%\{opacity:\.6\}',css)
# The shared script has no scroll listener (nav state comes from an observer); the home page batches
# all position-linked motion into one listener drawn once per frame.
assert js.count("addEventListener('scroll'")==0 and "addEventListener('scrollend'" in js
assert homejs.count("addEventListener('scroll'")==1 and 'requestAnimationFrame(() => { ticking = false;' in homejs
# Smooth scrolling never runs for people who ask for reduced motion.
assert "if (!reduce && window.Lenis)" in js
# Home motion has a still version: pinning, the site-plan drawing and the film slot check reduced motion.
assert 'const canPin = () => motion.matches' in homejs and "if (motion.matches) {\n    bp.classList.add('armed')" in homejs and "if (!motion.matches) { slot.style.setProperty('--g', 1)" in homejs
assert '@media (prefers-reduced-motion:reduce)' in homecss
# Map: only the eight Newcoast states are focusable buttons, and each names its facility count.
home=(root/'index.html').read_text()
states=re.findall(r'<g class="st" data-st="(\w\w)" role="button" tabindex="0" aria-haspopup="dialog" aria-label="([^"]+)"',home)
assert [s for s,_ in states]==['IL','WI','MI','NY','CT','SC','TX','AZ'] and states[0][1]=='Illinois, 6 facilities',states
assert home.count('tabindex="0"')==8 and '<g class="land" aria-hidden="true">' in home
assert home.count('<li>',home.index('class="map-list"'))>=13
# Self-hosted fonts and every CSS url() resolve (relative to assets/).
faces=re.findall(r'@font-face\{[^}]*url\("([^"]+)"\)[^}]*font-display:swap',css)
assert len(faces)==2 and all((root/'assets'/f).is_file() for f in faces),faces
for u in re.findall(r'url\("([^"]+)"\)',css+homecss):
 if u.startswith('data:'): continue
 assert (root/'assets'/u).is_file(),u
light=dict(re.findall(r'--([\w-]+):\s*(#[0-9A-Fa-f]{6})',css[css.index(':root{'):css.index('}',css.index(':root{'))]))
dk=css.index('[data-theme="dark"],html[data-nav="dark"] .nav')
dark=dict(re.findall(r'--([\w-]+):\s*(#[0-9A-Fa-f]{6})',css[dk:css.index('}',dk)]))
def rgb(h):return [int(h[i:i+2],16)/255 for i in (1,3,5)]
def lum(c):return sum(w*(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4)for v,w in zip(c,(.2126,.7152,.0722)))
def ratio(f,b):
 x,y=sorted([lum(f),lum(b)]);return(y+.05)/(x+.05)
results=[]
# Text: body and muted text on every canvas, and text on the accent (buttons use --bg on --accent).
for theme,colors in (('light',light),('dark',dark)):
 for f,b in [('fg','bg'),('fg','bg-2'),('fg','bg-3'),('fg-2','bg'),('fg-2','bg-2'),('fg-2','bg-3'),('bg','accent'),('accent','bg'),('accent','bg-2')]:
  r=ratio(rgb(colors[f]),rgb(colors[b]));assert r>=4.5,(theme,f,b,r);results.append([theme,f,b,round(r,2)])
 for b in ['bg','bg-2','bg-3']:
  r=ratio(rgb(colors['focus']),rgb(colors[b]));assert r>=3,(theme,b,r);results.append([theme,'focus',b,round(r,2)])
# Map: facility states against the other states, and the hover/focus fill.
r=ratio(rgb(light['accent']),rgb(light['bg-3']));assert r>=3;results.append(['light','accent','bg-3 (map land)',round(r,2)])
for name,opacity in [('hero worst-case white frame',.72)]:
 bg=[v*opacity+(1-opacity)for v in rgb('#141311')]
 r=ratio(rgb(dark['fg']),bg);assert r>=4.5;results.append(['dark','fg',name,round(r,2)])
print(json.dumps({'pages':list(PAGES),'structure':'PASS','ids_and_references':'PASS','local_assets':'PASS','navigation':'PASS','static_content':'PASS','contrast_pairs':results},indent=2))

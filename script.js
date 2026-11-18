(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const isHome = document.body.classList.contains('page-home');
  const introDelay = isHome && !root.classList.contains('skip-intro') && !reduced ? 1500 : 0;

  /* ---------- split headlines into words that rise ---------- */
  function split(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.style.setProperty('--i', i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName.toLowerCase() !== 'svg') {
          walk(child);
        }
      });
    };
    walk(el);
  }
  $$('.split').forEach(split);

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

  const hero = $('.hero, .legal-hero');
  // The wordmark starts fully clipped, which hides it from the observer, so watch its section instead.
  const mark = $('.cta__mark');
  if (mark) {
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { mark.classList.add('is-in'); obs.disconnect(); }
    }, { threshold: 0.25 }).observe(mark.parentElement);
  }
  $$('.reveal, .split').forEach((el) => {
    if (hero && hero.contains(el)) {
      setTimeout(() => el.classList.add('is-in'), introDelay + 80);
    } else {
      revealIO.observe(el);
    }
  });

  /* ---------- count up numbers ---------- */
  function countTo(el, to, ms = 1400) {
    if (reduced) { el.textContent = to.toLocaleString(); return; }
    const from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min((now - t0) / ms, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const inHero = hero && hero.contains(el);
      setTimeout(() => countTo(el, +el.dataset.to), inHero ? introDelay + 500 : 0);
      countIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  $$('.count').forEach((el) => countIO.observe(el));

  /* ---------- nav, menu, scroll progress ---------- */
  const nav = $('#nav');
  const bar = $('.progress');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--sp', max > 0 ? y / max : 0);
    if (nav) {
      nav.classList.toggle('is-solid', y > 40);
      nav.classList.toggle('is-hidden', y > 700 && y > lastY + 4 && !document.body.classList.contains('menu-open'));
      if (y < lastY - 4) nav.classList.remove('is-hidden');
    }
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('#navToggle');
  const menu = $('#menu');
  if (toggle && menu) {
    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('menu-open', open);
      if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); }
      else { menu.classList.remove('is-open'); setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700); }
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- twin cursor: one for you, one for them ---------- */
  if (finePointer && !reduced) {
    root.classList.add('has-cursor');
    const cur = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', (e) => {
      if (!cur.classList.contains('is-live')) { rx = e.clientX; ry = e.clientY; cur.classList.add('is-live'); }
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    });
    addEventListener('mousedown', () => cur.classList.add('is-down'));
    addEventListener('mouseup', () => cur.classList.remove('is-down'));
    document.addEventListener('mouseover', (e) => {
      cur.classList.toggle('is-hover', !!e.target.closest('a, button, select, input, label, .polaroid'));
    });
    document.addEventListener('mouseleave', () => cur.classList.remove('is-live'));
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    })();

    /* magnetic buttons */
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- fairy lights ---------- */
  function lights(container, n) {
    if (!container || reduced) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      const size = 4 + Math.random() * 16;
      s.className = 'light';
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `--b:${size > 14 ? 3 : 0.5}px;--t:${8 + Math.random() * 10}s;--dl:${-Math.random() * 10}s;` +
        `--x:${(Math.random() - 0.5) * 120}px;--y:${(Math.random() - 0.5) * 120}px;`;
      container.appendChild(s);
    }
  }
  lights($('#lights'), 26);
  lights($('.cta__lights'), 18);
  lights($('.legal-hero__lights'), 14);

  /* ---------- hero collage parallax (mouse + scroll) ---------- */
  const collage = $('#collage');
  if (collage && !reduced) {
    const layers = $$('[data-depth]', collage);
    let px = 0, py = 0;
    const apply = () => {
      const sy = Math.min(scrollY, innerHeight);
      layers.forEach((el) => {
        const d = +el.dataset.depth;
        el.style.transform = `translate3d(${px * d}px, ${py * d - sy * d * 0.003}px, 0)`;
      });
    };
    if (finePointer) {
      $('.hero').addEventListener('mousemove', (e) => {
        px = (e.clientX / innerWidth - 0.5) * 0.7;
        py = (e.clientY / innerHeight - 0.5) * 0.7;
        apply();
      });
    }
    addEventListener('scroll', apply, { passive: true });
    apply();
  }

  /* ---------- hugs: hearts + toast (captions from lib/data/hug_messages.dart) ---------- */
  const HUGS = [
    "A little hug to remind you, you're always on my mind.",
    'You make my days brighter.',
    "I'm so lucky to have you.",
    'Just a hug, because you mean so much to me.',
    "You're my favorite person.",
    'Always and forever.',
    "Even from far, you're close to my heart.",
    "You're my today and tomorrow.",
  ];
  let hugN = 0;
  let toastTimer;
  const toast = $('#toast');
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2800);
  }
  function burst(el) {
    if (reduced) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const h = document.createElement('span');
      h.className = 'float-heart';
      h.textContent = '♥';
      h.style.left = r.left + r.width / 2 - 10 + 'px';
      h.style.top = r.top + 'px';
      h.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      h.style.setProperty('--r', (Math.random() * 70 - 35) + 'deg');
      h.style.animationDelay = i * 40 + 'ms';
      document.body.appendChild(h);
      h.addEventListener('animationend', () => h.remove());
    }
  }
  function sendHug(el) {
    burst(el);
    showToast('Hug sent 💛 ' + HUGS[hugN++ % HUGS.length]);
  }
  $$('#heroHug, .s-hug').forEach((el) => el.addEventListener('click', () => sendHug(el)));

  /* ---------- "two become us" scroll scene ---------- */
  const merge = $('#merge');
  if (merge) {
    const stage = $('.merge__stage', merge);
    const lines = $$('.merge__line', merge);
    const update = () => {
      const r = merge.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight), 0, 1);
      stage.style.setProperty('--mp', p.toFixed(4));
      const idx = p < 0.3 ? 0 : p < 0.62 ? 1 : 2;
      lines.forEach((l, i) => {
        l.classList.toggle('is-on', i === idx);
        l.classList.toggle('is-past', i < idx);
      });
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- feature chapters drive the phone ---------- */
  const chapters = $$('.chapter');
  if (chapters.length) {
    const screens = $$('.screen');
    const dots = $$('.phone__tabs i');
    const show = (n) => {
      chapters.forEach((c) => c.classList.toggle('is-on', +c.dataset.step === n));
      screens.forEach((s) => s.classList.toggle('is-on', +s.dataset.screen === n));
      dots.forEach((d, i) => d.classList.toggle('is-on', i === n));
    };
    const chapterIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(+e.target.dataset.step); });
    // On phones the sticky phone covers the top of the screen, so read the chapter below it.
    }, { rootMargin: matchMedia('(max-width: 980px)').matches ? '-60% 0px -30% 0px' : '-45% 0px -45% 0px' });
    chapters.forEach((c) => chapterIO.observe(c));
    show(0);

    const opts = $('#phoneOpts');
    const hint = $('#phoneHint');
    opts.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      $$('button', opts).forEach((x) => x.classList.toggle('is-picked', x === b));
      opts.classList.add('is-revealed');
      const match = b.classList.contains('is-them');
      hint.textContent = match ? "It's a match! You both picked this 💛" : 'Saved. Now you can see what they picked.';
      if (match) burst(b);
    });
  }

  /* ---------- days together ring (rules from lib/core/milestone_manager.dart) ---------- */
  const EARLY = [[7, 'First week together'], [30, 'One month together'], [90, '3 months together'], [182, '6 months together'], [365, '1st anniversary']];
  const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13) ? n + 'th' : n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const nextMilestone = (days) => {
    for (const [d, label] of EARLY) if (d > days) return { days: d, label };
    const year = Math.floor(days / 365) + 1;
    return { days: year * 365, label: ordinal(year) + ' anniversary' };
  };

  const ring = $('.ring');
  if (ring) {
    const fill = $('#ringFill');
    const heart = $('#ringHeart');
    const num = $('#daysNum');
    const next = $('#daysNext');
    const note = $('#counterNote');
    const input = $('#startDate');
    const C = 2 * Math.PI * 130;
    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    input.max = iso(midnight);
    input.value = iso(new Date(midnight.getTime() - 247 * 86400000));
    let visible = false;

    const setRadius = () => ring.style.setProperty('--r', (ring.offsetWidth * 130 / 300) + 'px');
    setRadius();
    addEventListener('resize', setRadius);

    const render = () => {
      if (!input.value) return;
      const [y, m, d] = input.value.split('-').map(Number);
      const days = Math.round((midnight - new Date(y, m - 1, d)) / 86400000);
      if (days < 0) return;
      const ms = nextMilestone(days);
      const pct = clamp(Math.floor(days * 100 / ms.days), 0, 100);
      fill.style.strokeDashoffset = C * (1 - pct / 100);
      heart.style.setProperty('--a', (pct * 3.6) + 'deg');
      countTo(num, days, 1300);
      next.textContent = `${pct}% to ${ms.label}`;
      note.textContent = days < 30 ? 'the start of something good ♡'
        : days < 365 ? "that's a lot of good mornings ♡"
        : days < 1825 ? 'years of inside jokes ♡' : 'a whole love story ♡';
    };
    num.textContent = '0';
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting && !visible) { visible = true; render(); obs.disconnect(); }
    }, { threshold: 0.35 }).observe(ring);
    input.addEventListener('change', () => { if (visible) render(); });
  }

  /* ---------- long distance clocks ---------- */
  const tzSelect = $('#tzSelect');
  if (tzSelect) {
    const parts = (tz) => {
      const o = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
        .formatToParts(new Date()).forEach((p) => { o[p.type] = +p.value; });
      return o;
    };
    const fmt = (tz) => new Intl.DateTimeFormat([], { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date());
    const setFace = (face, p) => {
      face.style.setProperty('--h', ((p.hour % 12) * 30 + p.minute * 0.5) + 'deg');
      face.style.setProperty('--m', (p.minute * 6 + p.second * 0.1) + 'deg');
      face.style.setProperty('--s', (p.second * 6) + 'deg');
    };
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const diffEl = $('#tzDiff');
    const tick = () => {
      const them = tzSelect.value;
      const a = parts(localTz), b = parts(them);
      setFace($('#clockYou'), a);
      setFace($('#clockThem'), b);
      $('#timeYou').textContent = fmt(localTz);
      $('#timeThem').textContent = fmt(them);
      const wall = (p) => Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
      const mins = Math.round((wall(b) - wall(a)) / 60000 / 15) * 15;
      const h = Math.floor(Math.abs(mins) / 60), m = Math.abs(mins) % 60;
      const span = `${h ? h + 'h' : ''}${h && m ? ' ' : ''}${m ? m + 'm' : ''}`;
      const city = tzSelect.options[tzSelect.selectedIndex].text;
      const night = b.hour >= 22 || b.hour < 6;
      diffEl.textContent = mins === 0
        ? `Same time zone as ${city}. Lucky you two.`
        : `${city} is ${span} ${mins > 0 ? 'ahead of' : 'behind'} you. ${night ? "They're probably asleep, so leave a hug for the morning." : 'A good moment to say hi.'}`;
    };
    tick();
    setInterval(tick, 1000);
    tzSelect.addEventListener('change', tick);
  }

  /* ---------- envelope opens when it comes into view ---------- */
  const env = $('#envelope');
  if (env) {
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { env.classList.add('is-open'); obs.disconnect(); }
    }, { threshold: 0.6 }).observe(env);
  }

  /* ---------- privacy page: table of contents follows along ---------- */
  const tocLinks = $$('.toc a');
  if (tocLinks.length) {
    const map = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const tocIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        tocLinks.forEach((a) => a.classList.remove('is-on'));
        const a = map.get(e.target.id);
        if (a) a.classList.add('is-on');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.legal__body section[id]').forEach((s) => tocIO.observe(s));
  }

  $$('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();

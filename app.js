/* ═══════════════════════════════════════════════════════════════
   TUMADAM · NEON DECK  —  v3
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const tg = window.Telegram?.WebApp;
const $  = (id) => document.getElementById(id);

const MAX_PICK   = 10;                       // ← giới hạn 10 skin
const CART_KEY   = 'tmd_cart_v3';
const HAPTIC_KEY = 'tmd_haptic';
const IMGC_KEY   = 'tmd_imgcache_v1';

let DATA  = { heroes: [], letters: [], v: 0 };
let ICONS = {};
let CART  = {};
let curLetter = null, curHero = null;
let haptic = localStorage.getItem(HAPTIC_KEY) !== '0';

/* ════════════ ICON SVG ════════════ */
const P = (d, w = 1.7) =>
  `<path d="${d}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const ICON = {
  hero:  P('M12 3l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 14.8l-4.6 2.4.9-5.1L4.5 8.5l5.2-.8L12 3z', 1.6),
  cart:  P('M4 5h2l1.3 9.3a2 2 0 0 0 2 1.7h7.5a2 2 0 0 0 2-1.7L20 8H7') +
         '<circle cx="10" cy="19.4" r="1.4" fill="currentColor"/><circle cx="17" cy="19.4" r="1.4" fill="currentColor"/>',
  gear:  '<circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.7" fill="none"/>' +
         P('M12 3.4v2.1M12 18.5v2.1M3.4 12h2.1M18.5 12h2.1M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18', 1.5),
  search:'<circle cx="11" cy="11" r="6.4" stroke="currentColor" stroke-width="1.7" fill="none"/>' + P('M16 16l4.3 4.3'),
  back:  P('M14.5 5.5 8 12l6.5 6.5', 2),
  trash: P('M5 7h14M10 7V5.2A1.2 1.2 0 0 1 11.2 4h1.6A1.2 1.2 0 0 1 14 5.2V7M6.5 7l.8 11.2A1.8 1.8 0 0 0 9.1 20h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7', 1.6),
  run:   P('M13 3 5 13.5h5.4L11 21l8-10.5h-5.4L13 3z', 1.6),
  check: P('M5 12.6 9.6 17 19 7.5', 2.3),
  close: P('M6.5 6.5l11 11M17.5 6.5l-11 11', 2),
  user:  '<circle cx="12" cy="8.4" r="3.6" stroke="currentColor" stroke-width="1.7" fill="none"/>' + P('M4.6 20a7.6 7.6 0 0 1 14.8 0', 1.7),
  shield:P('M12 3.4l7 2.8v5.1c0 4.2-2.9 7.7-7 9.3-4.1-1.6-7-5.1-7-9.3V6.2l7-2.8z', 1.6) + P('M9 12.2l2.1 2.1L15.3 10', 1.8),
  db:    '<ellipse cx="12" cy="6.4" rx="7" ry="2.9" stroke="currentColor" stroke-width="1.6" fill="none"/>' +
         P('M5 6.4v11.2c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V6.4M5 12c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9', 1.6),
  wave:  P('M3 12c1.6-3.4 3.2-3.4 4.8 0s3.2 3.4 4.8 0 3.2-3.4 4.8 0 3.2 3.4 4.8 0', 1.7),
  bolt:  P('M13 3 5 13.5h5.4L11 21l8-10.5h-5.4L13 3z', 1.6),
  box:   P('M4.5 8.5 12 4l7.5 4.5v7L12 20l-7.5-4.5v-7z', 1.6) + P('M4.5 8.5 12 13l7.5-4.5M12 13v7', 1.6),
};

const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${ICON[n] || ''}</svg>`;

function paintIcons(root = document) {
  root.querySelectorAll('[data-ic]:not([data-done])').forEach((el) => {
    if (!ICON[el.dataset.ic]) return;
    el.innerHTML = svg(el.dataset.ic);
    el.dataset.done = '1';
  });
}

/* ════════════ TIỆN ÍCH ════════════ */

function buzz(k = 'light') {
  if (!haptic) return;
  try {
    const h = tg?.HapticFeedback;
    if (k === 'ok') h?.notificationOccurred('success');
    else if (k === 'err') h?.notificationOccurred('error');
    else if (k === 'warn') h?.notificationOccurred('warning');
    else h?.impactOccurred(k);
  } catch (e) {}
}

function toast(msg, kind = 'info', ms = 2000) {
  const s = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = svg({ ok: 'check', err: 'close', warn: 'bolt', info: 'bolt' }[kind]) + '<span></span>';
  el.querySelector('span').textContent = msg;
  el.onclick = () => el.remove();
  s.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 240); }, ms);
}

function noAccent(s) {
  return (s || '').replace(/[Đđ]/g, '\u0001')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'Đ');
}

const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(CART)); } catch (e) {} };
const nCart = () => Object.keys(CART).length;

/* ════════════════════════════════════════════════════════════
   ẢNH — nguyên nhân LAG chính ở bản cũ:
   mỗi ô gọi thẳng CDN, ảnh nào 403 lại tải lại lần 2 (fallback)
   => gấp đôi request, và tất cả nổ ra cùng lúc.

   v3 xử lý:
     1. IntersectionObserver — chỉ tải ảnh SẮP lọt vào màn hình
     2. Hàng đợi giới hạn 6 request song song
     3. Cache kết quả (head.jpg / .jpg / hỏng) vào localStorage
        => lần sau vào là hiện ngay, không dò lại
   ════════════════════════════════════════════════════════════ */

let ICON_BASE = 'https://dl.ops.kgvn.garenanow.com/hok/VN/HeroHeadPath/';
let ICON_CDN  = '30';

let IMGC = {};
try { IMGC = JSON.parse(localStorage.getItem(IMGC_KEY) || '{}') || {}; } catch (e) { IMGC = {}; }
let imgcDirty = false;
setInterval(() => {
  if (!imgcDirty) return;
  imgcDirty = false;
  try { localStorage.setItem(IMGC_KEY, JSON.stringify(IMGC)); } catch (e) {}
}, 2500);

function prefixOf(h) {
  const info = ICONS[h.o || h.n];
  if (info && info.prefix && (!h.i || info.prefix === h.i)) return info.prefix;
  return h.i || (info && info.prefix) || '';
}

/** Khoá ảnh: 30 + prefix + variant. */
function imgKey(h, skinId) {
  const p = prefixOf(h);
  if (!p) return null;
  const info = ICONS[h.o || h.n];
  const cdn = (info && info.cdn_id) || ICON_CDN;
  let v = 0;
  if (skinId) {
    const n = parseInt(String(skinId).slice(-2), 10);
    if (!Number.isNaN(n)) v = n;
  }
  return `${cdn}${p}${v}`;
}

const urlHead  = (k) => `${ICON_BASE}${k}head.jpg`;
const urlPlain = (k) => `${ICON_BASE}${k}.jpg`;

/** Avatar dự phòng: SVG gradient sinh từ chính khoá, luôn hiển thị đẹp. */
function placeholderFor(key, label) {
  let hash = 0;
  for (const ch of String(key || label || '?')) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  const h1 = hash % 360, h2 = (h1 + 55) % 360;
  const t = (label || '?').trim()[0]?.toUpperCase() || '?';
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h1},70%,42%)"/>
      <stop offset="1" stop-color="hsl(${h2},72%,26%)"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#g)"/>
    <text x="50" y="50" font-family="Inter,sans-serif" font-size="44" font-weight="800"
      fill="rgba(255,255,255,.9)" text-anchor="middle" dominant-baseline="central">${t}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}

/* hàng đợi tải ảnh */
const QUEUE = [];
let active = 0;
const MAX_PARALLEL = 6;

function pump() {
  while (active < MAX_PARALLEL && QUEUE.length) {
    const job = QUEUE.shift();
    if (!job.el.isConnected) continue;
    active++;
    job.run().finally(() => { active--; pump(); });
  }
}

function loadInto(el) {
  const key = el.dataset.key;
  const label = el.dataset.label || '';
  if (!key) { el.src = placeholderFor(key, label); return; }

  const cached = IMGC[key];
  if (cached === 'x') { el.src = placeholderFor(key, label); return; }
  if (cached === 'p') { el.src = urlPlain(key); return; }
  if (cached === 'h') { el.src = urlHead(key); return; }

  // Chưa biết -> dò 1 lần rồi ghi nhớ kết quả
  QUEUE.push({
    el,
    run: () => new Promise((done) => {
      const tryUrl = (url, kind, next) => {
        const probe = new Image();
        probe.decoding = 'async';
        probe.referrerPolicy = 'no-referrer';
        probe.onload = () => {
          IMGC[key] = kind; imgcDirty = true;
          if (el.isConnected) el.src = url;
          done();
        };
        probe.onerror = () => next();
        probe.src = url;
      };
      tryUrl(urlHead(key), 'h', () =>
        tryUrl(urlPlain(key), 'p', () => {
          IMGC[key] = 'x'; imgcDirty = true;
          if (el.isConnected) el.src = placeholderFor(key, label);
          done();
        }));
    }),
  });
  pump();
}

const IO = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        IO.unobserve(e.target);
        loadInto(e.target);
      });
    }, { rootMargin: '400px 0px', threshold: 0.01 })
  : null;

/** <img> lười tải. Trả về HTML, phải gọi bindImgs() sau khi gắn vào DOM. */
function img(h, skinId, cls, label) {
  const key = imgKey(h, skinId) || '';
  return `<img class="${cls}" alt="" decoding="async" referrerpolicy="no-referrer" ` +
         `data-lazy="1" data-key="${key}" data-label="${(label || h.n || '').slice(0, 2)}" ` +
         `src="${placeholderFor(key, label || h.n)}">`;
}

function bindImgs(root) {
  root.querySelectorAll('img[data-lazy]').forEach((el) => {
    el.removeAttribute('data-lazy');
    IO ? IO.observe(el) : loadInto(el);
  });
}

/* ════════════ DỮ LIỆU ════════════ */

async function loadJson(n) {
  const r = await fetch(`${n}?t=${DATA.v || Date.now()}`, { cache: 'default' });
  if (!r.ok) throw new Error(`${n}: HTTP ${r.status}`);
  return r.json();
}

async function loadAll() {
  const [cat, ico] = await Promise.allSettled([loadJson('catalog.json'), loadJson('hero_icons.json')]);
  if (cat.status !== 'fulfilled') throw cat.reason;
  DATA = cat.value;

  if (ico.status === 'fulfilled') {
    const raw = ico.value;
    ICON_BASE = raw._cdn_base || ICON_BASE;
    ICON_CDN  = raw._cdn_id   || ICON_CDN;
    for (const [k, v] of Object.entries(raw)) if (!k.startsWith('_')) ICONS[k] = v;
  }

  // gom sẵn theo chữ cái -> khỏi filter lại mỗi lần render
  DATA.byLetter = {};
  DATA.heroes.forEach((h) => (DATA.byLetter[h.l] ||= []).push(h));
}

const heroesOf = (L) => DATA.byLetter[L] || [];
const pickedOf = (h) => Object.values(CART).find((c) => c.heroId === h.i);

/* ════════════ RENDER ════════════ */

function renderStats() {
  $('stHero').textContent = DATA.heroes.length;
  $('stSkin').textContent = DATA.heroes.reduce((a, h) => a + h.s.length, 0);
  $('stCart').textContent = nCart();

  const d = $('dot');
  d.textContent = nCart() || '';
  nCart() ? d.removeAttribute('data-zero') : d.setAttribute('data-zero', '');

  const pct = Math.min(100, (nCart() / MAX_PICK) * 100);
  const fill = $('capFill');
  fill.style.width = pct + '%';
  fill.className = 'cap-fill' + (nCart() >= MAX_PICK ? ' full' : nCart() >= MAX_PICK - 2 ? ' warn' : '');
  $('capTx').textContent = `${nCart()} / ${MAX_PICK} SLOT`;
  $('capHint').textContent =
    nCart() >= MAX_PICK ? 'ĐẦY' : nCart() ? 'SẴN SÀNG CHẠY' : 'SẴN SÀNG';
}

function renderAlpha() {
  const cnt = {};
  Object.values(CART).forEach((c) => {
    const h = DATA.heroes.find((x) => x.i === c.heroId);
    if (h) cnt[h.l] = (cnt[h.l] || 0) + 1;
  });

  const box = $('alpha');
  const frag = document.createDocumentFragment();
  DATA.letters.forEach((L, i) => {
    const b = document.createElement('button');
    b.className = 'alpha-cell' + (cnt[L] ? ' on' : '');
    b.style.animationDelay = Math.min(i * 14, 320) + 'ms';
    b.innerHTML = `<b>${L}</b><span class="n">${heroesOf(L).length}</span>` +
                  (cnt[L] ? `<span class="pick">${cnt[L]}</span>` : '');
    b.onclick = () => { buzz(); openLetter(L); };
    frag.appendChild(b);
  });
  box.replaceChildren(frag);
  $('skel').hidden = true;
}

function openLetter(L) {
  curLetter = L;
  $('paneAlpha').hidden = true;
  $('paneSkins').hidden = true;
  $('paneHeroes').hidden = false;

  const list = heroesOf(L);
  $('hTitle').textContent = `CHỮ ${L}`;
  $('hSub').textContent = `${list.length} tướng`;

  const box = $('heroes');
  const frag = document.createDocumentFragment();
  list.forEach((h, i) => {
    const p = pickedOf(h);
    const b = document.createElement('button');
    b.className = 'hero-row' + (p ? ' on' : '');
    b.style.animationDelay = Math.min(i * 12, 260) + 'ms';
    b.innerHTML =
      `${img(h, p ? p.id : null, 'hr-ava', h.n)}
       <span class="hr-meta"><span class="hr-name"></span><span class="hr-sub"></span></span>
       <span class="hr-chev">${svg('back')}</span>`;
    b.querySelector('.hr-name').textContent = h.n;
    b.querySelector('.hr-sub').textContent = p ? `▸ ${p.name}` : `${h.s.length} skin`;
    b.onclick = () => { buzz(); openHero(h); };
    frag.appendChild(b);
  });
  box.replaceChildren(frag);
  bindImgs(box);
  window.scrollTo({ top: 0 });
  syncBack();
}

function openHero(h) {
  curHero = h;
  $('paneHeroes').hidden = true;
  $('paneSkins').hidden = false;

  const p = pickedOf(h);
  const bn = $('banner');
  bn.innerHTML =
    `${img(h, p ? p.id : null, 'bn-ava', h.n)}
     <div class="bn-meta"><h2 class="bn-name"></h2><p class="bn-sub"></p></div>`;
  bn.querySelector('.bn-name').textContent = h.n;
  const sub = bn.querySelector('.bn-sub');
  sub.textContent = p ? `▸ ĐANG CHỌN: ${p.name}` : `${h.s.length} skin · chạm để chọn`;
  sub.className = 'bn-sub' + (p ? ' on' : '');
  bindImgs(bn);

  const box = $('skins');
  const frag = document.createDocumentFragment();
  h.s.forEach(([sid, sname], i) => {
    const b = document.createElement('button');
    b.className = 'skin' + (CART[sid] ? ' on' : '');
    b.style.animationDelay = Math.min(i * 22, 340) + 'ms';
    b.innerHTML =
      `<span class="skin-img">${img(h, sid, '', sname)}<span class="skin-tick">${svg('check')}</span></span>
       <span class="skin-name"></span>`;
    b.querySelector('.skin-name').textContent = sname;
    b.onclick = () => toggleSkin(h, sid, sname);
    frag.appendChild(b);
  });
  box.replaceChildren(frag);
  bindImgs(box);
  window.scrollTo({ top: 0 });
  syncBack();
}

function toggleSkin(h, sid, sname) {
  if (CART[sid]) {
    delete CART[sid];
    buzz('warn'); toast('Đã bỏ ' + sname, 'warn');
  } else {
    const old = Object.entries(CART).find(([, c]) => c.heroId === h.i);
    // Đầy slot: chỉ chặn khi đây là TƯỚNG MỚI. Đổi skin cùng tướng vẫn cho.
    if (!old && nCart() >= MAX_PICK) {
      buzz('err');
      toast(`Tối đa ${MAX_PICK} skin! Bỏ bớt rồi chọn lại.`, 'err', 2800);
      return;
    }
    if (old) delete CART[old[0]];
    CART[sid] = { id: sid, name: sname, hero: h.n, heroId: h.i };
    buzz('ok'); toast(old ? 'Đổi sang ' + sname : 'Đã thêm ' + sname, 'ok');
  }
  saveCart(); renderStats(); renderCart(); openHero(h);
}

function renderCart() {
  const box = $('cart');
  const items = Object.values(CART);
  $('cartAct').hidden = !items.length;
  $('cartSub').textContent = items.length
    ? `${items.length}/${MAX_PICK} skin · mỗi tướng 1 skin`
    : `Tối đa ${MAX_PICK} skin · mỗi tướng 1 skin`;

  if (!items.length) {
    box.innerHTML = `<div class="empty">${svg('box')}<p>Khoang chứa trống.<br>Qua tab <b>TƯỚNG</b> để bắt đầu.</p></div>`;
    paintIcons(box);
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach((c, i) => {
    const h = DATA.heroes.find((x) => x.i === c.heroId) || { n: c.hero, i: c.heroId };
    const row = document.createElement('div');
    row.className = 'ci';
    row.style.animationDelay = Math.min(i * 30, 250) + 'ms';
    row.innerHTML =
      `${img(h, c.id, 'ci-ava', c.name)}
       <div class="ci-meta"><div class="ci-name"></div><div class="ci-sub"></div></div>
       <button class="ci-x">${svg('close')}</button>`;
    row.querySelector('.ci-name').textContent = c.name;
    row.querySelector('.ci-sub').textContent = c.hero;
    row.querySelector('.ci-x').onclick = () => {
      row.classList.add('out'); buzz('warn');
      setTimeout(() => {
        delete CART[c.id];
        saveCart(); renderStats(); renderCart(); renderAlpha();
      }, 260);
    };
    frag.appendChild(row);
  });
  box.replaceChildren(frag);
  bindImgs(box);
}

/* ════════════ TÌM KIẾM ════════════ */

function search(raw) {
  const box = $('results'), grid = $('alpha');
  const q = noAccent(raw.trim()).toLowerCase();
  if (q.length < 2) { box.hidden = true; grid.hidden = false; return; }
  grid.hidden = true; box.hidden = false;

  const hits = [];
  outer:
  for (const h of DATA.heroes) {
    if (noAccent(h.n).toLowerCase().includes(q)) hits.push({ h });
    for (const [sid, sname] of h.s) {
      if (noAccent(sname).toLowerCase().includes(q) || sid.includes(q)) hits.push({ h, sid, sname });
      if (hits.length >= 40) break outer;
    }
  }

  if (!hits.length) {
    box.innerHTML = `<div class="empty">${svg('search')}<p>Không tìm thấy.</p></div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  hits.forEach((x) => {
    const row = document.createElement('button');
    row.className = 'hero-row';
    row.innerHTML =
      `${img(x.h, x.sid || null, 'hr-ava', x.sname || x.h.n)}
       <span class="hr-meta"><span class="hr-name"></span><span class="hr-sub"></span></span>
       <span class="hr-chev">${svg('back')}</span>`;
    row.querySelector('.hr-name').textContent = x.sname || x.h.n;
    row.querySelector('.hr-sub').textContent = x.sname ? x.h.n : `${x.h.s.length} skin`;
    row.onclick = () => {
      buzz();
      $('q').value = ''; $('qx').hidden = true; search('');
      openLetter(x.h.l); openHero(x.h);
    };
    frag.appendChild(row);
  });
  box.replaceChildren(frag);
  bindImgs(box);
}

/* ════════════ GỬI VỀ BOT ════════════ */

function runMod() {
  const ids = Object.keys(CART);
  if (!ids.length) { toast('Chưa chọn skin nào!', 'err'); buzz('err'); return; }
  if (ids.length > MAX_PICK) { toast(`Tối đa ${MAX_PICK} skin!`, 'err'); buzz('err'); return; }

  if (!tg || typeof tg.sendData !== 'function') {
    toast('Hãy mở app từ trong Telegram', 'err', 3500);
    return;
  }

  /*
   * QUAN TRỌNG — sendData CHỈ chạy khi app mở bằng NÚT DƯỚI BÀN PHÍM.
   * Mở bằng menu ☰ hoặc link trực tiếp thì sendData im lặng không làm gì,
   * người dùng bấm mãi mà bot không nhận được skin nào.
   *
   * Dấu hiệu nhận biết: mở bằng nút bàn phím thì initData RỖNG.
   * Có initData => mở sai cách => cảnh báo ngay.
   */
  const hasInitData = !!(tg.initData && tg.initData.length > 0);
  if (hasInitData) {
    alertWrongLaunch();
    return;
  }

  buzz('ok');
  $('launch').classList.add('on');
  paintIcons($('launch'));

  try {
    tg.sendData(JSON.stringify({
      type: 'build', ids,
      names: Object.values(CART).map((c) => `${c.hero} — ${c.name}`),
      ts: Date.now(),
    }));
    $('launchTx').textContent = 'ĐÃ GỬI · ĐANG ĐÓNG…';
    setTimeout(() => tg.close(), 500);
  } catch (e) {
    $('launch').classList.remove('on');
    toast('Không gửi được: ' + e.message, 'err', 4000);
  }
}

function alertWrongLaunch() {
  buzz('err');
  const msg =
    'Bạn đang mở giao diện SAI CÁCH nên không gửi được về bot.\n\n' +
    'Hãy đóng giao diện này, quay lại chat với bot và bấm nút ' +
    '"🎨 CHỌN SKIN" NGAY DƯỚI BÀN PHÍM.\n\n' +
    'Không thấy nút thì gõ /webapp cho bot.\n\n' +
    '(Skin đã chọn vẫn được giữ nguyên.)';
  try {
    tg.showAlert ? tg.showAlert(msg) : alert(msg);
  } catch (e) {
    alert(msg);
  }
  toast('Mở bằng nút dưới bàn phím nhé!', 'err', 5000);
}

/* ════════════ ĐIỀU HƯỚNG ════════════ */

function showTab(n) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  $('p-' + n).classList.add('active');
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === n));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  syncBack();
}

function backAlpha() {
  $('paneHeroes').hidden = true; $('paneSkins').hidden = true;
  $('paneAlpha').hidden = false;
  renderAlpha(); syncBack();
}
function backHeroes() {
  $('paneSkins').hidden = true; $('paneHeroes').hidden = false;
  if (curLetter) openLetter(curLetter);
  syncBack();
}
function syncBack() {
  if (!tg?.BackButton) return;
  const deep = !$('paneHeroes').hidden || !$('paneSkins').hidden;
  deep ? tg.BackButton.show() : tg.BackButton.hide();
}

/* ════════════ THÔNG TIN NGƯỜI DÙNG ════════════
   initDataUnsafe RỖNG khi app mở bằng nút bàn phím, và photo_url chỉ có
   khi mở từ attachment menu. Nên bot còn nhét thêm thông tin vào URL
   (?uid=&nm=&un=&pr=) làm nguồn dự phòng.
   ══════════════════════════════════════════════ */

function readUser() {
  const u = tg?.initDataUnsafe?.user;
  if (u && u.id) return { ...u, _src: 'initData' };

  const q = new URLSearchParams(location.search);
  if (q.get('uid')) {
    return {
      id: q.get('uid'),
      first_name: q.get('nm') || '',
      username: q.get('un') || '',
      is_premium: q.get('pr') === '1',
      language_code: q.get('lc') || '',
      _src: 'url',
    };
  }
  return null;
}

function renderUser() {
  const u = readUser();
  const tags = $('uTags');
  const ava  = $('ava');
  tags.replaceChildren();

  if (!u) {
    $('uName').textContent = 'KHÁCH';
    ava.innerHTML = svg('user');
    ava.style.color = 'var(--tx-dim)';
    $('avaDot').classList.add('off');
    const t = document.createElement('span');
    t.className = 'tag warn'; t.textContent = 'MỞ TỪ TELEGRAM';
    tags.appendChild(t);
    $('accInfo').textContent = 'Chưa nhận được dữ liệu Telegram';
    return;
  }

  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Người dùng';
  $('uName').textContent = name.toUpperCase();
  $('avaDot').classList.remove('off');

  // photo_url chỉ có khi mở từ attachment menu -> còn lại dùng avatar sinh sẵn
  const src = u.photo_url || placeholderFor('u' + u.id, name);
  ava.innerHTML = `<img alt="" decoding="async" referrerpolicy="no-referrer" src="${src}">`;
  if (u.photo_url) {
    ava.querySelector('img').onerror = function () {
      this.src = placeholderFor('u' + u.id, name);
    };
  }

  const add = (tx, cls = '') => {
    const s = document.createElement('span');
    s.className = 'tag ' + cls; s.textContent = tx;
    tags.appendChild(s);
  };
  add('ID ' + u.id);
  if (u.username) add('@' + u.username, 'at');
  if (u.is_premium) add('PREMIUM', 'prem');
  if (u.language_code) add(String(u.language_code).toUpperCase(), 'lang');

  $('accInfo').textContent =
    `${name}${u.username ? ' · @' + u.username : ''} · ID ${u.id} · nguồn: ${u._src}`;
}

/* ════════════ KHỞI ĐỘNG ════════════ */

async function init() {
  try {
    tg?.ready(); tg?.expand();
    tg?.setHeaderColor?.('#04060e');
    tg?.setBackgroundColor?.('#04060e');
    tg?.disableVerticalSwipes?.();
  } catch (e) {}

  paintIcons();
  renderUser();

  try { CART = JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {}; } catch (e) { CART = {}; }

  try {
    await loadAll();
  } catch (e) {
    $('skel').hidden = true;
    $('alpha').innerHTML =
      `<div class="empty" style="grid-column:1/-1">${svg('box')}
       <p>Không tải được <b>catalog.json</b>.<br>Chạy <code>build_catalog.py</code> rồi push lên Pages.</p></div>`;
    toast(e.message, 'err', 5000);
    return;
  }

  // dọn skin không còn tồn tại + cắt xuống đúng giới hạn
  const valid = new Set();
  DATA.heroes.forEach((h) => h.s.forEach(([s]) => valid.add(s)));
  let gone = 0;
  Object.keys(CART).forEach((s) => { if (!valid.has(s)) { delete CART[s]; gone++; } });

  let cut = 0;
  const keys = Object.keys(CART);
  if (keys.length > MAX_PICK) {
    keys.slice(MAX_PICK).forEach((s) => { delete CART[s]; cut++; });
  }
  if (gone || cut) saveCart();
  if (gone) toast(`Đã gỡ ${gone} skin cũ`, 'warn', 3200);
  if (cut) toast(`Giữ lại ${MAX_PICK} skin đầu (giới hạn mới)`, 'warn', 3600);

  $('verInfo').textContent = DATA.v ? new Date(DATA.v * 1000).toLocaleString('vi-VN') : '—';
  $('cacheInfo').textContent = `${Object.keys(IMGC).length} ảnh đã ghi nhớ · chạm để xoá`;

  renderStats(); renderAlpha(); renderCart(); paintIcons();

  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => { buzz(); showTab(t.dataset.tab); };
  });
  $('backAlpha').onclick  = () => { buzz(); backAlpha(); };
  $('backHeroes').onclick = () => { buzz(); backHeroes(); };
  $('btnRun').onclick     = runMod;
  $('btnClear').onclick   = () => {
    if (!nCart()) return;
    CART = {}; saveCart(); renderStats(); renderCart(); renderAlpha();
    buzz('warn'); toast('Đã xoá tất cả', 'warn');
  };

  const q = $('q');
  let t = null;
  q.oninput = () => {
    $('qx').hidden = !q.value;
    clearTimeout(t);
    t = setTimeout(() => search(q.value), 160);
  };
  $('qx').onclick = () => { q.value = ''; $('qx').hidden = true; search(''); };

  const sw = () => $('swHaptic').classList.toggle('on', haptic);
  sw();
  $('cHaptic').onclick = () => {
    haptic = !haptic;
    localStorage.setItem(HAPTIC_KEY, haptic ? '1' : '0');
    sw(); buzz(); toast('Haptic: ' + (haptic ? 'BẬT' : 'TẮT'), 'info');
  };

  $('cCache').onclick = () => {
    IMGC = {};
    try { localStorage.removeItem(IMGC_KEY); } catch (e) {}
    $('cacheInfo').textContent = '0 ảnh đã ghi nhớ · chạm để xoá';
    buzz('warn'); toast('Đã xoá bộ nhớ đệm ảnh', 'warn');
  };

  tg?.BackButton?.onClick?.(() => {
    if (!$('paneSkins').hidden) backHeroes();
    else if (!$('paneHeroes').hidden) backAlpha();
  });
  syncBack();
}

init();

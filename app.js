/* ═══════════════════════════════════════════════════════════
   TUMADAM — Mini App chọn skin  ·  v2
   ═══════════════════════════════════════════════════════════ */
'use strict';

const tg = window.Telegram?.WebApp;
const $  = (id) => document.getElementById(id);
const CART_KEY   = 'tumadam_cart_v1';
const HAPTIC_KEY = 'tumadam_haptic';

let DATA   = { heroes: [], letters: [], v: 0 };
let ICONS  = {};            // hero_icons.json — nguồn chuẩn cho prefix ảnh
let CART   = {};            // { skinId: {id, name, hero, heroId} }
let curLetter = null, curHero = null;
let haptic = localStorage.getItem(HAPTIC_KEY) !== '0';

/* ═══════════════ BỘ ICON SVG ═══════════════ */
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
  check: P('M5 12.6 9.6 17 19 7.5', 2.2),
  close: P('M6.5 6.5l11 11M17.5 6.5l-11 11', 2),
  user:  '<circle cx="12" cy="8.4" r="3.6" stroke="currentColor" stroke-width="1.7" fill="none"/>' +
         P('M4.6 20a7.6 7.6 0 0 1 14.8 0', 1.7),
  shield:P('M12 3.4l7 2.8v5.1c0 4.2-2.9 7.7-7 9.3-4.1-1.6-7-5.1-7-9.3V6.2l7-2.8z', 1.6) + P('M9 12.2l2.1 2.1L15.3 10', 1.8),
  db:    '<ellipse cx="12" cy="6.4" rx="7" ry="2.9" stroke="currentColor" stroke-width="1.6" fill="none"/>' +
         P('M5 6.4v11.2c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V6.4M5 12c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9', 1.6),
  wave:  P('M3 12c1.6-3.4 3.2-3.4 4.8 0s3.2 3.4 4.8 0 3.2-3.4 4.8 0 3.2 3.4 4.8 0', 1.7),
  spark: P('M12 4l1.5 4.3L18 9.8l-4.5 1.5L12 15.6l-1.5-4.3L6 9.8l4.5-1.5L12 4z', 1.5) +
         P('M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z', 1.4),
  empty: P('M4.5 8.5 12 4l7.5 4.5v7L12 20l-7.5-4.5v-7z', 1.6) + P('M4.5 8.5 12 13l7.5-4.5M12 13v7', 1.6),
};

/** <span data-ic="hero"> -> nhét SVG vào. Gọi lại sau mỗi lần render. */
function paintIcons(root = document) {
  root.querySelectorAll('[data-ic]').forEach((el) => {
    const name = el.dataset.ic;
    if (!ICON[name] || el.dataset.icDone === '1') return;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${ICON[name]}</svg>`;
    el.dataset.icDone = '1';
  });
}
const svg = (name, cls = '') =>
  `<span class="ic ${cls}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${ICON[name] || ''}</svg></span>`;

/* ═══════════════ TIỆN ÍCH ═══════════════ */

function buzz(style = 'light') {
  if (!haptic) return;
  try {
    const h = tg?.HapticFeedback;
    if (style === 'ok')        h?.notificationOccurred('success');
    else if (style === 'err')  h?.notificationOccurred('error');
    else if (style === 'warn') h?.notificationOccurred('warning');
    else                       h?.impactOccurred(style);
  } catch (e) {}
}

function toast(msg, kind = 'info', ms = 2100) {
  const stack = $('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast-item ${kind}`;
  const ic = { success: 'check', error: 'close', warn: 'spark', info: 'spark' }[kind];
  el.innerHTML = `<span class="toast-ic">${svg(ic)}</span><span class="toast-tx"></span>`;
  el.querySelector('.toast-tx').textContent = msg;
  el.onclick = () => el.remove();
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
}

/** Bỏ dấu tiếng Việt nhưng GIỮ Đ riêng — khớp skin_db.py phía bot. */
function noAccent(s) {
  return (s || '').replace(/Đ/g, '\u0001').replace(/đ/g, '\u0001')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'Đ');
}

const saveCart  = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(CART)); } catch (e) {} };
const loadCart  = () => { try { CART = JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {}; } catch (e) { CART = {}; } };
const cartCount = () => Object.keys(CART).length;

/* ═══════════════ ICON CDN ═══════════════ */
/*
 * Nguồn prefix: hero_icons.json (chuẩn) -> fallback 3 số đầu skin ID.
 * Có tướng lệch giữa 2 nguồn (vd Moren: skin 797xx nhưng icon prefix 170),
 * nên hero_icons.json luôn được ưu tiên.
 *
 *   Hero  : {cdn}{prefix}0.jpg          → 301500.jpg
 *   Skin  : {cdn}{prefix}{n}head.jpg    → 301509head.jpg   (n = 2 số cuối ID)
 */
let ICON_BASE = 'https://dl.ops.kgvn.garenanow.com/hok/VN/HeroHeadPath/';
let ICON_CDN  = '30';
const ICON_FALLBACK = () => ICON_BASE + '301140.jpg';   // Omega — luôn có

function prefixOf(hero) {
  const info = ICONS[hero.o || hero.n];
  // Chỉ tin hero_icons khi prefix của nó KHỚP prefix thật lấy từ skin ID.
  // Có tướng trùng tên nhưng khác prefix (Moren 170 / 797) — tra theo tên
  // sẽ ra nhầm, nên prefix từ chính skin ID mới là chuẩn cuối cùng.
  if (info && info.prefix && (!hero.i || info.prefix === hero.i)) return info.prefix;
  return hero.i || (info && info.prefix) || '';
}

function iconUrl(hero, skinId) {
  const prefix = prefixOf(hero);
  if (!prefix) return ICON_FALLBACK();
  const info = ICONS[hero.o || hero.n];
  const cdn = (info && info.cdn_id) || ICON_CDN;
  let variant = 0;
  if (skinId) {
    const n = parseInt(String(skinId).slice(-2), 10);   // 15009→9 · 13019→19
    if (!Number.isNaN(n)) variant = n;
  }
  const id = `${cdn}${prefix}${variant}`;
  return variant <= 0 ? `${ICON_BASE}${id}.jpg` : `${ICON_BASE}${id}head.jpg`;
}

/* Ảnh lỗi → thử biến thể khác → cuối cùng ảnh mặc định. */
window.__iconFb = function (el) {
  if (!el || el.dataset.done === '1') return;
  const src = String(el.src || '');
  if (!el.dataset.step && /head\.jpg$/i.test(src)) {
    el.dataset.step = '1'; el.src = src.replace(/head\.jpg$/i, '.jpg'); return;
  }
  if (!el.dataset.step && /\d+\.jpg$/i.test(src)) {
    el.dataset.step = '1'; el.src = src.replace(/\.jpg$/i, 'head.jpg'); return;
  }
  el.dataset.done = '1';
  el.src = ICON_FALLBACK();
};

const iconImg = (hero, skinId, cls) =>
  `<img class="${cls}" src="${iconUrl(hero, skinId)}" alt="" loading="lazy" ` +
  `decoding="async" referrerpolicy="no-referrer" onerror="__iconFb(this)">`;

/* ═══════════════ NẠP DỮ LIỆU ═══════════════ */

async function loadJson(name) {
  const res = await fetch(`${name}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

async function loadAll() {
  DATA = await loadJson('catalog.json');
  DATA.heroes.forEach((h, i) => { h._i = i; });

  try {
    const raw = await loadJson('hero_icons.json');
    ICON_BASE = raw._cdn_base || ICON_BASE;
    ICON_CDN  = raw._cdn_id || ICON_CDN;
    Object.entries(raw).forEach(([k, v]) => { if (!k.startsWith('_')) ICONS[k] = v; });
  } catch (e) {
    console.warn('hero_icons.json lỗi, dùng prefix từ skin ID:', e.message);
  }
}

const heroesOf = (letter) => DATA.heroes.filter((h) => h.l === letter);
const pickedOf = (hero) => Object.values(CART).find((c) => c.heroId === hero.i);

/* ═══════════════ RENDER ═══════════════ */

function renderStats() {
  $('stHeroes').textContent = DATA.heroes.length;
  $('stSkins').textContent  = DATA.heroes.reduce((a, h) => a + h.s.length, 0);
  $('stCart').textContent   = cartCount();
  const b = $('cartBadge');
  b.textContent = cartCount() || '';
  cartCount() ? b.removeAttribute('data-zero') : b.setAttribute('data-zero', '');
}

function renderAlpha() {
  const counts = {};
  Object.values(CART).forEach((c) => {
    const h = DATA.heroes.find((x) => x.i === c.heroId);
    if (h) counts[h.l] = (counts[h.l] || 0) + 1;
  });

  const grid = $('alphaGrid');
  grid.innerHTML = '';
  DATA.letters.forEach((L) => {
    const cell = document.createElement('button');
    cell.className = 'alpha-cell' + (counts[L] ? ' has-pick' : '');
    cell.innerHTML =
      `<span class="ac-letter">${L}</span>` +
      `<span class="ac-count">${heroesOf(L).length}</span>` +
      (counts[L] ? `<span class="ac-badge">${counts[L]}</span>` : '');
    cell.onclick = () => { buzz(); openLetter(L); };
    grid.appendChild(cell);
  });
  $('alphaSkel').hidden = true;
}

function openLetter(L) {
  curLetter = L;
  $('alphaPane').hidden = true;
  $('skinListPane').hidden = true;
  $('heroListPane').hidden = false;
  $('heroListTitle').textContent = `Chữ cái ${L}`;

  const list = heroesOf(L);
  $('heroListSub').textContent = `${list.length} tướng`;

  const grid = $('heroGrid');
  grid.innerHTML = '';
  list.forEach((h) => {
    const picked = pickedOf(h);
    const cell = document.createElement('button');
    cell.className = 'hero-cell' + (picked ? ' has-skin' : '');
    cell.innerHTML =
      `<div class="hc-ava-wrap">${iconImg(h, picked ? picked.id : null, 'hc-icon')}</div>
       <div class="hc-meta">
         <span class="hc-name"></span>
         <span class="hc-skins"></span>
       </div>
       <span class="hc-chev">${svg('back', 'flip')}</span>`;
    cell.querySelector('.hc-name').textContent = h.n;
    cell.querySelector('.hc-skins').textContent =
      picked ? `Đang chọn · ${picked.name}` : `${h.s.length} skin`;
    cell.onclick = () => { buzz(); openHero(h); };
    grid.appendChild(cell);
  });
  syncBackButton();
}

function openHero(h) {
  curHero = h;
  $('heroListPane').hidden = true;
  $('skinListPane').hidden = false;

  const picked = pickedOf(h);
  const banner = $('heroBanner');
  banner.innerHTML =
    `<div class="hb-glow"></div>
     ${iconImg(h, picked ? picked.id : null, 'hb-ava')}
     <div class="hb-meta">
       <h2 class="hb-name"></h2>
       <p class="hb-sub"></p>
     </div>`;
  banner.querySelector('.hb-name').textContent = h.n;
  banner.querySelector('.hb-sub').textContent =
    picked ? `Đang chọn: ${picked.name}` : `${h.s.length} skin · chạm để chọn`;

  const grid = $('skinGrid');
  grid.innerHTML = '';
  h.s.forEach(([sid, sname]) => {
    const cell = document.createElement('button');
    cell.className = 'skin-icon-cell' + (CART[sid] ? ' selected' : '');
    cell.innerHTML =
      `<div class="sic-img">${iconImg(h, sid, 'sic-icon')}<span class="sic-tick">${svg('check')}</span></div>
       <span class="sic-name"></span>`;
    cell.querySelector('.sic-name').textContent = sname;
    cell.onclick = () => toggleSkin(h, sid, sname);
    grid.appendChild(cell);
  });
  syncBackButton();
}

function toggleSkin(h, sid, sname) {
  if (CART[sid]) {
    delete CART[sid];
    buzz('warn'); toast(`Bỏ chọn ${sname}`, 'warn');
  } else {
    const old = Object.entries(CART).find(([, c]) => c.heroId === h.i);
    if (old) delete CART[old[0]];
    CART[sid] = { id: sid, name: sname, hero: h.n, heroId: h.i };
    buzz('ok'); toast(old ? `Đổi sang ${sname}` : `Đã thêm ${sname}`, 'success');
  }
  saveCart(); renderStats(); renderCart(); openHero(h);
}

function renderCart() {
  const list  = $('cartList');
  const items = Object.values(CART);
  $('cartActions').hidden = !items.length;
  $('cartSub').textContent = items.length
    ? `${items.length} skin · mỗi tướng 1 skin`
    : 'Mỗi tướng chọn 1 skin';

  if (!items.length) {
    list.innerHTML =
      `<div class="empty"><div class="empty-icon ei-svg">${svg('empty')}</div>
       <p>Chưa chọn skin nào.<br>Qua tab <b>Tướng</b> để bắt đầu.</p></div>`;
    return;
  }

  list.innerHTML = '';
  items.forEach((c) => {
    const hero = DATA.heroes.find((x) => x.i === c.heroId) || { n: c.hero, i: c.heroId };
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML =
      `${iconImg(hero, c.id, 'cart-avatar')}
       <div class="ci-meta">
         <div class="cart-name"></div>
         <div class="cart-source"></div>
       </div>
       <button class="cart-del" aria-label="Xoá">${svg('close')}</button>`;
    row.querySelector('.cart-name').textContent = c.name;
    row.querySelector('.cart-source').textContent = c.hero;
    row.querySelector('.cart-del').onclick = () => {
      row.classList.add('removing'); buzz('warn');
      setTimeout(() => {
        delete CART[c.id];
        saveCart(); renderStats(); renderCart(); renderAlpha();
      }, 260);
    };
    list.appendChild(row);
  });
}

/* ═══════════════ TÌM KIẾM ═══════════════ */

function doSearch(qRaw) {
  const box  = $('heroSearchResults');
  const grid = $('alphaGrid');
  const q = noAccent(qRaw.trim()).toLowerCase();

  if (q.length < 2) { box.hidden = true; grid.hidden = false; return; }
  grid.hidden = true; box.hidden = false;

  const hits = [];
  outer:
  for (const h of DATA.heroes) {
    if (noAccent(h.n).toLowerCase().includes(q)) hits.push({ h });
    for (const [sid, sname] of h.s) {
      if (noAccent(sname).toLowerCase().includes(q) || sid.includes(q)) {
        hits.push({ h, sid, sname });
      }
      if (hits.length > 60) break outer;
    }
  }

  if (!hits.length) {
    box.innerHTML = `<div class="empty"><div class="empty-icon ei-svg">${svg('search')}</div><p>Không tìm thấy.</p></div>`;
    return;
  }

  box.innerHTML = '';
  hits.slice(0, 60).forEach((hit) => {
    const row = document.createElement('div');
    row.className = 'search-row';
    row.innerHTML =
      `${iconImg(hit.h, hit.sid || null, 'sr-icon')}
       <div class="sr-meta"><div class="sr-name"></div><div class="sr-hero"></div></div>
       <span class="chevron">${svg('back', 'flip')}</span>`;
    row.querySelector('.sr-name').textContent = hit.sname || hit.h.n;
    row.querySelector('.sr-hero').textContent =
      hit.sname ? hit.h.n : `Tướng · ${hit.h.s.length} skin`;
    row.onclick = () => {
      buzz();
      $('heroSearch').value = ''; $('heroSearchClr').hidden = true; doSearch('');
      openLetter(hit.h.l); openHero(hit.h);
    };
    box.appendChild(row);
  });
}

/* ═══════════════ GỬI VỀ BOT ═══════════════ */

function runMod() {
  const ids = Object.keys(CART);
  if (!ids.length) { toast('Chưa chọn skin nào!', 'error'); buzz('err'); return; }

  const payload = {
    type: 'build',
    ids,
    names: Object.values(CART).map((c) => `${c.hero} — ${c.name}`),
    ts: Date.now(),
  };

  buzz('ok');
  try {
    // sendData CHỈ hoạt động khi app mở qua Menu Button / Reply Keyboard Button.
    tg.sendData(JSON.stringify(payload));
    toast('Đã gửi cho bot…', 'success');
    setTimeout(() => tg.close(), 400);
  } catch (e) {
    toast('Không gửi được: ' + e.message, 'error', 4000);
  }
}

/* ═══════════════ ĐIỀU HƯỚNG ═══════════════ */

function showTab(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  $('page-' + name).classList.add('active');
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.tab === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  syncBackButton();
}

function backToAlpha() {
  $('heroListPane').hidden = true;
  $('skinListPane').hidden = true;
  $('alphaPane').hidden = false;
  renderAlpha(); syncBackButton();
}

function backToHeroes() {
  $('skinListPane').hidden = true;
  $('heroListPane').hidden = false;
  if (curLetter) openLetter(curLetter);
  syncBackButton();
}

function syncBackButton() {
  if (!tg?.BackButton) return;
  const deep = !$('heroListPane').hidden || !$('skinListPane').hidden;
  deep ? tg.BackButton.show() : tg.BackButton.hide();
}

/* ═══════════════ THÔNG TIN TELEGRAM ═══════════════ */

function renderUser() {
  const u = tg?.initDataUnsafe?.user;
  const tags = $('userTags');
  const av   = $('avatar');
  tags.innerHTML = '';

  if (!u) {
    $('userName').textContent = 'Chưa đăng nhập';
    av.innerHTML = svg('user');
    av.classList.add('ph');
    tags.innerHTML = `<span class="utag warn">Mở từ Telegram để đồng bộ</span>`;
    $('infoAcc').textContent = 'Chưa có dữ liệu Telegram';
    $('avaStatus').classList.add('off');
    return;
  }

  const full = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Người dùng';
  $('userName').textContent = full;

  if (u.photo_url) {
    av.style.backgroundImage = `url("${u.photo_url}")`;
    av.classList.add('has-photo');
  } else {
    av.textContent = full.trim()[0].toUpperCase();
  }

  const add = (txt, cls = '') => {
    const s = document.createElement('span');
    s.className = 'utag ' + cls;
    s.textContent = txt;
    tags.appendChild(s);
  };
  add('ID ' + u.id, 'id');
  if (u.username) add('@' + u.username, 'at');
  if (u.is_premium) add('PREMIUM', 'prem');
  if (u.language_code) add(u.language_code.toUpperCase(), 'lang');

  $('infoAcc').textContent =
    `${full}${u.username ? ' · @' + u.username : ''} · ID ${u.id}`;
}

/* ═══════════════ KHỞI ĐỘNG ═══════════════ */

async function init() {
  try {
    tg?.ready(); tg?.expand();
    tg?.setHeaderColor?.('#07080d');
    tg?.disableVerticalSwipes?.();
    if (tg?.colorScheme === 'light') document.body.classList.add('tg-light');
  } catch (e) {}

  paintIcons();
  renderUser();
  loadCart();

  try {
    await loadAll();
  } catch (e) {
    $('alphaSkel').hidden = true;
    $('alphaGrid').innerHTML =
      `<div class="empty" style="grid-column:1/-1"><div class="empty-icon ei-svg">${svg('empty')}</div>
       <p>Không tải được <b>catalog.json</b>.<br>Chạy <code>build_catalog.py</code> rồi push lên Pages.</p></div>`;
    toast(e.message, 'error', 5000);
    return;
  }

  // Bỏ skin không còn tồn tại sau khi game update
  const valid = new Set();
  DATA.heroes.forEach((h) => h.s.forEach(([sid]) => valid.add(sid)));
  let dropped = 0;
  Object.keys(CART).forEach((sid) => { if (!valid.has(sid)) { delete CART[sid]; dropped++; } });
  if (dropped) { saveCart(); toast(`Đã gỡ ${dropped} skin cũ`, 'warn', 3500); }

  $('infoVer').textContent = DATA.v
    ? new Date(DATA.v * 1000).toLocaleString('vi-VN')
    : '—';

  renderStats(); renderAlpha(); renderCart(); paintIcons();

  /* sự kiện */
  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => { buzz(); showTab(t.dataset.tab); };
  });
  $('heroBack').onclick = () => { buzz(); backToAlpha(); };
  $('skinBack').onclick = () => { buzz(); backToHeroes(); };
  $('btnRun').onclick   = runMod;
  $('btnClear').onclick = () => {
    if (!cartCount()) return;
    CART = {}; saveCart(); renderStats(); renderCart(); renderAlpha();
    buzz('warn'); toast('Đã xoá tất cả', 'warn');
  };

  const si = $('heroSearch');
  let t = null;
  si.oninput = () => {
    $('heroSearchClr').hidden = !si.value;
    clearTimeout(t);
    t = setTimeout(() => doSearch(si.value), 170);
  };
  $('heroSearchClr').onclick = () => {
    si.value = ''; $('heroSearchClr').hidden = true; doSearch('');
  };

  const setToggle = () => $('hapticToggle').classList.toggle('on', haptic);
  setToggle();
  $('cardHaptic').onclick = () => {
    haptic = !haptic;
    localStorage.setItem(HAPTIC_KEY, haptic ? '1' : '0');
    setToggle(); buzz();
    toast('Haptic: ' + (haptic ? 'Bật' : 'Tắt'), 'info');
  };

  tg?.BackButton?.onClick?.(() => {
    if (!$('skinListPane').hidden) backToHeroes();
    else if (!$('heroListPane').hidden) backToAlpha();
  });

  syncBackButton();
}

init();

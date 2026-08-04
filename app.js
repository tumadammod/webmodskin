/* ═══════════════════════════════════════════════════════════
   TUMADAM — Mini App chọn skin
   Gửi về bot qua Telegram.WebApp.sendData()
   ═══════════════════════════════════════════════════════════ */
'use strict';

const tg = window.Telegram?.WebApp;
const $  = (id) => document.getElementById(id);
const CART_KEY = 'tumadam_cart_v1';
const HAPTIC_KEY = 'tumadam_haptic';

let DATA = { heroes: [], letters: [], v: 0 };
let CART = {};              // { skinId: {id, name, hero, heroId} }
let curLetter = null;
let curHero = null;
let haptic = localStorage.getItem(HAPTIC_KEY) !== '0';

/* ───────────── tiện ích ───────────── */

function buzz(style = 'light') {
  if (!haptic) return;
  try {
    const h = tg?.HapticFeedback;
    if (style === 'ok') h?.notificationOccurred('success');
    else if (style === 'err') h?.notificationOccurred('error');
    else if (style === 'warn') h?.notificationOccurred('warning');
    else h?.impactOccurred(style);
  } catch (e) { /* SDK cũ, bỏ qua */ }
}

function toast(msg, kind = 'info', ms = 2200) {
  const stack = $('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast-item ${kind}`;
  const ic = { success: '✓', error: '!', warn: '!', info: 'i' }[kind] || 'i';
  el.innerHTML = `<span class="toast-ic">${ic}</span><span class="toast-tx"></span>`;
  el.querySelector('.toast-tx').textContent = msg;
  el.onclick = () => el.remove();
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, ms);
}

/** Bỏ dấu tiếng Việt nhưng GIỮ Đ riêng — khớp logic skin_db.py phía bot. */
function noAccent(s) {
  return (s || '')
    .replace(/Đ/g, '\u0001').replace(/đ/g, '\u0001')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'Đ');
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(CART)); } catch (e) {}
}

function loadCart() {
  try { CART = JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {}; }
  catch (e) { CART = {}; }
}

const cartCount = () => Object.keys(CART).length;

/* ───────────── icon CDN Garena KGVN ───────────── */
/*
 * Hero mặc định : {cdn}{prefix}0.jpg        → 301500.jpg
 * Skin variant n: {cdn}{prefix}{n}head.jpg  → 301509head.jpg
 * n = phần đuôi của skin ID sau 3 số prefix (15009 → 9, 13019 → 19)
 */
const ICON_BASE = 'https://dl.ops.kgvn.garenanow.com/hok/VN/HeroHeadPath/';
const ICON_CDN = '30';
const ICON_FALLBACK = ICON_BASE + '301140.jpg';   // Omega — luôn tồn tại

function iconUrl(prefix, skinId) {
  if (!prefix) return ICON_FALLBACK;
  let variant = 0;
  if (skinId) {
    const n = parseInt(String(skinId).slice(prefix.length), 10);
    if (!Number.isNaN(n)) variant = n;
  }
  const id = `${ICON_CDN}${prefix}${variant}`;
  return variant <= 0 ? `${ICON_BASE}${id}.jpg` : `${ICON_BASE}${id}head.jpg`;
}

/* Ảnh lỗi -> thử biến thể khác -> cuối cùng dùng ảnh mặc định.
   Gắn vào window vì onerror trong HTML inline gọi tới. */
window.__iconFb = function (el) {
  if (!el || el.dataset.done === '1') return;
  const src = String(el.src || '');
  if (!el.dataset.step && /head\.jpg$/i.test(src)) {
    el.dataset.step = '1';
    el.src = src.replace(/head\.jpg$/i, '.jpg');
    return;
  }
  if (!el.dataset.step && /\d+\.jpg$/i.test(src)) {
    el.dataset.step = '1';
    el.src = src.replace(/\.jpg$/i, 'head.jpg');
    return;
  }
  el.dataset.done = '1';
  el.src = ICON_FALLBACK;
};

function iconImg(prefix, skinId, cls) {
  return `<img class="${cls}" src="${iconUrl(prefix, skinId)}" alt="" `
       + `loading="lazy" decoding="async" referrerpolicy="no-referrer" `
       + `onerror="__iconFb(this)">`;
}

/* ───────────── nạp dữ liệu ───────────── */

async function loadCatalog() {
  const res = await fetch('catalog.json?t=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  DATA = await res.json();
  DATA.heroes.forEach((h, i) => { h._i = i; });
}

function heroesOf(letter) {
  return DATA.heroes.filter((h) => h.l === letter);
}

/* ───────────── render ───────────── */

function renderStats() {
  $('stHeroes').textContent = DATA.heroes.length;
  $('stSkins').textContent = DATA.heroes.reduce((a, h) => a + h.s.length, 0);
  $('stCart').textContent = cartCount();

  const b = $('cartBadge');
  b.textContent = cartCount() || '';
  if (cartCount()) b.removeAttribute('data-zero');
  else b.setAttribute('data-zero', '');
}

function renderAlpha() {
  const grid = $('alphaGrid');
  const pickedLetters = {};
  Object.values(CART).forEach((c) => {
    const h = DATA.heroes.find((x) => x.i === c.heroId);
    if (h) pickedLetters[h.l] = (pickedLetters[h.l] || 0) + 1;
  });

  grid.innerHTML = '';
  DATA.letters.forEach((L) => {
    const n = heroesOf(L).length;
    const cell = document.createElement('button');
    cell.className = 'alpha-cell' + (pickedLetters[L] ? ' has-pick' : '');
    cell.innerHTML =
      `<span class="ac-letter">${L}</span>` +
      `<span class="ac-count">${n}</span>` +
      (pickedLetters[L] ? '<span class="ac-dot"></span>' : '');
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
    const picked = Object.values(CART).find((c) => c.heroId === h.i);
    const cell = document.createElement('button');
    cell.className = 'hero-cell' + (picked ? ' has-skin' : '');
    cell.innerHTML =
      `<div class="hc-ava-wrap">${iconImg(h.i, picked ? picked.id : null, 'hc-icon')}</div>
       <div class="hc-meta">
         <span class="hc-name"></span>
         <span class="hc-skins">${h.s.length} skin · <em class="hc-id">${h.i}</em></span>
       </div>
       <span class="hc-chev">›</span>`;
    cell.querySelector('.hc-name').textContent = h.n;
    cell.onclick = () => { buzz(); openHero(h); };
    grid.appendChild(cell);
  });
  syncBackButton();
}

function openHero(h) {
  curHero = h;
  $('heroListPane').hidden = true;
  $('skinListPane').hidden = false;
  $('skinListTitle').textContent = h.n;

  const picked = Object.values(CART).find((c) => c.heroId === h.i);
  $('skinListSub').textContent = picked
    ? `Đang chọn: ${picked.name} — bấm skin khác để đổi`
    : 'Bấm để thêm vào giỏ';

  const grid = $('skinGrid');
  grid.innerHTML = '';
  h.s.forEach(([sid, sname], idx) => {
    const cell = document.createElement('button');
    cell.className = 'skin-cell' + (CART[sid] ? ' selected' : '');
    cell.innerHTML =
      `${iconImg(h.i, sid, 'sk-icon')}
       <span class="sk-name"></span>
       <span class="sk-id">${sid}</span>
       <span class="sk-chev">${CART[sid] ? '✓' : '›'}</span>`;
    cell.querySelector('.sk-name').textContent = sname;
    cell.onclick = () => toggleSkin(h, sid, sname);
    grid.appendChild(cell);
  });
  syncBackButton();
}

function toggleSkin(h, sid, sname) {
  if (CART[sid]) {                       // bấm lại skin đang chọn -> bỏ chọn
    delete CART[sid];
    buzz('warn');
    toast(`Đã bỏ: ${sname}`, 'warn');
  } else {
    // Mỗi tướng chỉ 1 skin — tự thay skin cũ của cùng tướng.
    const old = Object.entries(CART).find(([, c]) => c.heroId === h.i);
    if (old) delete CART[old[0]];
    CART[sid] = { id: sid, name: sname, hero: h.n, heroId: h.i };
    buzz('ok');
    toast(old ? `Đã đổi sang: ${sname}` : `Đã thêm: ${sname}`, 'success');
  }
  saveCart();
  renderStats();
  renderCart();
  openHero(h);
}

function renderCart() {
  const list = $('cartList');
  const items = Object.values(CART);
  $('cartActions').hidden = items.length === 0;
  $('cartSub').textContent = items.length
    ? `${items.length} skin · mỗi tướng 1 skin`
    : 'Mỗi tướng chỉ chọn được 1 skin';

  if (!items.length) {
    list.innerHTML =
      `<div class="empty">
         <div class="empty-icon">🎨</div>
         <p>Chưa chọn skin nào.<br>Qua tab <b>Tướng</b> để bắt đầu.</p>
       </div>`;
    return;
  }

  list.innerHTML = '';
  items.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML =
      `${iconImg(c.heroId, c.id, 'cart-avatar')}
       <div>
         <div class="cart-name"></div>
         <div class="cart-source"></div>
       </div>
       <button class="cart-del" aria-label="Xoá">×</button>`;
    row.querySelector('.cart-name').textContent = c.name;
    row.querySelector('.cart-source').textContent = `${c.hero} · ID ${c.id}`;
    row.querySelector('.cart-del').onclick = () => {
      row.classList.add('removing');
      buzz('warn');
      setTimeout(() => {
        delete CART[c.id];
        saveCart(); renderStats(); renderCart(); renderAlpha();
      }, 260);
    };
    list.appendChild(row);
  });
}

/* ───────────── tìm kiếm ───────────── */

function doSearch(q) {
  const box = $('heroSearchResults');
  const grid = $('alphaGrid');
  q = noAccent(q.trim()).toLowerCase();

  if (q.length < 2) {
    box.hidden = true; grid.hidden = false;
    return;
  }
  grid.hidden = true; box.hidden = false;

  const hits = [];
  for (const h of DATA.heroes) {
    if (noAccent(h.n).toLowerCase().includes(q)) {
      hits.push({ type: 'hero', h });
    }
    for (const [sid, sname] of h.s) {
      if (noAccent(sname).toLowerCase().includes(q) || sid.includes(q)) {
        hits.push({ type: 'skin', h, sid, sname });
      }
    }
    if (hits.length > 60) break;
  }

  if (!hits.length) {
    box.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><p>Không tìm thấy.</p></div>`;
    return;
  }

  box.innerHTML = '';
  hits.slice(0, 60).forEach((hit) => {
    const row = document.createElement('div');
    row.className = 'search-row';
    const title = hit.type === 'hero' ? hit.h.n : hit.sname;
    const sub = hit.type === 'hero'
      ? `Tướng · ${hit.h.s.length} skin`
      : `${hit.h.n} · ID ${hit.sid}`;
    row.innerHTML = `${iconImg(hit.h.i, hit.type === 'skin' ? hit.sid : null, 'sr-icon')}`
      + `<div class="sr-meta"><div class="sr-name"></div><div class="sr-hero"></div></div>`
      + `<span class="chevron">›</span>`;
    row.querySelector('.sr-name').textContent = title;
    row.querySelector('.sr-hero').textContent = sub;
    row.onclick = () => {
      buzz();
      $('heroSearch').value = '';
      doSearch('');
      openLetter(hit.h.l);
      openHero(hit.h);
    };
    box.appendChild(row);
  });
}

/* ───────────── gửi về bot ───────────── */

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
    // sendData CHỈ hoạt động khi Mini App mở qua Menu Button hoặc
    // Reply Keyboard Button — không hoạt động với inline button.
    tg.sendData(JSON.stringify(payload));
    toast('Đã gửi cho bot…', 'success');
    setTimeout(() => tg.close(), 400);
  } catch (e) {
    toast('Không gửi được: ' + e.message, 'error');
  }
}

/* ───────────── điều hướng ───────────── */

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
  renderAlpha();
  syncBackButton();
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
  if (deep) tg.BackButton.show(); else tg.BackButton.hide();
}

/* ───────────── khởi động ───────────── */

async function init() {
  try {
    tg?.ready();
    tg?.expand();
    if (tg?.setHeaderColor) tg.setHeaderColor('#07080d');
    if (tg?.colorScheme === 'light') document.body.classList.add('tg-light');
  } catch (e) {}

  const u = tg?.initDataUnsafe?.user;
  if (u) {
    $('userName').textContent = [u.first_name, u.last_name].filter(Boolean).join(' ');
    $('userId').textContent = 'ID ' + u.id;
    const av = $('avatar');
    if (u.photo_url) {
      av.style.backgroundImage = `url(${u.photo_url})`;
      av.style.backgroundSize = 'cover';
    } else {
      av.textContent = (u.first_name || '?')[0].toUpperCase();
    }
  } else {
    $('userName').textContent = 'Khách';
    $('userId').textContent = 'Mở từ Telegram để đồng bộ';
  }

  loadCart();

  try {
    await loadCatalog();
  } catch (e) {
    $('alphaSkel').hidden = true;
    $('alphaGrid').innerHTML =
      `<div class="empty" style="grid-column:1/-1">
         <div class="empty-icon">⚠️</div>
         <p>Không tải được <b>catalog.json</b>.<br>
         Chạy <code>build_catalog.py</code> rồi push lên GitHub Pages.</p>
       </div>`;
    toast('Lỗi tải dữ liệu: ' + e.message, 'error', 4000);
    return;
  }

  // Bỏ khỏi giỏ các skin không còn tồn tại sau khi update game
  const valid = new Set();
  DATA.heroes.forEach((h) => h.s.forEach(([sid]) => valid.add(sid)));
  let dropped = 0;
  Object.keys(CART).forEach((sid) => {
    if (!valid.has(sid)) { delete CART[sid]; dropped++; }
  });
  if (dropped) { saveCart(); toast(`${dropped} skin cũ đã bị gỡ (game đã update)`, 'warn', 3500); }

  $('infoVer').textContent = DATA.v
    ? new Date(DATA.v * 1000).toLocaleString('vi-VN')
    : '—';

  renderStats();
  renderAlpha();
  renderCart();

  /* sự kiện */
  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => { buzz(); showTab(t.dataset.tab); };
  });
  $('heroBack').onclick = () => { buzz(); backToAlpha(); };
  $('skinBack').onclick = () => { buzz(); backToHeroes(); };
  $('btnRun').onclick = runMod;
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
    t = setTimeout(() => doSearch(si.value), 180);
  };
  $('heroSearchClr').onclick = () => {
    si.value = ''; $('heroSearchClr').hidden = true; doSearch('');
  };

  $('cardHaptic').onclick = () => {
    haptic = !haptic;
    localStorage.setItem(HAPTIC_KEY, haptic ? '1' : '0');
    $('hapticState').textContent = haptic ? 'Bật' : 'Tắt';
    buzz(); toast('Haptic: ' + (haptic ? 'Bật' : 'Tắt'), 'info');
  };
  $('hapticState').textContent = haptic ? 'Bật' : 'Tắt';

  $('cardCopyId').onclick = () => {
    const ids = Object.keys(CART).join(' ');
    if (!ids) { toast('Chưa chọn skin nào', 'warn'); return; }
    navigator.clipboard?.writeText(ids)
      .then(() => { buzz('ok'); toast('Đã copy: ' + ids, 'success'); })
      .catch(() => toast(ids, 'info', 5000));
  };

  tg?.BackButton?.onClick?.(() => {
    if (!$('skinListPane').hidden) backToHeroes();
    else if (!$('heroListPane').hidden) backToAlpha();
  });

  syncBackButton();
}

init();

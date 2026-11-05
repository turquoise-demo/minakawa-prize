/* ミナカワ発注（デモ）— お客様の画面
   画面に出す文字は、すべて h`` を通して無害化する（商品名などに <script> が入っていても文字として出る）。
   そのまま出すのは、自前のイラスト（ICONS）とアイコンだけ。 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
  const esc = v => String(v == null ? "" : v).replace(/[&<>"'`]/g, c => ESC[c]);
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = s => new Raw(s);
  const fmt = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(fmt).join("") : (v === false || v == null) ? "" : esc(v);
  const h = (str, ...vals) => raw(str.reduce((a, s, i) => a + s + (i < vals.length ? fmt(vals[i]) : ""), ""));
  const yen = n => "¥" + Math.round(n).toLocaleString("ja-JP");
  const num = n => Number(n).toLocaleString("ja-JP");
  const W = ["日", "月", "火", "水", "木", "金", "土"];
  const jpDate = s => { const d = new Date(s + "T00:00:00"); return `${d.getMonth() + 1}月${d.getDate()}日（${W[d.getDay()]}）`; };
  const mdHm = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const norm = s => String(s || "").normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const LS = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  const CAT_COLOR0 = { 麺類: "#fbe3dc", お菓子: "#fff1b8", 飲料: "#dcefF6", 栄養ドリンク: "#fde3c8", 食品: "#f1e6d2", "冷凍・お肉": "#f9dcd6", 生鮮: "#e3efd3", 日用品: "#e6e9f4" };
  const CAT_EDGE0 = { 麺類: "#dc5028", お菓子: "#e1b400", 飲料: "#5aa8c8", 栄養ドリンク: "#ff8134", 食品: "#a8814a", "冷凍・お肉": "#c2452a", 生鮮: "#78a050", 日用品: "#5064a0" };
  const CAT_COLOR = { お菓子: "#fff1b8", 飲料: "#dcf0f6", オロナミンC: "#fde3c8", 麺類: "#fbe3dc", 食品: "#f1e6d2", 常温食品: "#f1e6d2", 青果: "#e3efd3", お肉: "#f9dcd6", 漬け魚と煮魚: "#e6e9f4", 冷凍フルーツ: "#e8f3f8", お米: "#f4efdf", 日用品: "#e6e9f4" };
  const CAT_EDGE = { お菓子: "#e1b400", 飲料: "#5aa8c8", オロナミンC: "#ff8134", 麺類: "#dc5028", 食品: "#a8814a", 常温食品: "#a8814a", 青果: "#78a050", お肉: "#c2452a", 漬け魚と煮魚: "#5064a0", 冷凍フルーツ: "#5aa8c8", お米: "#a8814a", 日用品: "#5064a0" };
  const CAT_ORDER = ["お菓子", "飲料", "オロナミンC", "麺類", "食品", "常温食品", "青果", "お肉", "漬け魚と煮魚", "冷凍フルーツ", "お米", "日用品"];
  const IC = {
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11h11L21 7H6"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
    hist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 5h16M4 12h16M4 19h10"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  };
  const pic = (o, cls = "") => o && o.photo ? raw(`<span class="ph ${cls}"><img src="${esc(o.photo)}" alt="" loading="lazy" decoding="async"></span>`) : ill(o && o.icon || "detergent", o && o.cat, cls);
  const per = i => i.unitBased ? "/" + i.unit : "/個";
  // 価格は税別で表示し、税込を小さく添える（食品8%・日用品10%）
  const inc = (i, v) => Math.round(v * (1 + Server.rateOf(i.cat)));
  const caseTxt = i => i.unitBased ? "" : `1${i.unit} ${yen(i.price * i.perCase)}（税込${yen(inc(i, i.price * i.perCase))}）`;
  const taxSmall = i => raw(`<small class="tin">税込 ${esc(yen(inc(i, i.price)))}</small>`);
  const specTxt = i => i.unitBased ? (i.spec || "") : [i.spec, `1${i.unit}${num(i.perCase)}個`].filter(Boolean).join("・");
  const ill = (icon, cat, cls = "") => raw(`<span class="ib ${cls}" data-cat-bg="${esc(cat)}"><svg viewBox="0 0 100 100" aria-hidden="true">${(window.ICONS || {})[icon] || ""}</svg></span>`);

  /* ---------- 状態 ---------- */
  const S = { me: null, items: [], byId: {}, orders: [], cart: {}, favs: {}, view: "home", cat: "", q: "", vmode: LS.get("mko-vmode", "big"), draft: { date: "", person: "", note: "" }, edit: null };
  window.APP = { S, h, raw, esc, yen, num, jpDate, mdHm, $, $$, ill, pic, per, specTxt, IC, toast, openSheet, closeSheet, render, LS, CAT_COLOR, CAT_EDGE };

  function load() {
    S.me = Server.me();
    if (!S.me || S.me.role !== "shop") return;
    S.items = Server.catalog().sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
    S.byId = Object.fromEntries(S.items.map(i => [i.id, i]));
    S.orders = Server.orders();
    S.cart = LS.get("mko-cart:" + S.me.cid, {});
    S.edit = LS.get("mko-edit:" + S.me.cid, null);
    if (S.edit) S.cart = S.edit.cart;
    Object.keys(S.cart).forEach(id => { if (!S.byId[id]) delete S.cart[id]; });
    S.favs = LS.get("mko-fav:" + S.me.cid, {});
    const opts = Server.deliveryOptions();
    if (!opts.includes(S.draft.date)) S.draft.date = opts[0];
    if (!S.draft.person) S.draft.person = (S.me.customer.contact || "").split(" ").pop();
  }
  function saveCart() {
    if (S.edit) { S.edit.cart = S.cart; LS.set("mko-edit:" + S.me.cid, S.edit); }
    else LS.set("mko-cart:" + S.me.cid, S.cart);
  }
  function safe(fn) {
    try { return fn(); } catch (e) {
      if (e instanceof Server.AuthError) { toast(e.message); route("#/login"); return null; }
      if (e instanceof Server.RuleError) { toast(e.message); return null; }
      throw e;
    }
  }

  /* ---------- カートの計算（表示用。確定の金額はサーバーが計算し直す） ---------- */
  function cartLines() {
    return Object.entries(S.cart).filter(([id, q]) => S.byId[id] && q > 0).map(([id, qty]) => {
      const i = S.byId[id]; return { ...i, qty, amount: i.price * i.perCase * qty };
    });
  }
  const cartCount = () => Object.values(S.cart).reduce((a, q) => a + (q > 0 ? 1 : 0), 0);
  // 「1商品5ケース〜」の商品は、5ケース未満にしない（減らすと0、増やすと5）
  const minOf = i => { const u = Server.unitInfo(i && i.minText); return u.kind === "item" && u.min > 1 ? u.min : 1; };
  function setQty(id, q, quiet) {
    q = Math.max(0, Math.min(999, Math.round(Number(q) || 0)));
    const m = minOf(S.byId[id]); if (q > 0 && q < m) q = q < (S.cart[id] || 0) ? 0 : m;
    if (q) S.cart[id] = q; else delete S.cart[id];
    saveCart(); if (!quiet) refresh();
  }

  /* ---------- 共通の部品 ---------- */
  function toast(m, undo) {
    $$(".toast").forEach(t => t.remove());
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status");
    const sp = document.createElement("span"); sp.textContent = m; t.appendChild(sp);
    if (undo) { const b = document.createElement("button"); b.textContent = "元に戻す"; b.onclick = () => { t.remove(); undo(); }; t.appendChild(b); }
    document.body.appendChild(t); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.remove(), undo ? 6000 : 3200);
  }
  let lastFocus = null;
  function openSheet(title, body, onBind) {
    closeSheet(); lastFocus = document.activeElement;
    const ov = document.createElement("div"); ov.className = "ov"; ov.id = "ov";
    ov.innerHTML = h`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="sh-t"><div class="hdr"><h2 class="ttl" id="sh-t">${title}</h2><button class="x" data-act="close" aria-label="閉じる">✕</button></div><div id="sh-b">${body}</div></div>`.s;
    document.body.appendChild(ov); document.body.classList.add("locked");
    ov.addEventListener("click", e => { if (e.target === ov) closeSheet(); });
    if (onBind) onBind($("#sh-b"));
    const f = ov.querySelector("button, input, select, textarea"); if (f) f.focus();
    paintBg(ov);
    return $("#sh-b");
  }
  function closeSheet() { const o = $("#ov"); if (o) { o.remove(); document.body.classList.remove("locked"); if (lastFocus) try { lastFocus.focus(); } catch (e) {} } }
  // style属性を使わずに色を付ける（CSPで style 属性を禁止しているため、JSから設定する）
  function paintBg(root) {
    $$("[data-cat-bg]", root).forEach(el => el.style.setProperty("--bg", CAT_COLOR[el.dataset.catBg] || "#fdf5e1"));
    $$("[data-cat-edge]", root).forEach(el => el.style.setProperty("--c", CAT_EDGE[el.dataset.catEdge] || "#a0d2e6"));
    $$("[data-w]", root).forEach(el => el.style.width = Math.min(100, Number(el.dataset.w) || 0) + "%");
    $$("[data-hgt]", root).forEach(el => el.style.height = Math.min(100, Number(el.dataset.hgt) || 0) + "%");
  }

  function unitChip(i) {
    const u = Server.unitInfo(i.minText);
    if (u.kind === "mark") return h`<span class="cond mk">${u.mark}印どうし ${u.min}${u.u}〜</span>`;
    if (u.kind === "item" && u.min > 1) return h`<span class="cond min">${u.label}</span>`;
    if (u.kind === "item") return h`<span class="cond">${u.min}${u.u}から${u.extra ? "・" + u.extra : ""}</span>`;
    return h`<span class="cond">${u.label}</span>`;
  }
  function stepper(i) {
    const q = S.cart[i.id] || 0;
    if (!q) return h`<button class="add" data-act="add" data-id="${i.id}" aria-label="${i.name}をカートに入れる">＋ カートに入れる</button>`;
    return h`<div><div class="stepper"><button data-act="dec" data-id="${i.id}" aria-label="${i.name}を1つ減らす">−</button><input type="number" inputmode="numeric" min="0" max="999" value="${q}" data-qty="${i.id}" aria-label="${i.name}の数量（${i.unit}）"><button data-act="inc" data-id="${i.id}" aria-label="${i.name}を1つ増やす">＋</button></div><div class="su">${i.unit}${i.unitBased ? "" : `（${num(q * i.perCase)}個）`}</div></div>`;
  }
  function itemRow(i) {
    const q = S.cart[i.id] || 0, special = i.price < i.base;
    return h`<article class="lrow${q ? " on" : ""}" data-item="${i.id}">${pic(i)}
      <div class="li"><div class="nm">${i.name}${special ? h` <span class="pill red">特別価格</span>` : ""}</div><div class="sp">${specTxt(i)}　${unitChip(i)}</div></div>
      <div class="lp"><b class="num">${yen(i.price)}</b><small>${per(i)}（税別）</small><div>${taxSmall(i)}</div><div class="sp num">${caseTxt(i)}</div></div>
      <div class="la">${stepper(i)}</div></article>`;
  }
  function itemCard(i) {
    if (S.vmode === "list" && S.view !== "home") return itemRow(i);
    const q = S.cart[i.id] || 0, fav = !!S.favs[i.id], special = i.price < i.base;
    return h`<article class="item${q ? " on" : ""}" data-item="${i.id}">
      ${special ? h`<span class="tag pill red">特別価格</span>` : ""}
      <button class="fav" data-act="fav" data-id="${i.id}" aria-pressed="${String(fav)}" aria-label="${i.name}をお気に入り${fav ? "から外す" : "に追加"}">${raw(IC.star)}</button>
      ${pic(i)}
      <div class="nm">${i.name}</div>
      <div class="sp">${specTxt(i)}</div>
      <div class="lp"><div class="pr"><b class="num">${yen(i.price)}</b><small>${per(i)}（税別）</small>${special ? h`<span class="was">${yen(i.base)}</span>` : ""}</div><div>${taxSmall(i)}</div>
      <div class="cs num">${caseTxt(i)}</div></div>
      ${unitChip(i)}
      ${stepper(i)}
    </article>`;
  }

  /* ---------- ヘッダー・ナビ ---------- */
  function nav() {
    const n = cartCount();
    const items = [["home", "商品", IC.shop], ["sheet", "表で発注", IC.sheet], ["cart", "カート", IC.cart], ["hist", "履歴", IC.hist]];
    const cur = k => (k === "home" && ["home", "list", "search", "fav"].includes(S.view)) || S.view === k;
    const b = items.map(([k, l, ic]) => h`<button data-go="#/${k}"${cur(k) ? raw(' aria-current="page"') : ""}>${raw(ic)}${l}${k === "cart" && n ? h`<span class="dot">${n}</span>` : ""}</button>`);
    $("#tnav").innerHTML = fmt(b); $("#bnav").innerHTML = fmt(b);
    const c = S.me && S.me.customer;
    $("#who").innerHTML = c ? h`<small>${c.company}</small><b>${c.store}</b>`.s : "";
    $("#logout").classList.toggle("hide", !c);
    $("#bnav").classList.toggle("hide", !c); $("#tnav").classList.toggle("hide", !c);
  }

  /* ---------- ログイン ---------- */
  function loginView(msg) {
    return h`<section class="login"><div class="box stack">
      <div><span class="en">LOGIN</span><h1 class="ttl">Web発注にログイン</h1></div>
      <p class="sub">ミナカワからお知らせしたログインIDとパスワードを入れてください。</p>
      <form id="lf" class="stack" autocomplete="on">
        <label class="field">ログインID<input name="id" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="20"></label>
        <label class="field">パスワード<input name="pw" type="password" autocomplete="current-password" required maxlength="64"></label>
        ${msg ? h`<div class="msg bad" role="alert">${msg}</div>` : ""}
        <button class="btn pri lg wide" type="submit">ログイン</button>
      </form>
      <div class="msg info"><b>デモ用のお店アカウント</b>（ワンタップで入れます）</div>
      <div class="demo-acc">${SEED.customers.map(c => h`<button data-act="demo-login" data-login="${c.loginId}"><span class="ic">${String(c.shopNo).slice(-1)}</span><span>${c.store}<small>ID ${c.loginId}・パスワード shop-demo</small></span></button>`)}</div>
      <p class="sub">はじめてのお取引は<a href="https://turquoise-demo.github.io/minakawa-prize/contact.html">お問い合わせ</a>から。IDは本部が発行します（自分で登録はできません）。</p>
      <p class="sub"><a href="#/admin">管理画面（ミナカワ社内）</a></p>
    </div></section>`;
  }

  /* ---------- ホーム ---------- */
  function usualStats() {
    const os = S.orders.filter(o => o.status !== "取消").sort((a, b) => a.createdAt - b.createdAt);
    const cnt = {}, qs = {};
    os.forEach(o => o.lines.forEach(l => { cnt[l.id] = (cnt[l.id] || 0) + 1; (qs[l.id] = qs[l.id] || []).push(l.qty); }));
    const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const usual = Object.keys(cnt).filter(id => S.byId[id] && cnt[id] / os.length >= .5).sort((a, b) => cnt[b] - cnt[a]).map(id => ({ id, qty: Math.max(med(qs[id]), minOf(S.byId[id])), rate: cnt[id] / os.length }));
    const gaps = []; for (let k = 1; k < os.length; k++) gaps.push((os[k].createdAt - os[k - 1].createdAt) / 864e5);
    const cyc = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 7;
    const last = os[os.length - 1];
    const next = last ? last.createdAt + cyc * 864e5 : Date.now();
    return { os, usual, cyc, last, next, recent: os.slice(-8) };
  }
  function homeView() {
    const st = usualStats(); const opts = Server.deliveryOptions();
    const days = Math.round((st.next - Date.now()) / 864e5);
    const nextTxt = days <= 0 ? "そろそろ発注の時期です" : `次の発注の目安は ${days}日後`;
    const counts = {}; S.items.forEach(i => counts[i.cat] = (counts[i.cat] || 0) + 1);
    const inCart = {}; cartLines().forEach(l => inCart[l.cat] = (inCart[l.cat] || 0) + l.qty);
    const favN = Object.keys(S.favs).filter(id => S.byId[id]).length;
    const maxAmt = Math.max(1, ...st.recent.map(o => o.total));
    return h`<div class="wrap">
      <section class="hello"><div><span class="en">WELCOME</span><h1 class="ttl">${S.me.customer.store}さま、こんにちは</h1><p class="sub">${nextTxt}（いつもは${st.cyc}日ごと）</p></div>
        <div class="deliv">いま注文すると<b>${jpDate(opts[0])}</b>にお届け<br><small>15時までのご注文は翌営業日</small></div></section>
      <div class="search">${raw(IC.search)}<input id="q" type="search" placeholder="商品名・JANで探す（例：カップヌードル、きっとかっと）" value="${S.q}" aria-label="商品を探す" enterkeyhint="search" maxlength="40"></div>
      <div id="sres"></div>
      <div class="sec-h"><h2 class="ttl">いつもの注文</h2><span class="sub">これまでのご注文から、自動でまとめています</span></div>
      <div class="usual">
        <div class="card pad"><div class="row"><b>よく頼む商品 ${st.usual.length}品</b><span class="spacer"></span><button class="btn pri" data-act="usual-all">いつもの数で まとめてカートへ</button></div>
          <div class="list">${st.usual.slice(0, 8).map(u => { const i = S.byId[u.id]; return h`<div class="it">${pic(i)}<span>${i.name}<span class="sub">　いつも${u.qty}${i.unit}</span></span><button class="btn sm ghost" data-act="add-n" data-id="${i.id}" data-n="${u.qty}">＋${u.qty}</button></div>`; })}</div>
          ${st.usual.length > 8 ? h`<p class="sub">ほか${st.usual.length - 8}品も一緒に入ります</p>` : ""}
        </div>
        <div class="card pad"><b>発注のリズム</b><p class="sub">直近${st.recent.length}回のご注文金額（税込）</p>
          <div class="rhythm">${st.recent.map(o => h`<span data-hgt="${Math.round(o.total / maxAmt * 100)}" title="${mdHm(o.createdAt)} ${yen(o.total)}"></span>`)}</div>
          <div class="row sub"><span>${st.recent[0] ? mdHm(st.recent[0].createdAt).split(" ")[0] : ""}</span><span class="spacer"></span><span>前回 ${st.last ? mdHm(st.last.createdAt).split(" ")[0] : "—"}</span></div>
          ${st.last ? h`<button class="btn wide" data-act="reorder" data-id="${st.last.id}">前回（${mdHm(st.last.createdAt).split(" ")[0]}）と同じ内容をカートへ</button>` : ""}
        </div>
      </div>
      <div class="sec-h"><h2 class="ttl">ジャンルから選ぶ</h2><span class="sub">お菓子・飲料・麺類・青果・お肉・お魚まで、全${S.items.length}品</span></div>
      <div class="gtiles">
        ${favN ? h`<button class="gt" data-go="#/fav" data-cat-edge="お菓子"><span class="ib" data-cat-bg="お菓子"><svg viewBox="0 0 24 24" fill="#f2b705" stroke="#e1a400" stroke-width="1.2">${raw('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>')}</svg></span><b>お気に入り</b><small>${favN}品</small></button>` : ""}
        ${CAT_ORDER.filter(c => counts[c]).map(c => { const first = S.items.find(i => i.cat === c); return h`<button class="gt" data-go="#/list/${encodeURIComponent(c)}" data-cat-edge="${c}">${pic(S.items.find(i => i.cat === c && i.photo) || first)}<b>${c}</b><small>${counts[c]}品</small>${inCart[c] ? h`<span class="inc">${inCart[c]}</span>` : ""}</button>`; })}
      </div>
      ${rulesBox()}
    </div>`;
  }
  function marks(cat) {
    const m = {}; S.items.filter(i => !cat || i.cat === cat).forEach(i => { const u = Server.unitInfo(i.minText); if (u.kind === "mark") m[u.mark] = u; });
    return Object.values(m);
  }
  function rulesBox(cat) {
    const food = !cat || Server.FOOD_CATS.includes(cat);
    const hasMk = S.items.some(i => (!cat || i.cat === cat) && Server.unitInfo(i.minText).kind === "mark");
    if (!food && !hasMk) return "";
    return h`<div class="rules">
      ${food ? h`<div class="rule"><span class="big">${Server.FOOD_MIN}<small>ケース〜</small></span><span>麺類・お菓子・飲料・オロナミンC・食品（調味料・油）は、<b>ジャンルをまたいで合わせて${Server.FOOD_MIN}ケース</b>からご注文いただけます。カートで、あと何ケースかが分かります。</span></div>` : ""}
      ${hasMk ? marks(cat).map(m => h`<div class="rule"><span class="big">${m.mark}</span><span>${m.mark}印の商品は、${m.mark}印どうし合わせて${m.min}${m.u}からご注文いただけます。1品ずつは1${m.u}から選べます。</span></div>`) : ""}
    </div>`;
  }

  /* ---------- 一覧 ---------- */
  function listOf() {
    if (S.view === "fav") return S.items.filter(i => S.favs[i.id]);
    if (S.view === "search") { const ws = norm(S.q).split(/\s+/).filter(Boolean); return S.items.filter(i => { const s = norm(i.name + " " + i.jan + " " + i.cat + " " + i.section + " " + i.spec); return ws.every(w => s.includes(w)); }); }
    return S.items.filter(i => i.cat === S.cat);
  }
  function listBody(list) {
    if (!list.length) return S.view === "fav" ? h`<div class="empty"><b>お気に入りはまだありません</b>商品の右上の☆を押すと、ここにまとまります。</div>`
      : h`<div class="empty"><b>「${S.q}」は見つかりませんでした</b>ひらがな・カタカナ、どちらでも探せます。商品名の一部やJANでもOKです。</div>`;
    const secs = {}; list.forEach(i => { const k = S.view === "list" ? i.section : i.cat; (secs[k] = secs[k] || []).push(i); });
    return raw(fmt(Object.entries(secs).map(([s, arr]) => h`<h3 class="shelf">${s}<small>${arr.length}品</small></h3><div class="${S.vmode === "list" ? "list" : "grid"}">${arr.map(itemCard)}</div>`)));
  }
  function listView() {
    const counts = {}; S.items.forEach(i => counts[i.cat] = (counts[i.cat] || 0) + 1);
    const inCart = {}; cartLines().forEach(l => inCart[l.cat] = (inCart[l.cat] || 0) + l.qty);
    const title = S.view === "fav" ? "お気に入り" : S.view === "search" ? `「${S.q}」の検索結果` : S.cat;
    const list = listOf();
    return h`<div class="wrap"><div class="shop"><div>
      <div class="chips" role="toolbar" aria-label="ジャンル">
        <button class="chip" data-go="#/home">⌂ ホーム</button>
        <button class="chip" data-go="#/fav" aria-pressed="${String(S.view === "fav")}">★ お気に入り</button>
        ${CAT_ORDER.filter(c => counts[c]).map(c => h`<button class="chip" data-go="#/list/${encodeURIComponent(c)}" aria-pressed="${String(S.view === "list" && S.cat === c)}">${c}${inCart[c] ? h`<span class="inc">${inCart[c]}</span>` : h`<span class="c">${counts[c]}</span>`}</button>`)}
      </div>
      <div class="search">${raw(IC.search)}<input id="q" type="search" placeholder="商品名・JANで探す" value="${S.q}" aria-label="商品を探す" maxlength="40">${S.q ? h`<button class="clr" data-act="clear-q" aria-label="検索を消す">✕</button>` : ""}</div>
      <div class="vbar"><h1 class="ttl">${title}</h1><span class="sub">${list.length}品</span>
        <div class="seg" role="group" aria-label="表示のしかた">${[["big", "写真"], ["list", "リスト"]].map(([k, l]) => h`<button data-act="vmode" data-v="${k}" aria-pressed="${String(S.vmode === k)}">${l}</button>`)}</div></div>
      ${S.view === "list" ? rulesBox(S.cat) : ""}
      <div id="results">${listBody(list)}</div>
    </div><aside class="cart card pad" id="side">${cartPane(false)}</aside></div></div>`;
  }

  /* ---------- 表で発注（Excelのように、上から数を打っていく） ---------- */
  function sheetView() {
    const f = norm(S.sheetQ || "");
    const rows = S.items.filter(i => !f || norm(i.name + i.jan + i.cat + i.section).includes(f));
    const byCat = {}; rows.forEach(i => (byCat[i.cat] = byCat[i.cat] || []).push(i));
    return h`<div class="wrap">
      <div class="vbar"><div><span class="en">QUICK ORDER</span><h1 class="ttl">表で発注</h1></div></div>
      <p class="sub">数を入れて <b>Enter</b> で次の行へ。いつもの発注表と同じ感覚で、上から打っていけます。入れた数はそのままカートに入ります。</p>
      <div class="row"><input class="inp" id="sq" placeholder="しぼりこみ（商品名・JAN）" value="${S.sheetQ || ""}" maxlength="40" aria-label="表をしぼりこむ"><button class="btn sm ghost" data-act="sheet-usual">いつもの数を入れる</button></div>
      <div class="tbl-wrap"><table class="sheet"><thead><tr><th>商品名</th><th class="hide-sp">規格・入数</th><th class="r">単価（税別）</th><th class="r hide-sp">1ケース（税別）</th><th class="r">数量</th><th class="r">金額</th></tr></thead><tbody>
      ${CAT_ORDER.filter(c => byCat[c]).map(c => h`<tr class="cat"><td colspan="6">${c}</td></tr>${byCat[c].map(i => { const q = S.cart[i.id] || 0; return h`<tr class="${q ? "on" : ""}" data-row="${i.id}"><td>${i.name}<div class="jan">${unitChip(i)}　JAN ${i.jan}</div></td><td class="hide-sp">${i.spec}・${i.perCase}個</td><td class="r num">${yen(i.price)}<div class="tin">税込${yen(inc(i, i.price))}</div></td><td class="r num hide-sp">${yen(i.price * i.perCase)}<div class="tin">税込${yen(inc(i, i.price * i.perCase))}</div></td><td class="r"><input class="q" type="number" inputmode="numeric" min="0" max="999" value="${q || ""}" data-sq="${i.id}" aria-label="${i.name}の数量（${i.unit}）"> <span class="sub">${i.unit}</span></td><td class="r num" data-amt="${i.id}">${q ? yen(i.price * i.perCase * q) : ""}</td></tr>`; })}`)}
      </tbody></table></div>
      <div class="sheetbar" id="sheetbar">${sheetBar()}</div>
    </div>`;
  }
  function sheetBar() {
    const lines = cartLines(); const t = Server.totals(lines); const ck = Server.check(lines);
    return h`<span>${lines.length}品目</span><b class="num">税込 ${yen(t.total)}</b><span class="sub">${ck.issues[0] || (lines.length ? "ご注文条件OK" : "")}</span><span class="spacer"></span><button class="btn ylw sm" data-go="#/cart"${lines.length ? "" : raw(" disabled")}>カートを確認</button>`;
  }

  /* ---------- カート ---------- */
  function cartPane(full) {
    const lines = cartLines(); const { goals, issues } = Server.check(lines); const t = Server.totals(lines);
    const title = S.edit ? `訂正中のご注文 ${S.edit.no}` : "カート";
    if (!lines.length) return h`<h2 class="ttl">${title}</h2><div class="empty"><b>まだ何も入っていません</b>商品の「＋」を押すか、ホームの「いつもの注文」でまとめて入れられます。</div>
      ${S.edit ? h`<button class="btn wide" data-act="edit-quit">訂正をやめる</button>` : ""}${full ? h`<button class="btn wide" data-go="#/home">商品を見る</button>` : ""}`;
    const opts = Server.deliveryOptions(); if (S.edit && !opts.includes(S.draft.date)) opts.unshift(S.draft.date);
    const head = h`<div class="row"><h2 class="ttl">${title}</h2><span class="sub">${lines.length}品目</span><span class="spacer"></span><button class="rm" data-act="clear">${S.edit ? "全部外す" : "空にする"}</button></div>
      ${S.edit ? h`<div class="msg warn">訂正は ${S.edit.until} まで。直したら「訂正を送る」を押してください。<button class="rm" data-act="edit-quit">訂正をやめる</button></div>` : ""}
      <div class="goals">${goals.map(g => h`<div class="goal${g.have >= g.need ? " ok" : ""}"><div class="t"><span>${g.label}</span><span class="num">${g.have}/${g.need}${g.u}　${g.have >= g.need ? "OK" : `あと${g.need - g.have}${g.u}`}</span></div><div class="bar"><i data-w="${Math.round(g.have / g.need * 100)}"></i></div></div>`)}</div>
      <div>${lines.map(l => h`<div class="cl">${pic(l)}<div><div class="n">${l.name}</div><div class="s">${yen(l.price)}${per(l)}${l.unitBased ? "" : `・1${l.unit}${l.perCase}個`}${Server.rateOf(l.cat) === 0.1 ? "・税10%" : ""}</div></div>
        <div class="r"><div class="mini-step"><button data-act="dec" data-id="${l.id}" aria-label="${l.name}を1つ減らす">−</button><span class="num">${l.qty}</span><button data-act="inc" data-id="${l.id}" aria-label="${l.name}を1つ増やす">＋</button></div><span class="amt num">${yen(l.amount)}<small class="tin">税込${yen(inc(l, l.amount))}</small></span><button class="rm" data-act="rm" data-id="${l.id}">外す</button></div></div>`)}</div>`;
    const short = goals.find(g => g.have < g.need);
    const sugg = short ? suggestFor(short, 3) : [];
    const sum = h`${short && sugg.length ? h`<div class="sugg"><b>${short.label}があと${short.need - short.have}${short.u}で注文できます。${short.key === "food" ? "いつもの商品" : short.label.replace("の商品", "")}から足す：</b><div class="row">${sugg.map(i => h`<button class="btn sm ghost" data-act="inc" data-id="${i.id}">＋1 ${i.name}</button>`)}</div></div>` : ""}
      <div class="tot num"><div><span>小計（税抜）</span><span>${yen(t.sub)}</span></div>
        ${t.base8 ? h`<div class="sub"><span>8%対象 ${yen(t.base8)}</span><span>消費税 ${yen(t.t8)}</span></div>` : ""}
        ${t.base10 ? h`<div class="sub"><span>10%対象 ${yen(t.base10)}</span><span>消費税 ${yen(t.t10)}</span></div>` : ""}
        <div class="all"><span>合計（税込）</span><b>${yen(t.total)}</b></div></div>
      <div class="stack">
        <label class="field">お届け日<select id="d-date">${opts.map(o => h`<option value="${o}"${o === S.draft.date ? raw(" selected") : ""}>${jpDate(o)}${o === opts[0] && !S.edit ? "（いちばん早い日）" : ""}</option>`)}</select></label>
        <label class="field">ご担当者<input id="d-person" value="${S.draft.person}" maxlength="20" autocomplete="name"></label>
        <label class="field">備考（任意）<textarea id="d-note" rows="2" maxlength="200" placeholder="例）裏口に置いてください">${S.draft.note}</textarea></label>
        ${issues.length ? h`<div class="msg warn">${issues[0]}</div>` : ""}
        <button class="btn pri lg wide" data-act="confirm"${issues.length ? raw(" disabled") : ""}>${S.edit ? "訂正の内容を確認" : "注文内容を確認する"}</button>
      </div>`;
    return full ? h`<div class="cartpage"><div class="card pad">${head}</div><div class="card pad sum">${sum}</div></div>` : h`${head}${sum}`;
  }
  // 足りない条件に合う商品を、カートの中→いつもの商品→その他の順に出す
  function suggestFor(g, n) {
    const ok = g.key === "food" ? i => Server.FOOD_CATS.includes(i.cat) : i => { const u = Server.unitInfo(i.minText); return u.kind === "mark" && "mk" + u.mark === g.key; };
    const ids = [...Object.keys(S.cart), ...usualStats().usual.map(u => u.id), ...S.items.map(i => i.id)];
    return [...new Set(ids)].map(id => S.byId[id]).filter(i => i && ok(i)).slice(0, n);
  }
  function cartView() { return h`<div class="wrap"><div class="vbar"><div><span class="en">CART</span></div></div><div id="cartfull">${cartPane(true)}</div></div>`; }

  function reviewChecks(lines) {
    const st = usualStats(); const by = {}; st.usual.forEach(u => by[u.id] = u); const out = [];
    lines.forEach(l => { const u = by[l.id]; if (u && l.qty >= Math.max(u.qty * 3, u.qty + 4)) out.push({ lv: "warn", t: `「${l.name}」が${l.qty}${l.unit}です（いつもは${u.qty}${l.unit}）。数は合っていますか？` }); });
    if (!S.edit) st.usual.filter(u => u.rate >= .7 && !S.cart[u.id]).slice(0, 3).forEach(u => out.push({ lv: "info", t: `いつもの「${S.byId[u.id].name}」が入っていません`, add: u.id, q: u.qty }));
    S.orders.filter(o => o.status === "受注" && (!S.edit || o.id !== S.edit.id)).forEach(o => { const dup = o.lines.filter(l => S.cart[l.id]); if (dup.length) out.push({ lv: "warn", t: `${mdHm(o.createdAt)}のご注文（まだお届け前）にも、同じ商品が${dup.length}品あります` }); });
    return out;
  }
  function confirmOrder() {
    readDraft();
    const payload = { lines: cartLines().map(l => ({ id: l.id, qty: l.qty })), date: S.draft.date, person: S.draft.person, note: S.draft.note };
    const o = safe(() => S.edit ? null : Server.preview(payload));
    if (!S.edit && !o) return;
    const lines = o ? o.lines : cartLines(); const t = o || Server.totals(lines);
    const ck = reviewChecks(lines);
    openSheet(S.edit ? "訂正の内容を確認" : "ご注文の確認", h`<div class="stack">
      <div class="msg info"><b>${S.me.customer.store}</b>　${jpDate(S.draft.date)}お届け</div>
      <div class="stack">${ck.length ? ck.map(c => h`<div class="ck ${c.lv}"><span>${c.t}</span>${c.add ? h`<button class="btn sm" data-act="ck-add" data-id="${c.add}" data-n="${c.q}">＋${c.q}入れる</button>` : ""}</div>`) : h`<div class="ck ok">いつものご注文と比べて、気になる点はありません</div>`}</div>
      <table class="dl"><tbody>${lines.map(l => h`<tr><td>${l.name}</td><td class="r">${l.qty}${l.unit}</td><td class="r num">${yen(l.amount)}</td></tr>`)}</tbody></table>
      <div class="tot num"><div><span>小計（税抜）</span><span>${yen(t.sub)}</span></div><div><span>消費税</span><span>${yen(t.tax)}</span></div><div class="all"><span>合計（税込）</span><b>${yen(t.total)}</b></div></div>
      ${!S.edit ? h`<p class="sub">金額はミナカワのサーバーで計算し直しています。ご注文から${Server.EDIT_HOURS}時間以内、出荷の準備が始まるまでは、履歴から訂正・取り消しができます。</p>` : ""}
      <button class="btn pri lg wide" data-act="send">${S.edit ? "訂正を送る" : "この内容で注文する"}</button>
    </div>`);
  }
  function send() {
    const payload = { lines: cartLines().map(l => ({ id: l.id, qty: l.qty })), date: S.draft.date, person: S.draft.person, note: S.draft.note };
    const o = safe(() => S.edit ? Server.editOrder(S.edit.id, payload) : Server.placeOrder(payload));
    if (!o) return;
    const wasEdit = !!S.edit;
    S.cart = {}; if (S.edit) { S.edit = null; localStorage.removeItem("mko-edit:" + S.me.cid); } saveCart(); S.draft.note = "";
    S.orders = Server.orders();
    openSheet(wasEdit ? "訂正を受け付けました" : "ご注文を受け付けました", h`<div class="done"><span class="ok">✓</span><b class="ttl h2">${o.no}</b>
      <p>${jpDate(o.deliveryDate)}にお届けします。<br>合計 <b>${yen(o.total)}</b>（税込）</p>
      <p class="sub">${mdHm(o.createdAt + Server.EDIT_HOURS * 36e5)}までは、履歴から訂正・取り消しができます。</p>
      <div class="row"><button class="btn" data-act="close" data-go="#/hist">履歴を見る</button><button class="btn pri" data-act="close" data-go="#/home">ホームへ</button></div></div>`);
    refresh();
  }
  function readDraft() {
    const d = $("#d-date"), p = $("#d-person"), n = $("#d-note");
    if (d) S.draft.date = d.value; if (p) S.draft.person = p.value; if (n) S.draft.note = n.value;
  }

  /* ---------- 履歴 ---------- */
  function histView() {
    const os = S.orders;
    const stepHtml = o => o.status === "取消" ? h`<div class="msg">このご注文は取り消しました（${mdHm(o.statusAt["取消"])}）</div>`
      : h`<div class="steps">${Server.STATUSES.map((s, k) => { const cur = Server.STATUSES.indexOf(o.status); return h`<span class="${k < cur ? "on" : k === cur ? (k === 3 ? "on" : "now") : ""}">${s}</span>`; })}</div>`;
    return h`<div class="wrap"><div class="vbar"><div><span class="en">HISTORY</span><h1 class="ttl">ご注文の履歴</h1></div></div>
      <div class="stack">${os.length ? os.map(o => { const ng = o.status === "受注" ? safe(() => Server.canEdit(o.id)) : "x"; return h`<article class="card order">
        <div class="top"><b>${jpDate(o.deliveryDate)}お届け</b><span class="sub">${o.no}・${mdHm(o.createdAt)}注文</span>${o.edits.length ? h`<span class="pill warn">訂正済み</span>` : ""}<span class="amt num">${yen(o.total)}</span></div>
        ${stepHtml(o)}
        <div class="lines">${o.lines.map(l => `${l.name} ${l.qty}${l.unit}`).join("、")}</div>
        <div class="row"><button class="btn sm" data-act="reorder" data-id="${o.id}">同じ内容でカートへ</button>
          ${!ng ? h`<button class="btn sm" data-act="edit" data-id="${o.id}">訂正する</button><button class="btn sm dng" data-act="cancel" data-id="${o.id}">取り消す</button><span class="sub">${mdHm(o.createdAt + Server.EDIT_HOURS * 36e5)}まで</span>` : ""}
          <span class="spacer"></span>${o.status !== "取消" ? h`<button class="btn sm ghost" data-act="nouhin" data-id="${o.id}">納品書</button>` : ""}</div>
      </article>`; }) : h`<div class="empty"><b>まだご注文はありません</b></div>`}</div></div>`;
  }
  function printNouhin(o, customer) {
    let doc = $(".print-doc"); if (!doc) { doc = document.createElement("div"); doc.className = "print-doc"; document.body.appendChild(doc); }
    doc.innerHTML = h`<h1>納品書</h1><p>${customer.company}<br><b>${customer.store} 御中</b></p><p>伝票番号 ${o.no}　納品日 ${jpDate(o.deliveryDate)}</p>
      <table><thead><tr><th>商品名</th><th>規格</th><th class="r">数量</th><th class="r">単価</th><th class="r">金額</th></tr></thead><tbody>${o.lines.map(l => h`<tr><td>${l.name}${Server.rateOf(l.cat) === 0.1 ? "" : " ※"}</td><td>${l.spec}</td><td class="r">${l.qty}${l.unit}（${l.qty * l.perCase}個）</td><td class="r">${yen(l.price)}</td><td class="r">${yen(l.amount)}</td></tr>`)}</tbody></table>
      <p class="r">8%対象 ${yen(o.base8)}（消費税 ${yen(o.t8)}）　10%対象 ${yen(o.base10)}（消費税 ${yen(o.t10)}）<br><b>合計 ${yen(o.total)}</b>　※は軽減税率対象</p><p>${SEED.company.name}　${SEED.company.address}</p>`.s;
    window.print();
  }

  /* ---------- 画面の切り替え ---------- */
  function route(hash) { if (location.hash !== hash) location.hash = hash; else render(); }
  function parse() {
    const hs = location.hash || "#/home"; const [, v, a] = hs.split("/");
    if (v === "admin") return { admin: true, tab: a || "dash" };
    return { view: v || "home", arg: a ? decodeURIComponent(a) : "" };
  }
  function render() {
    const r = parse();
    if (r.admin) { document.body.classList.add("admin"); if (window.ADMIN) window.ADMIN.render(r.tab); return; }
    document.body.classList.remove("admin");
    load();
    if (!S.me || S.me.role !== "shop" || r.view === "login") { S.me = Server.me(); if (S.me && S.me.role === "shop" && r.view === "login") { route("#/home"); return; } S.me = S.me && S.me.role === "shop" ? S.me : null; nav(); $("#app").innerHTML = loginView(S.loginMsg).s; S.loginMsg = ""; $("#cartbar").classList.remove("show"); return; }
    S.view = r.view;
    if (r.view === "list") S.cat = r.arg;
    if (r.view === "search") S.q = r.arg;
    const v = { home: homeView, list: listView, search: listView, fav: listView, sheet: sheetView, cart: cartView, hist: histView }[r.view] || homeView;
    $("#app").innerHTML = v().s;
    paintBg($("#app")); nav(); cartBar();
    if (r.view === "home" && S.q) searchInline();
  }
  // 数量が変わったときは、画面全体を描き直さずに、必要なところだけ直す（入力中の場所が飛ばない）
  function refresh() {
    if (S.view === "sheet") { $$("[data-row]").forEach(tr => { const id = tr.dataset.row, q = S.cart[id] || 0, i = S.byId[id]; tr.classList.toggle("on", !!q); const a = tr.querySelector("[data-amt]"); a.textContent = q ? yen(i.price * i.perCase * q) : ""; const inp = tr.querySelector("input"); if (document.activeElement !== inp) inp.value = q || ""; }); $("#sheetbar").innerHTML = sheetBar().s; nav(); return; }
    $$("[data-item]").forEach(el => { const i = S.byId[el.dataset.item]; if (!i) return; const tmp = document.createElement("div"); tmp.innerHTML = itemCard(i).s; const n = tmp.firstElementChild; if (el.outerHTML !== n.outerHTML) { el.replaceWith(n); paintBg(n.parentElement); } });
    const side = $("#side"); if (side) { readDraft(); side.innerHTML = cartPane(false).s; paintBg(side); }
    if (S.view === "cart") { readDraft(); $("#cartfull").innerHTML = cartPane(true).s; paintBg($("#app")); }
    if (S.view === "home") { const a = $("#app"); const y = scrollY; a.innerHTML = homeView().s; paintBg(a); if (S.q) searchInline(); scrollTo(0, y); }
    nav(); cartBar();
  }
  function cartBar() {
    const lines = cartLines(); const t = Server.totals(lines); const ck = Server.check(lines);
    const bar = $("#cartbar"); const show = lines.length && ["list", "search", "fav", "home"].includes(S.view);
    bar.classList.toggle("show", !!show);
    if (show) bar.innerHTML = h`<button data-go="#/cart"><span>カートを見る<small>　${lines.length}品目・${ck.issues.length ? ((ck.issues[0].match(/あと(\d+\S+?)）/) || [])[1] ? "食品あと" + ck.issues[0].match(/あと(\d+\S+?)）/)[1] : "条件をご確認ください") : "ご注文条件OK"}</small></span><span class="num">${yen(t.total)}</span></button>`.s;
  }
  function searchInline() {
    const box = $("#sres"); if (!box) return;
    if (!S.q.trim()) { box.innerHTML = ""; return; }
    S.view = "search"; const list = listOf(); S.view = "home";
    box.innerHTML = h`<div class="sec-h"><h2 class="ttl">「${S.q}」${list.length}品</h2></div>${listBody(list)}`.s; paintBg(box);
  }

  /* ---------- 操作 ---------- */
  document.addEventListener("click", e => {
    const g = e.target.closest("[data-go]"); const a = e.target.closest("[data-act]");
    if (a && a.dataset.act === "close") closeSheet();
    if (a && !g) { act(a.dataset.act, a, e); return; }
    if (g && !g.disabled) { e.preventDefault(); closeSheet(); route(g.dataset.go); }
  });
  function act(k, el, e) {
    const id = el.dataset.id, i = S.byId[id];
    switch (k) {
      case "add": { const u = Server.unitInfo(i.minText); setQty(id, u.kind === "item" && u.min > 1 ? u.min : 1); toast(`「${i.name}」をカートに入れました`); break; }
      case "add-n": setQty(id, (S.cart[id] || 0) + Number(el.dataset.n)); toast(`「${i.name}」を${el.dataset.n}${i.unit}入れました`); break;
      case "inc": setQty(id, (S.cart[id] || 0) + 1); break;
      case "dec": setQty(id, (S.cart[id] || 0) - 1); break;
      case "rm": { const snap = { ...S.cart }; setQty(id, 0); toast(`「${i.name}」を外しました`, () => { S.cart = snap; saveCart(); refresh(); }); break; }
      case "clear": { const snap = { ...S.cart }; S.cart = {}; saveCart(); refresh(); toast("カートを空にしました", () => { S.cart = snap; saveCart(); refresh(); }); break; }
      case "fav": S.favs[id] ? delete S.favs[id] : S.favs[id] = 1; LS.set("mko-fav:" + S.me.cid, S.favs); refresh(); break;
      case "vmode": S.vmode = el.dataset.v; LS.set("mko-vmode", S.vmode); render(); break;
      case "clear-q": S.q = ""; route("#/home"); break;
      case "usual-all": { const st = usualStats(); const snap = { ...S.cart }; st.usual.forEach(u => { S.cart[u.id] = Math.max(S.cart[u.id] || 0, u.qty, minOf(S.byId[u.id])); }); saveCart(); refresh(); toast(`いつもの${st.usual.length}品をカートに入れました`, () => { S.cart = snap; saveCart(); refresh(); }); break; }
      case "reorder": { const o = S.orders.find(x => x.id === id); const snap = { ...S.cart }; let n = 0; o.lines.forEach(l => { if (S.byId[l.id]) { S.cart[l.id] = Math.max((S.cart[l.id] || 0) + l.qty, minOf(S.byId[l.id])); n++; } }); saveCart(); toast(`${n}品をカートに入れました`, () => { S.cart = snap; saveCart(); refresh(); }); route("#/cart"); break; }
      case "sheet-usual": { usualStats().usual.forEach(u => { if (!S.cart[u.id]) S.cart[u.id] = u.qty; }); saveCart(); refresh(); toast("いつもの数を入れました"); break; }
      case "confirm": confirmOrder(); break;
      case "ck-add": setQty(id, Number(el.dataset.n)); confirmOrder(); break;
      case "send": send(); break;
      case "edit": {
        const o = S.orders.find(x => x.id === id); const ng = safe(() => Server.canEdit(id)); if (ng) { toast(ng + "、訂正できません"); return; }
        if (cartCount() && !S.edit) LS.set("mko-cart-hold:" + S.me.cid, S.cart);
        const cart = {}; o.lines.forEach(l => cart[l.id] = l.qty);
        S.edit = { id: o.id, no: o.no, until: mdHm(o.createdAt + Server.EDIT_HOURS * 36e5), cart }; S.cart = cart; S.draft = { date: o.deliveryDate, person: o.person, note: o.note }; saveCart();
        toast("ご注文の中身をカートに出しました。直したら「訂正を送る」へ"); route("#/cart"); break;
      }
      case "edit-quit": S.edit = null; localStorage.removeItem("mko-edit:" + S.me.cid); S.cart = LS.get("mko-cart-hold:" + S.me.cid, {}); localStorage.removeItem("mko-cart-hold:" + S.me.cid); saveCart(); S.draft.note = ""; S.draft.date = Server.deliveryOptions()[0]; render(); break;
      case "cancel": {
        const o = S.orders.find(x => x.id === id);
        openSheet("ご注文を取り消しますか", h`<div class="stack"><p>${jpDate(o.deliveryDate)}お届け（${o.no}・${yen(o.total)}）のご注文を取り消します。</p><div class="row"><button class="btn" data-act="close">やめる</button><button class="btn pri" data-act="cancel-do" data-id="${o.id}">取り消す</button></div></div>`); break;
      }
      case "cancel-do": if (safe(() => (Server.cancelOrder(id), true))) { closeSheet(); toast("ご注文を取り消しました"); render(); } break;
      case "nouhin": printNouhin(S.orders.find(x => x.id === id), S.me.customer); break;
      case "demo-login": doLogin(el.dataset.login, "shop-demo"); break;
      case "logout": Server.logout(); S.cart = {}; route("#/login"); break;
    }
  }
  async function doLogin(id, pw) {
    try { await Server.loginShop(id, pw); route("#/home"); }
    catch (err) { S.loginMsg = err.message; render(); }
  }
  document.addEventListener("submit", e => {
    if (e.target.id === "lf") { e.preventDefault(); const f = new FormData(e.target); doLogin(f.get("id"), f.get("pw")); }
  });
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "q") { S.q = t.value; if (S.view === "home") searchInline(); else { clearTimeout(act.qt); act.qt = setTimeout(() => { if (S.q.trim()) { history.replaceState(null, "", "#/search/" + encodeURIComponent(S.q)); S.view = "search"; } $("#results").innerHTML = listBody(listOf()).s; paintBg($("#results")); }, 120); } }
    if (t.id === "sq") { S.sheetQ = t.value; const pos = t.selectionStart; $("#app").innerHTML = sheetView().s; paintBg($("#app")); const n = $("#sq"); n.focus(); n.setSelectionRange(pos, pos); }
    if (t.dataset.sq) setQty(t.dataset.sq, t.value);
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.qty) setQty(t.dataset.qty, t.value);
    if (["d-date", "d-person", "d-note"].includes(t.id)) readDraft();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeSheet();
    const t = e.target;
    if (t.dataset && t.dataset.sq && (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault(); const all = $$("input[data-sq]"); const k = all.indexOf(t) + (e.key === "ArrowUp" ? -1 : 1);
      if (all[k]) { all[k].focus(); all[k].select(); }
    }
    if (t.id === "q" && e.key === "Enter" && S.q.trim()) { route("#/search/" + encodeURIComponent(S.q.trim())); }
  });
  window.addEventListener("hashchange", () => { closeSheet(); render(); scrollTo(0, 0); });
  // 別のタブでログアウト・注文したときも合わせる
  window.addEventListener("storage", e => { if (e.key && e.key.startsWith("mko-")) render(); });
  const start = () => {
    $("#logout").addEventListener("click", () => { const adm = document.body.classList.contains("admin"); Server.logout(); S.cart = {}; toast("ログアウトしました"); route(adm ? "#/admin" : "#/login"); if (adm) render(); });
    $("#reset").addEventListener("click", () => { Server.resetDemo(); Object.keys(localStorage).filter(k => k.startsWith("mko-")).forEach(k => localStorage.removeItem(k)); toast("デモのデータを最初の状態に戻しました"); route("#/login"); });
    render();
  };
  // gate.js が合言葉を確かめたあとで読み込むので、読み込んだ時点で始める
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

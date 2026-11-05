/* ============================================================
   サーバーの代わり（デモ用）
   本番では、ここに書いた「誰が・何を・どこまでできるか」を、Supabase の
   RLS（行ごとの権限）と、サーバー側の関数（SECURITY DEFINER の RPC）で守ります。
   画面側（app.js）は、この Server を通してしかデータに触れません。
   - 取引先は、自分の店の注文・単価しか見えない（取引先IDは画面から渡させない）
   - 単価・合計はサーバー側で計算し直す（画面から送られた金額は使わない）
   - 原価・仕入先の情報は、管理者にしか返さない
   ============================================================ */
(() => {
  "use strict";
  const KEY = "mko-demo-v3", SKEY = "mko-sess-v1";
  const DAY = 864e5, HOUR = 36e5;
  const ADMIN_IDLE_MS = 15 * 60e3, SHOP_IDLE_MS = 8 * HOUR;
  const MAX_FAIL = 5, LOCK_MS = 60e3;
  const SALT = "0sbPZZezRRLdKcNNyGg+Lg==";
  const HASH = { admin: "V7CQZGH0SgdH4TA/ifbKIXdE0lKQtMpjF38lMMdBvdg=", shop: "GkKnz90hzIKtatUP61+AeeUw73P+Ns7G9MWVhaRurmI=" };
  const FOOD_CATS = ["麺類", "お菓子", "飲料", "オロナミンC", "食品"];
  const TAX10_CATS = ["日用品"];
  const FOOD_MIN = 15;
  const STATUSES = ["受注", "出荷準備", "出荷済", "納品済"];
  const EDIT_HOURS = 24;

  class AuthError extends Error {}
  class RuleError extends Error {}

  /* ---------- 保存 ---------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  let db;
  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.ver === 1) return j; } catch (e) {}
    return fresh();
  }
  function fresh() {
    const d = { ver: 1, items: clone(SEED.items), customers: clone(SEED.customers), prices: clone(SEED.prices), orders: [], audit: [], seq: 1200, snap: null, fail: {} };
    d.orders = genOrders(d);
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

  /* ---------- 見本の注文履歴 ---------- */
  function genOrders(d) {
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sets = SEED.sets;
    const out = []; const now = Date.now();
    d.customers.forEach(c => {
      const base = sets[c.id] || []; let t = now - 70 * DAY;
      for (let k = 0; k < 9; k++) {
        t += (7 + Math.round((rnd() - .5) * 2)) * DAY; if (t > now - 4 * DAY) break;
        const lines = base.filter((_, j) => rnd() < (j < 6 ? .95 : .5)).map(id => ({ id, qty: 1 + Math.round(rnd() * 2) }));
        const o = build(d, c.id, lines, { createdAt: t, date: iso(t + 2 * DAY), person: c.contact.split(" ").pop(), note: "" });
        o.status = "納品済"; o.statusAt = { 受注: t, 出荷準備: t + 3 * HOUR, 出荷済: t + DAY, 納品済: t + 2 * DAY };
        out.push(o);
      }
    });
    // 柏店：出荷済が1件、まだ訂正できる受注が1件
    const a = build(d, "c101", sets.c101.slice(0, 7).map(id => ({ id, qty: 2 })), { createdAt: now - 2 * DAY, date: iso(now), person: "山田", note: "" });
    a.status = "出荷済"; a.statusAt = { 受注: now - 2 * DAY, 出荷準備: now - 2 * DAY + 3 * HOUR, 出荷済: now - DAY };
    out.push(a);
    const b = build(d, "c101", sets.c101.slice(0, 6).map((id, k) => ({ id, qty: [3, 2, 2, 3, 4, 2][k] })), { createdAt: now - 3 * HOUR, date: iso(nextBizDay(now, 2)), person: "山田", note: "裏口に置いてください" });
    out.push(b);
    const c = build(d, "c201", sets.c201.slice(0, 6).map(id => ({ id, qty: 3 })), { createdAt: now - 5 * HOUR, date: iso(nextBizDay(now, 2)), person: "鈴木", note: "" });
    out.push(c);
    return out.sort((x, y) => y.createdAt - x.createdAt);
  }

  /* ---------- 日付 ---------- */
  function iso(t) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function nextBizDay(t, n) { let d = new Date(t); let k = 0; while (k < n) { d = new Date(d.getTime() + DAY); if (d.getDay() !== 0) k++; } return d.getTime(); }
  function deliveryOptions(now = Date.now()) {
    const first = new Date(now).getHours() < 15 ? 1 : 2; // 15時までのご注文は翌営業日
    const out = []; for (let k = first; out.length < 6; k++) out.push(iso(nextBizDay(now, k))); return out;
  }

  /* ---------- 注文のルール ---------- */
  function unitInfo(t) {
    t = String(t || "").trim();
    let m = t.match(/^([☆★◆◇△])\s*混載可能\s*(\d+)\s*([^\d〜（]*)〜/);
    if (m) return { kind: "mark", mark: m[1], min: +m[2], u: m[3] || "ケース", label: `${m[1]}印どうし合わせて${m[2]}${m[3] || "ケース"}〜` };
    m = t.match(/^(\d+)\s*([^\d〜（]*)〜（1商品につき）/);
    if (m) return { kind: "item", min: +m[1], u: m[2] || "ケース", label: `1商品${m[1]}${m[2] || "ケース"}〜` };
    m = t.match(/^(\d+)\s*([^\d〜（]*)〜(?:（(.+)）)?/);
    if (m) return { kind: "item", min: +m[1], u: m[2] || "ケース", label: `${m[1]}${m[2] || "ケース"}から`, extra: m[3] || "" };
    return { kind: "free", min: 0, u: "ケース", label: t || "数量はご相談" };
  }
  const rateOf = cat => TAX10_CATS.includes(cat) ? 0.1 : 0.08;
  function check(lines) {
    const goals = [], issues = [];
    const food = lines.filter(l => FOOD_CATS.includes(l.cat)).reduce((a, l) => a + l.qty, 0);
    if (food > 0) goals.push({ key: "food", label: "麺類・お菓子・飲料・食品", have: food, need: FOOD_MIN, u: "ケース" });
    const mk = {};
    lines.forEach(l => { const u = unitInfo(l.minText); if (u.kind === "mark") (mk[u.mark] = mk[u.mark] || { key: "mk" + u.mark, label: `${u.mark}印の商品`, have: 0, need: u.min, u: u.u }).have += l.qty; });
    Object.values(mk).forEach(g => goals.push(g));
    goals.forEach(g => { if (g.have < g.need) issues.push(`${g.label}は合わせて${g.need}${g.u}から（あと${g.need - g.have}${g.u}）`); });
    lines.forEach(l => { const u = unitInfo(l.minText); if (u.kind === "item" && u.min > 1 && l.qty < u.min) issues.push(`「${l.name}」は${u.label}`); });
    return { goals, issues };
  }
  function totals(lines) {
    const by = { 0.08: 0, 0.1: 0 };
    lines.forEach(l => by[rateOf(l.cat)] += l.amount);
    const t8 = Math.round(by[0.08] * 0.08), t10 = Math.round(by[0.1] * 0.1); // 税率ごとに1回だけ端数処理（インボイス対応）
    const sub = by[0.08] + by[0.1];
    return { sub, base8: by[0.08], base10: by[0.1], t8, t10, tax: t8 + t10, total: sub + t8 + t10 };
  }

  /* ---------- 単価（サーバーで決める） ---------- */
  function unitPrice(d, cid, it) { const p = d.prices[cid] && d.prices[cid][it.id]; return Number.isFinite(p) ? p : it.price; }
  function build(d, cid, rawLines, meta) {
    const byId = Object.fromEntries(d.items.map(i => [i.id, i]));
    const merged = {};
    rawLines.forEach(r => { merged[r.id] = (merged[r.id] || 0) + r.qty; });
    const lines = Object.entries(merged).map(([id, qty]) => {
      const it = byId[id];
      const price = unitPrice(d, cid, it);
      return { id, name: it.name, spec: it.spec, cat: it.cat, unit: it.unit, perCase: it.perCase, unitBased: !!it.unitBased, minText: it.minText, icon: it.icon, photo: it.photo || "", jan: it.jan, qty, price, amount: price * it.perCase * qty };
    });
    const c = d.customers.find(x => x.id === cid);
    const t = meta.createdAt || Date.now();
    const o = { id: "o" + (++d.seq), no: `W${iso(t).replace(/-/g, "").slice(2)}-${d.seq}`, customerId: cid, store: c.store, createdAt: t, deliveryDate: meta.date, person: meta.person || "", note: meta.note || "",
      lines, ...totals(lines), status: "受注", statusAt: { 受注: t }, edits: [] };
    return o;
  }

  /* ---------- ログイン ---------- */
  const b64 = u8 => btoa(String.fromCharCode(...new Uint8Array(u8)));
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function pbkdf2(pw) {
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64(SALT), iterations: 150000 }, k, 256));
  }
  function same(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
  function token() { const u = new Uint8Array(24); crypto.getRandomValues(u); return b64(u).replace(/[+/=]/g, ""); }
  function lockLeft(key) { const f = db.fail[key]; return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0; }
  function failed(key) {
    const f = db.fail[key] = db.fail[key] || { n: 0, until: 0 };
    f.n++; if (f.n >= MAX_FAIL) { f.until = Date.now() + LOCK_MS; f.n = 0; }
    save();
  }
  let pending2fa = null;
  let sess = null;
  try { sess = JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) {}
  function setSess(s) { sess = s; try { s ? sessionStorage.setItem(SKEY, JSON.stringify(s)) : sessionStorage.removeItem(SKEY); } catch (e) {} }
  function ctx() {
    if (!sess) throw new AuthError("ログインしてください");
    const idle = sess.role === "admin" ? ADMIN_IDLE_MS : SHOP_IDLE_MS;
    if (Date.now() - sess.last > idle) { const r = sess.role; setSess(null); throw new AuthError(r === "admin" ? "15分間操作がなかったため、管理画面からログアウトしました" : "時間がたったため、ログアウトしました"); }
    sess.last = Date.now(); setSess(sess);
    return sess;
  }
  // 見るだけ（操作の時刻を更新しない）。自動ログアウトの判定に使う
  function peek() {
    if (!sess) throw new AuthError("");
    const idle = sess.role === "admin" ? ADMIN_IDLE_MS : SHOP_IDLE_MS;
    if (Date.now() - sess.last > idle) { setSess(null); throw new AuthError(""); }
    return sess;
  }
  const needAdmin = c => { if (c.role !== "admin") throw new AuthError("この操作は管理者だけができます"); };
  function log(c, act, detail) { db.audit.unshift({ t: Date.now(), who: c.role === "admin" ? "管理者" : (db.customers.find(x => x.id === c.cid) || {}).store, act, detail }); db.audit = db.audit.slice(0, 300); }

  /* ---------- 入力のチェック ---------- */
  const clean = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  function linesFrom(d, cid, raw) {
    if (!Array.isArray(raw) || raw.length > 300) throw new RuleError("ご注文の内容が正しくありません");
    const vis = new Set(visibleItems(d, cid).map(i => i.id));
    return raw.map(r => {
      const qty = Number(r && r.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw new RuleError("数量は1〜999の整数で入れてください");
      if (!vis.has(r.id)) throw new RuleError("取り扱いのない商品が入っています");
      return { id: r.id, qty }; // 画面から来た金額・商品名などは捨てる
    });
  }
  function visibleItems(d, cid) { return d.items.filter(i => i.active && (!i.only || i.only.includes(cid))); }

  /* ---------- 取引先の操作 ---------- */
  function _catalog(c, d = db) {
    if (c.role === "admin") return clone(d.items);
    return visibleItems(d, c.cid).map(i => ({ id: i.id, cat: i.cat, section: i.section, name: i.name, spec: i.spec, perCase: i.perCase, pcs: i.pcs, unit: i.unit, unitBased: !!i.unitBased, minText: i.minText, note: i.note || "", frozen: !!i.frozen, ball: i.ball || 0, icon: i.icon, photo: i.photo || "", photo2: i.photo2 || "", jan: i.jan,
      price: unitPrice(d, c.cid, i), base: i.price })); // 原価・他店の単価は返さない
  }
  function _orders(c, d = db) { return clone(c.role === "admin" ? d.orders : d.orders.filter(o => o.customerId === c.cid)); }
  function own(c, d, id) {
    const o = d.orders.find(x => x.id === id);
    if (!o || (c.role !== "admin" && o.customerId !== c.cid)) throw new AuthError("この注文は見つかりません"); // 他店の注文は「無い」と同じ扱い
    return o;
  }
  function editable(c, o) {
    if (o.status !== "受注") return "出荷の準備が始まったため";
    if (c.role !== "admin" && Date.now() - o.createdAt > EDIT_HOURS * HOUR) return "ご注文から24時間を過ぎたため";
    return "";
  }
  function _place(c, d, payload, dry) {
    if (c.role !== "shop") throw new AuthError("お店のアカウントでご注文ください");
    const lines = linesFrom(d, c.cid, payload.lines);
    if (!lines.length) throw new RuleError("商品が入っていません");
    if (!deliveryOptions().includes(payload.date)) throw new RuleError("お届け日を選び直してください");
    const o = build(d, c.cid, lines, { date: payload.date, person: clean(payload.person, 20), note: clean(payload.note, 200) });
    const ck = check(o.lines);
    if (ck.issues.length) { d.seq--; throw new RuleError(ck.issues[0]); }
    if (dry) { d.seq--; return o; }
    d.orders.unshift(o); log(c, "注文", `${o.no}（${o.lines.length}品目・税込${o.total.toLocaleString()}円）`); save();
    return clone(o);
  }
  function _edit(c, d, id, payload) {
    const o = own(c, d, id); const ng = editable(c, o); if (ng) throw new RuleError(ng + "、訂正できません。ミナカワまでお電話ください");
    const lines = linesFrom(d, o.customerId, payload.lines);
    if (!deliveryOptions(o.createdAt).concat(deliveryOptions()).includes(payload.date)) throw new RuleError("お届け日を選び直してください");
    const before = o.lines.map(l => `${l.name}×${l.qty}`).join("、");
    const n = build(d, o.customerId, lines, { createdAt: o.createdAt, date: payload.date, person: clean(payload.person, 20), note: clean(payload.note, 200) }); d.seq--;
    const ck = check(n.lines); if (ck.issues.length) throw new RuleError(ck.issues[0]);
    Object.assign(o, { lines: n.lines, sub: n.sub, base8: n.base8, base10: n.base10, t8: n.t8, t10: n.t10, tax: n.tax, total: n.total, deliveryDate: n.deliveryDate, person: n.person, note: n.note });
    o.edits.push({ t: Date.now(), before }); log(c, "注文の訂正", o.no); save();
    return clone(o);
  }
  function _cancel(c, d, id) {
    const o = own(c, d, id); const ng = editable(c, o); if (ng) throw new RuleError(ng + "、取り消せません。ミナカワまでお電話ください");
    o.status = "取消"; o.statusAt["取消"] = Date.now(); log(c, "注文の取り消し", o.no); save();
  }

  /* ---------- 管理者の操作 ---------- */
  function _setStatus(c, d, id, st) {
    needAdmin(c); if (!STATUSES.includes(st)) throw new RuleError("状態が正しくありません");
    const o = own(c, d, id); o.status = st; o.statusAt[st] = Date.now(); log(c, "状態の変更", `${o.no} → ${st}`); save(); return clone(o);
  }
  function _savePrices(c, d, changes) {
    needAdmin(c); let n = 0;
    changes.forEach(ch => {
      const it = d.items.find(i => i.id === ch.id); const p = Number(ch.price);
      if (!it || !Number.isFinite(p) || p <= 0 || p > 1e6) throw new RuleError("単価は1〜1,000,000の数字で入れてください");
      if (it.price !== p) { log(c, "単価の変更", `${it.name} ${it.price}円 → ${p}円`); it.price = Math.round(p * 10) / 10; n++; }
    });
    save(); return n;
  }
  function _import(c, d, rows, opt) {
    needAdmin(c);
    if (!Array.isArray(rows) || rows.length > 5000) throw new RuleError("一度に取り込めるのは5,000行までです");
    d.snap = { t: Date.now(), items: clone(d.items) };
    const byKey = {}; d.items.forEach(i => { byKey["id:" + i.id] = i; if (i.jan) byKey["jan:" + i.jan] = i; byKey["nm:" + i.name + "|" + i.spec] = i; });
    const seen = new Set(); let add = 0, upd = 0, stop = 0;
    rows.forEach(r => {
      const it = (r.id && byKey["id:" + r.id]) || (r.jan && byKey["jan:" + r.jan]) || byKey["nm:" + r.name + "|" + r.spec];
      const price = Number(r.price), perCase = Number(r.perCase);
      if (!Number.isFinite(price) || price <= 0 || price > 1e6 || !Number.isInteger(perCase) || perCase < 1 || perCase > 1000 || !clean(r.name, 80) || !clean(r.cat, 20)) throw new RuleError("取り込む内容に、正しくない行があります"); // 画面側のチェックをすり抜けても、ここで止める
      const f = { cat: clean(r.cat, 20), name: clean(r.name, 80), perCase, price };
      if (r.section !== undefined) f.section = clean(r.section, 20);
      if (r.spec !== undefined) f.spec = clean(r.spec, 30);
      if (r.unit !== undefined) f.unit = clean(r.unit, 6) || "ケース";
      if (r.minText !== undefined) f.minText = clean(r.minText, 40) || "1ケース〜";
      if (r.jan) f.jan = clean(r.jan, 14);
      if (r.active !== undefined) f.active = r.active !== false;
      if (r.cost != null && Number.isFinite(Number(r.cost))) f.cost = Number(r.cost);
      if (it) { Object.assign(it, f); seen.add(it.id); upd++; }
      else { const id = "p" + String(d.items.length + 1).padStart(3, "0") + "n"; d.items.push({ id, icon: iconFor(f.cat, f.name), section: f.cat, spec: "", unit: "ケース", minText: "1ケース〜", jan: "", active: true, ...f }); seen.add(id); add++; }
    });
    if (opt && opt.stopMissing) d.items.forEach(i => { if (!seen.has(i.id) && i.active) { i.active = false; stop++; } });
    log(c, "商品表の取り込み", `${opt && opt.file ? opt.file + "：" : ""}新規${add}・更新${upd}・販売停止${stop}`); save();
    return { add, upd, stop };
  }
  function iconFor(cat, name) {
    const w = [["カップ麺|麺|うどん|そば", "noodle"], ["チップス|スナック", "chips"], ["チョコ", "choco"], ["キャンディ|飴|グミ", "candy"], ["栄養|ドリンク", "drink"], ["炭酸|コーラ|サイダー", "soda"],
      ["茶", "tea"], ["水", "water"], ["ジュース", "juice"], ["牛乳|ミルク", "milk"], ["カレー", "curry"], ["米|ごはん", "rice"], ["肉|豚|牛|鶏", "meat"], ["ぎょうざ|餃子", "gyoza"],
      ["キャベツ", "cabbage"], ["たまねぎ|玉ねぎ", "onion"], ["にんじん", "carrot"], ["じゃがいも", "potato"], ["たまご|卵", "eggs"], ["みかん", "mikan"], ["りんご", "apple"], ["バナナ", "banana"],
      ["トイレット", "toilet"], ["ティッシュ", "tissue"], ["ラップ", "wrap"], ["スポンジ", "sponge"], ["洗剤", "detergent"], ["ゴミ袋|ごみ袋", "trashbag"]];
    const hit = w.find(([re]) => new RegExp(re).test(name)); if (hit) return hit[1];
    return { 麺類: "noodle", お菓子: "chips", 飲料: "tea", 栄養ドリンク: "drink", 食品: "curry", "冷凍・お肉": "meat", 生鮮: "cabbage", 日用品: "toilet" }[cat] || "detergent";
  }
  function _undoImport(c, d) { needAdmin(c); if (!d.snap) throw new RuleError("戻せる取り込みがありません"); d.items = d.snap.items; d.snap = null; log(c, "取り込みを元に戻す", ""); save(); }

  /* ---------- 安全チェック（管理者だけが実行できる自己点検） ---------- */
  function _selfTest(c) {
    needAdmin(c);
    const d = clone(db); // 本物のデータは触らない（コピーで試す）
    const A = { role: "shop", cid: "c101" }, B = "c201";
    const P1 = d.items[0].id, PB = Object.keys(d.prices[B] || {}).find(id => !(d.prices.c101 || {})[id]);
    const res = [];
    const t = (name, fn) => { try { const r = fn(); res.push({ name, ok: r === true, note: typeof r === "string" ? r : "" }); } catch (e) { res.push({ name, ok: false, note: "予期しないエラー：" + e.message }); } };
    const denied = fn => { try { fn(); return false; } catch (e) { return e instanceof AuthError || e instanceof RuleError; } };
    t("取引先Aから、他の取引先の注文が見えない", () => _orders(A, d).every(o => o.customerId === "c101") && _orders(A, d).length > 0);
    t("取引先Aが、他の取引先の注文を取り消せない", () => { const ob = d.orders.find(o => o.customerId === B && o.status === "受注"); return !!ob && denied(() => _cancel(A, d, ob.id)); });
    t("取引先Aが、他の取引先の注文を訂正できない", () => { const ob = d.orders.find(o => o.customerId === B && o.status === "受注"); return !!ob && denied(() => _edit(A, d, ob.id, { lines: [{ id: P1, qty: 20 }], date: deliveryOptions()[0] })); });
    t("画面から「1円」と送っても、サーバーの単価で計算される", () => { const o = _place(A, d, { lines: [{ id: P1, qty: 15, price: 1, amount: 1 }], date: deliveryOptions()[0] }, true); return o.lines[0].price === unitPrice(d, "c101", d.items[0]) && o.sub > 15; });
    t("数量にマイナス・小数・とても大きい数を入れると、はじかれる", () => [-1, 0, 1.5, 1e9, "3; drop table"].every(q => denied(() => _place(A, d, { lines: [{ id: P1, qty: q }], date: deliveryOptions()[0] }, true))));
    t("取り扱いのない商品IDを送ると、はじかれる", () => denied(() => _place(A, d, { lines: [{ id: "zz-none", qty: 20 }], date: deliveryOptions()[0] }, true)));
    t("取引先の画面に、原価が届かない", () => _catalog(A, d).every(i => !("cost" in i)));
    t("他の取引先だけの特別価格が、取引先Aに見えない", () => { const i = _catalog(A, d).find(x => x.id === PB); return !!i && i.price === d.items.find(x => x.id === PB).price; });
    t("取引先Aが、商品表の取り込みを実行できない", () => denied(() => _import(A, d, [], {})));
    t("取引先Aが、単価を書き換えられない", () => denied(() => _savePrices(A, d, [{ id: P1, price: 1 }])));
    t("取引先Aが、注文の状態（出荷済など）を変えられない", () => denied(() => _setStatus(A, d, d.orders.find(o => o.customerId === "c101").id, "納品済")));
    t("出荷の準備が始まった注文は、お店から訂正できない", () => { const o = d.orders.find(x => x.customerId === "c101" && x.status !== "受注"); return denied(() => _cancel(A, d, o.id)); });
    t("ご注文から24時間を過ぎると、お店から訂正できない", () => { const o = d.orders.find(x => x.customerId === "c101" && x.status === "受注"); o.createdAt -= 25 * HOUR; return denied(() => _cancel(A, d, o.id)); });
    t("ご注文条件（食品は合わせて15ケース〜）を満たさない注文は、サーバー側でも受け付けない", () => denied(() => _place(A, d, { lines: [{ id: P1, qty: 2 }], date: deliveryOptions()[0] }, true)));
    t("備考に制御文字や長すぎる文を入れても、200文字に切り詰めて保存", () => { const o = _place(A, d, { lines: [{ id: P1, qty: 15 }], date: deliveryOptions()[0], note: "a\u0000b".repeat(500) }, true); return o.note.length <= 200 && !/\u0000/.test(o.note); });
    t("ブラウザの保存領域に、パスワードを保存していない", () => { const all = JSON.stringify(localStorage) + JSON.stringify(sessionStorage); return !/minakawa-demo|shop-demo/.test(all); });
    t("管理画面は、15分操作がないと自動でログアウトする", () => ADMIN_IDLE_MS === 15 * 60e3 ? true : "設定がちがいます");
    t("ログインを5回まちがえると、1分間ロックされる", () => MAX_FAIL === 5 && LOCK_MS === 60e3);
    return res;
  }

  /* ---------- 公開する窓口（画面からはこれだけ使える） ---------- */
  db = load();
  const wrap = fn => (...a) => fn(ctx(), db, ...a);
  window.Server = Object.freeze({
    AuthError, RuleError, FOOD_CATS, FOOD_MIN, STATUSES, EDIT_HOURS,
    unitInfo, check, totals, rateOf, deliveryOptions, iso,
    me() { try { const c = peek(); return { role: c.role, cid: c.cid, customer: c.cid ? clone(db.customers.find(x => x.id === c.cid)) : null, exp: c.last }; } catch (e) { return null; } },
    lockLeft: who => lockLeft(who),
    async loginShop(id, pw) {
      id = clean(id, 20).toLowerCase(); const lk = lockLeft("shop:" + id); if (lk) throw new AuthError(`ログインの失敗が続いたため、${lk}秒お待ちください`);
      const c = db.customers.find(x => x.loginId === id); const h = await pbkdf2(String(pw || ""));
      if (!c || !same(h, HASH.shop)) { failed("shop:" + id); throw new AuthError("ログインIDかパスワードがちがいます"); } // どちらが違うかは言わない
      db.fail["shop:" + id] = null; setSess({ t: token(), role: "shop", cid: c.id, last: Date.now() }); log(sess, "ログイン", ""); save();
    },
    async loginAdmin(pw) {
      const lk = lockLeft("admin"); if (lk) throw new AuthError(`ログインの失敗が続いたため、${lk}秒お待ちください`);
      const h = await pbkdf2(String(pw || ""));
      if (!same(h, HASH.admin)) { failed("admin"); throw new AuthError("パスワードがちがいます"); }
      const u = new Uint32Array(1); crypto.getRandomValues(u);
      pending2fa = { code: String(u[0] % 1e6).padStart(6, "0"), until: Date.now() + 5 * 60e3, n: 0 };
      return pending2fa.code; // デモでは画面に表示する。本番はスマホの認証アプリ（TOTP）
    },
    verify2fa(code) {
      if (!pending2fa || Date.now() > pending2fa.until) { pending2fa = null; throw new AuthError("確認コードの期限が切れました。最初からやり直してください"); }
      if (String(code).trim() !== pending2fa.code) { if (++pending2fa.n >= 3) { pending2fa = null; failed("admin"); throw new AuthError("確認コードを3回まちがえました。最初からやり直してください"); } throw new AuthError("確認コードがちがいます"); }
      pending2fa = null; setSess({ t: token(), role: "admin", cid: null, last: Date.now() }); log(sess, "管理画面にログイン", ""); save();
    },
    logout() { if (sess) { log(sess, "ログアウト", ""); save(); } setSess(null); },
    catalog: wrap(c => _catalog(c)),
    orders: wrap(c => _orders(c)),
    placeOrder: wrap((c, d, p) => _place(c, d, p, false)),
    preview: wrap((c, d, p) => _place(c, d, p, true)),
    editOrder: wrap(_edit),
    cancelOrder: wrap(_cancel),
    canEdit: wrap((c, d, id) => editable(c, own(c, d, id))),
    // 管理者だけ
    customers: wrap(c => { needAdmin(c); return clone(db.customers).map(x => ({ ...x, special: Object.keys(db.prices[x.id] || {}).length })); }),
    setStatus: wrap(_setStatus),
    savePrices: wrap(_savePrices),
    importItems: wrap(_import),
    undoImport: wrap(_undoImport),
    canUndo: wrap(c => { needAdmin(c); return db.snap ? db.snap.t : 0; }),
    audit: wrap(c => { needAdmin(c); return clone(db.audit); }),
    selfTest: wrap(c => _selfTest(c)),
    iconFor,
    resetDemo() { localStorage.removeItem(KEY); setSess(null); db = fresh(); },
  });
})();

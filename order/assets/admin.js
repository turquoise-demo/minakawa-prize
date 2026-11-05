/* ミナカワ発注（デモ）— 管理画面（ミナカワ社内だけ）
   入口は発注画面の中（#/admin）。パスワード＋確認コードの2段階で入る。
   商品と単価は、いつものExcel（またはCSV）をそのまま取り込める。 */
(() => {
  "use strict";
  const { h, raw, esc, yen, num, jpDate, mdHm, $, $$, ill, toast, openSheet, closeSheet, CAT_COLOR } = window.APP;
  const A = { tab: "dash", step: 1, code: "", msg: "", oFilter: "未完了", sel: null, q: "", cat: "", draft: {}, imp: null, test: null };

  const guard = fn => { try { return fn(); } catch (e) { if (e instanceof Server.AuthError) { A.msg = e.message; A.step = 1; draw(); return null; } if (e instanceof Server.RuleError) { toast(e.message); return null; } throw e; } };
  const isAdmin = () => { const m = Server.me(); return m && m.role === "admin"; };

  function nav() {
    $("#tnav").innerHTML = ""; $("#bnav").innerHTML = ""; $("#bnav").classList.add("hide");
    $("#who").innerHTML = isAdmin() ? h`<small>ミナカワ社内</small><b>管理画面</b>`.s : h`<small>ミナカワ社内</small><b>管理画面</b>`.s;
    $("#logout").classList.toggle("hide", !isAdmin());
    $("#cartbar").classList.remove("show");
  }
  function paint(root) {
    $$("[data-cat-bg]", root).forEach(el => el.style.setProperty("--bg", CAT_COLOR[el.dataset.catBg] || "#fdf5e1"));
    $$("[data-w]", root).forEach(el => el.style.width = Math.min(100, Number(el.dataset.w) || 0) + "%");
  }
  function draw() {
    nav();
    const app = $("#app");
    if (!isAdmin()) { app.innerHTML = gate().s; const f = app.querySelector("input"); if (f) f.focus(); return; }
    const tabs = [["dash", "ホーム"], ["orders", "受注"], ["items", "商品と単価"], ["import", "Excel取り込み"], ["customers", "取引先"], ["security", "安全チェック"], ["audit", "操作の記録"]];
    const open = guard(() => Server.orders().filter(o => o.status === "受注").length) || 0;
    const body = guard(() => ({ dash, orders, items, import: imp, customers, security, audit }[A.tab] || dash)());
    if (body === null) return;
    app.innerHTML = h`<div class="wrap adm"><nav aria-label="管理メニュー">${tabs.map(([k, l]) => h`<button data-adm="${k}"${A.tab === k ? raw(' aria-current="page"') : ""}>${l}${k === "orders" && open ? h`<span class="pill red">${open}</span>` : ""}</button>`)}
      <div class="sess">15分操作がないと自動でログアウトします<br><a href="#/home">お客様の画面へ</a></div></nav><div class="stack">${body}</div></div>`.s;
    paint(app);
  }

  /* ---------- 入口（パスワード → 確認コード） ---------- */
  function gate() {
    const lk = Server.lockLeft("admin");
    if (A.step === 2) return h`<div class="gate card pad stack"><span class="en">STEP 2 / 2</span><h1 class="ttl h2">確認コード</h1>
      <p class="sub">スマホの認証アプリに出ている6桁の数字を入れてください。</p>
      <div class="msg warn">デモ用：いまの確認コードは <b class="code">${A.code}</b>（本番では画面に出ません）</div>
      <form id="g2" class="stack"><label class="field">確認コード<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
      ${A.msg ? h`<div class="msg bad" role="alert">${A.msg}</div>` : ""}<button class="btn pri lg wide">ログイン</button></form></div>`;
    return h`<div class="gate card pad stack"><span class="en">ADMIN</span><h1 class="ttl h2">管理画面にログイン</h1>
      <p class="sub">ミナカワ社内の人だけが使う画面です。取引先のアカウントでは入れません。</p>
      <form id="g1" class="stack"><input class="hide" name="username" autocomplete="username" value="admin" readonly tabindex="-1" aria-hidden="true">
      <label class="field">管理者パスワード<input name="pw" type="password" autocomplete="current-password" required maxlength="64"${lk ? raw(" disabled") : ""}></label>
      ${lk ? h`<div class="msg bad" role="alert">ログインの失敗が続いたため、${lk}秒お待ちください</div>` : A.msg ? h`<div class="msg bad" role="alert">${A.msg}</div>` : ""}
      <button class="btn pri lg wide"${lk ? raw(" disabled") : ""}>次へ</button></form>
      <div class="msg info">デモ用のパスワード：<b class="code">minakawa-demo</b><br>5回まちがえると1分ロック。入ったあと15分さわらないと自動でログアウトします。</div>
      <p class="sub"><a href="#/home">← お客様の発注画面へ</a></p></div>`;
  }

  /* ---------- ホーム ---------- */
  function dash() {
    const os = Server.orders(); const today = Server.iso(Date.now()); const mon = today.slice(0, 7);
    const todays = os.filter(o => Server.iso(o.createdAt) === today && o.status !== "取消");
    const open = os.filter(o => o.status === "受注"), prep = os.filter(o => o.status === "出荷準備");
    const month = os.filter(o => Server.iso(o.createdAt).startsWith(mon) && o.status !== "取消");
    const sales = month.reduce((a, o) => a + o.sub, 0);
    const items = Server.catalog(); const cost = month.reduce((a, o) => a + o.lines.reduce((b, l) => { const it = items.find(i => i.id === l.id); return b + (it && it.cost ? it.cost * l.perCase * l.qty : 0); }, 0), 0);
    const tomorrow = Server.deliveryOptions()[0];
    const ship = os.filter(o => o.deliveryDate === tomorrow && o.status !== "取消" && o.status !== "納品済");
    const pick = {}; ship.forEach(o => o.lines.forEach(l => pick[l.id] = { name: l.name, unit: l.unit, qty: (pick[l.id] ? pick[l.id].qty : 0) + l.qty }));
    return h`<div><span class="en">DASHBOARD</span><h1 class="ttl h2">今日のようす</h1></div>
      <div class="kpis"><div class="kpi${open.length ? " hot" : ""}"><small>まだ確認していない受注</small><b class="num">${open.length}件</b></div><div class="kpi"><small>今日の受注</small><b class="num">${todays.length}件</b></div>
        <div class="kpi"><small>今月の売上（税抜）</small><b class="num">${yen(sales)}</b></div><div class="kpi"><small>今月の粗利率（見込み）</small><b class="num">${sales ? Math.round((sales - cost) / sales * 100) : 0}%</b></div></div>
      <div class="card pad stack"><div class="row"><b class="ttl h3">新しい受注</b><span class="spacer"></span><button class="btn sm" data-adm="orders">受注をすべて見る</button></div>
        ${open.length ? orderTable(open) : h`<p class="sub">確認待ちの受注はありません。</p>`}</div>
      <div class="card pad stack"><div class="row"><b class="ttl h3">${jpDate(tomorrow)}お届け分のピッキング</b><span class="sub">${ship.length}件・${Object.keys(pick).length}品目</span></div>
        ${Object.keys(pick).length ? h`<div class="boxw"><table class="tbl"><thead><tr><th>商品</th><th class="r">合計</th></tr></thead><tbody>${Object.values(pick).sort((a, b) => b.qty - a.qty).map(p => h`<tr><td>${p.name}</td><td class="r num">${p.qty}${p.unit}</td></tr>`)}</tbody></table></div>` : h`<p class="sub">この日のお届けはまだありません。</p>`}
        ${prep.length ? h`<p class="sub">出荷準備中 ${prep.length}件</p>` : ""}</div>`;
  }
  function orderTable(list) {
    const st = s => ({ 受注: "pill red", 出荷準備: "pill warn", 出荷済: "pill blue", 納品済: "pill ok", 取消: "pill" }[s]);
    return h`<div class="boxw"><table class="tbl"><thead><tr><th>受付</th><th>取引先</th><th>お届け</th><th class="r">金額（税込）</th><th>状態</th></tr></thead><tbody>
      ${list.map(o => h`<tr class="click" data-order="${o.id}" tabindex="0"><td class="num">${mdHm(o.createdAt)}<div class="sub">${o.no}</div></td><td>${o.store}${o.edits.length ? h` <span class="pill warn">訂正</span>` : ""}</td><td>${jpDate(o.deliveryDate)}</td><td class="r num">${yen(o.total)}</td><td><span class="${st(o.status)}">${o.status}</span></td></tr>`)}</tbody></table></div>`;
  }

  /* ---------- 受注 ---------- */
  function orders() {
    const os = Server.orders();
    const f = { 未完了: o => o.status === "受注" || o.status === "出荷準備", 受注: o => o.status === "受注", 出荷済: o => o.status === "出荷済", 納品済: o => o.status === "納品済", 取消: o => o.status === "取消", すべて: () => true };
    const list = os.filter(f[A.oFilter]);
    return h`<div class="row"><div><span class="en">ORDERS</span><h1 class="ttl h2">受注</h1></div><span class="spacer"></span><button class="btn sm" data-act-a="csv-orders">受注をCSVで書き出す</button></div>
      <div class="seg">${Object.keys(f).map(k => h`<button data-of="${k}" aria-pressed="${String(A.oFilter === k)}">${k}<span class="sub"> ${os.filter(f[k]).length}</span></button>`)}</div>
      ${list.length ? orderTable(list) : h`<div class="empty"><b>該当する受注はありません</b></div>`}`;
  }
  function orderSheet(id) {
    const o = Server.orders().find(x => x.id === id); if (!o) return;
    const k = Server.STATUSES.indexOf(o.status); const next = Server.STATUSES[k + 1];
    openSheet(`${o.store}　${o.no}`, h`<div class="stack">
      <div class="msg info">${mdHm(o.createdAt)}受付　${jpDate(o.deliveryDate)}お届け　ご担当 ${o.person || "—"}</div>
      ${o.note ? h`<div class="msg warn">備考：${o.note}</div>` : ""}
      ${o.edits.length ? h`<div class="msg">お店が訂正（${o.edits.map(e => mdHm(e.t)).join("、")}）。訂正前：${o.edits[o.edits.length - 1].before}</div>` : ""}
      <table class="dl"><tbody>${o.lines.map(l => h`<tr><td>${l.name}<div class="sub">${l.spec}・${l.perCase}個</div></td><td class="r">${l.qty}${l.unit}</td><td class="r num">${yen(l.price)}/個</td><td class="r num">${yen(l.amount)}</td></tr>`)}</tbody></table>
      <div class="tot num"><div><span>小計</span><span>${yen(o.sub)}</span></div><div><span>消費税（8% ${yen(o.t8)}・10% ${yen(o.t10)}）</span><span>${yen(o.tax)}</span></div><div class="all"><span>合計</span><b>${yen(o.total)}</b></div></div>
      <div class="row">${next && o.status !== "取消" ? h`<button class="btn pri" data-act-a="status" data-id="${o.id}" data-st="${next}">「${next}」にする</button>` : ""}
        <span class="sub">${o.status === "受注" ? "出荷準備にすると、お店からは訂正できなくなります" : ""}</span></div></div>`);
  }

  /* ---------- 商品と単価 ---------- */
  function items() {
    const all = Server.catalog(); const cats = [...new Set(all.map(i => i.cat))];
    const q = A.q.normalize("NFKC").toLowerCase();
    const list = all.filter(i => (!A.cat || i.cat === A.cat) && (!q || (i.name + i.jan + i.section).normalize("NFKC").toLowerCase().includes(q)));
    const dirty = Object.keys(A.draft).length;
    return h`<div class="row"><div><span class="en">ITEMS & PRICES</span><h1 class="ttl h2">商品と単価</h1></div><span class="spacer"></span>
        <button class="btn sm" data-adm="import">Excelから取り込む</button><button class="btn sm" data-act-a="csv-items">いまの商品表を書き出す</button></div>
      <div class="row"><input class="inp" id="iq" placeholder="商品名・JANでしぼりこむ" value="${A.q}" maxlength="40"><select class="inp" id="icat"><option value="">すべてのジャンル</option>${cats.map(c => h`<option${A.cat === c ? raw(" selected") : ""}>${c}</option>`)}</select></div>
      <p class="sub">単価の欄を直すと、オレンジ色になります。最後に「保存」を押すまで、お客様の画面は変わりません。粗利率が10%を切る商品は赤字で出します。</p>
      <div class="boxw"><table class="tbl"><thead><tr><th></th><th>商品名</th><th>ジャンル</th><th class="r">入数</th><th class="r">原価</th><th class="r">卸単価</th><th class="r">粗利率</th><th>状態</th></tr></thead><tbody>
      ${list.map(i => { const p = A.draft[i.id] != null ? A.draft[i.id] : i.price; const m = i.cost ? Math.round((p - i.cost) / p * 100) : null; return h`<tr><td>${ill(i.icon, i.cat)}</td><td>${i.name}<div class="sub">${i.spec}・JAN ${i.jan}</div></td><td>${i.cat}<div class="sub">${i.section}</div></td><td class="r num">${i.perCase}</td><td class="r num">${i.cost ? yen(i.cost) : "—"}</td>
        <td class="r"><input class="pi${A.draft[i.id] != null ? " dirty" : ""}" type="number" min="1" max="1000000" step="1" value="${p}" data-pid="${i.id}" aria-label="${i.name}の卸単価"></td><td class="r num ${m != null && m < 10 ? "fail" : ""}">${m == null ? "—" : m + "%"}</td><td>${i.active ? h`<span class="pill ok">販売中</span>` : h`<span class="pill">停止</span>`}</td></tr>`; })}
      </tbody></table></div>
      <div class="sheetbar"><span>${dirty ? `${dirty}品の単価を変更中` : "変更はありません"}</span><span class="spacer"></span><button class="btn sm ghost" data-act-a="draft-clear"${dirty ? "" : raw(" disabled")}>やめる</button><button class="btn ylw sm" data-act-a="draft-save"${dirty ? "" : raw(" disabled")}>保存</button></div>`;
  }

  /* ---------- Excel取り込み ---------- */
  const COLS = [["id", "商品コード", ["商品コード", "コード", "id"]], ["jan", "JAN", ["jan", "janコード", "バーコード"]], ["cat", "ジャンル", ["ジャンル", "カテゴリ", "分類", "大分類"]], ["section", "棚", ["棚", "小分類", "中分類", "セクション"]],
    ["name", "商品名", ["商品名", "品名", "名称"]], ["spec", "規格", ["規格", "内容量", "容量"]], ["perCase", "入数", ["入数", "ケース入数", "入り数"]], ["unit", "単位", ["単位", "発注単位"]],
    ["price", "卸単価", ["卸単価", "単価", "売価", "価格", "卸価格"]], ["cost", "原価", ["原価", "仕入値", "仕入単価", "仕入"]], ["minText", "ご注文単位", ["ご注文単位", "最低発注", "発注条件", "最低ロット"]], ["active", "状態", ["状態", "販売", "ステータス"]]];
  function imp() {
    const undo = Server.canUndo();
    const r = A.imp;
    return h`<div><span class="en">IMPORT</span><h1 class="ttl h2">Excelから商品表を取り込む</h1></div>
      <div class="card pad stack">
        <p>いつもの商品表（Excel・CSV）を、そのまま入れてください。<b>取り込む前に、何が変わるかを一覧で見せます。</b>確認して「反映する」を押すまで、お客様の画面は変わりません。</p>
        <label class="drop" id="drop"><b class="ttl h3">ここにファイルを置く</b><span class="sub">または、押してファイルを選ぶ（.xlsx / .csv・5MBまで）</span><input type="file" id="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr"></label>
        <div class="row"><button class="btn sm" data-act-a="tpl">ひな形（CSV）をダウンロード</button><button class="btn sm" data-act-a="csv-items">いまの商品表を書き出す</button><button class="btn sm" data-act-a="sample">見本ファイルで試す</button>
          ${undo ? h`<span class="spacer"></span><button class="btn sm dng" data-act-a="undo">直前の取り込みを元に戻す（${mdHm(undo)}）</button>` : ""}</div>
        <details><summary class="sub">読み取れる列の名前</summary><p class="sub">${COLS.map(c => `${c[1]}（${c[2].join("・")}）`).join("／")}。1行目を見出しにしてください。列の順番は自由です。<b>商品コード</b>か<b>JAN</b>で同じ商品かどうかを見分けます（どちらも無いときは、商品名と規格）。</p></details>
      </div>
      ${r ? preview(r) : ""}`;
  }
  function preview(r) {
    const chg = r.rows.filter(x => x.kind === "chg"), add = r.rows.filter(x => x.kind === "add"), same = r.rows.filter(x => x.kind === "same");
    const big = chg.filter(x => x.warn.length).length;
    const lbl = { cat: "ジャンル", section: "棚", name: "商品名", spec: "規格", perCase: "入数", unit: "単位", price: "卸単価", cost: "原価", minText: "ご注文単位", jan: "JAN", active: "状態" };
    const fv = (k, v) => k === "price" || k === "cost" ? (v == null ? "—" : yen(v)) : k === "active" ? (v ? "販売中" : "停止") : v;
    return h`<div class="card pad stack"><div class="row"><b class="ttl h3">「${r.file}」の中身</b><span class="sub">${r.total}行を読み取りました</span></div>
      <div class="diffs"><div class="kpi"><small>新しい商品</small><b>${add.length}</b></div><div class="kpi${big ? " hot" : ""}"><small>変わる商品</small><b>${chg.length}</b>${big ? h`<small class="fail">うち要確認 ${big}</small>` : ""}</div><div class="kpi"><small>変わらない</small><b>${same.length}</b></div><div class="kpi${r.errors.length ? " hot" : ""}"><small>読めない行</small><b>${r.errors.length}</b></div></div>
      ${r.errors.length ? h`<div class="msg bad"><b>読めない行は取り込みません。</b>Excelを直して、もう一度入れてください。<ul>${r.errors.slice(0, 20).map(e => h`<li>${e.row}行目：${e.msg}</li>`)}</ul>${r.errors.length > 20 ? `ほか${r.errors.length - 20}行` : ""}</div>` : ""}
      ${chg.length ? h`<b>変わる商品</b><div class="boxw"><table class="tbl"><thead><tr><th>行</th><th>商品名</th><th>変わるところ</th><th>確認</th></tr></thead><tbody>${chg.map(x => h`<tr><td class="num">${x.row}</td><td>${x.v.name}</td><td>${x.diff.map(d => h`<div>${lbl[d.k]}：<span class="chg">${fv(d.k, d.from)}</span>→ <b class="${d.k === "price" ? (d.to > d.from ? "up" : "dn") : ""}">${fv(d.k, d.to)}</b>${d.k === "price" ? h` <span class="sub">（${d.to > d.from ? "+" : ""}${Math.round((d.to - d.from) / d.from * 100)}%）</span>` : ""}</div>`)}</td><td>${x.warn.map(w => h`<span class="pill bad">${w}</span> `)}</td></tr>`)}</tbody></table></div>` : ""}
      ${add.length ? h`<b>新しい商品</b><div class="boxw"><table class="tbl"><thead><tr><th>行</th><th>商品名</th><th>ジャンル</th><th class="r">入数</th><th class="r">卸単価</th><th>確認</th></tr></thead><tbody>${add.map(x => h`<tr><td class="num">${x.row}</td><td>${x.v.name}<div class="sub">${x.v.spec}</div></td><td>${x.v.cat}</td><td class="r num">${x.v.perCase}</td><td class="r num">${yen(x.v.price)}</td><td>${x.warn.map(w => h`<span class="pill bad">${w}</span> `)}</td></tr>`)}</tbody></table></div>` : ""}
      <label class="row"><input type="checkbox" id="stopMissing"${A.stopMissing ? raw(" checked") : ""}> ファイルに無い商品（${r.missing}品）を販売停止にする</label>
      <div class="row"><button class="btn ghost" data-act-a="imp-clear">やめる</button><span class="spacer"></span><button class="btn pri lg" data-act-a="imp-apply"${add.length + chg.length || (A.stopMissing && r.missing) ? "" : raw(" disabled")}>この内容で反映する</button></div>
      <p class="sub">反映したあとでも、「直前の取り込みを元に戻す」で、取り込む前の状態に戻せます。</p></div>`;
  }

  // --- CSV（ダブルクォート・改行入りのセルにも対応） ---
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
      if (rows.length > 6000) throw new Error("行が多すぎます（5,000行まで）");
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  // --- xlsx（外部のライブラリを使わず、ブラウザの標準機能だけで読む） ---
  const LIMIT = 20 * 1024 * 1024;
  async function inflate(data) {
    const rd = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
    const parts = []; let n = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > LIMIT) { rd.cancel(); throw new Error("ファイルの中身が大きすぎます"); } parts.push(value); } // 圧縮爆弾よけ
    const out = new Uint8Array(n); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out;
  }
  async function readXlsx(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error("Excelのファイルとして読めませんでした");
    const cnt = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const files = {};
    if (cnt > 2000) throw new Error("Excelのファイルとして読めませんでした");
    for (let i = 0; i < cnt; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Excelのファイルとして読めませんでした");
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      files[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl))] = { method, csize, lho }; p += 46 + nl + xl + cl;
    }
    const get = async name => {
      const f = files[name]; if (!f) return null;
      const l = f.lho, st = l + 30 + dv.getUint16(l + 26, true) + dv.getUint16(l + 28, true);
      const data = u8.subarray(st, st + f.csize);
      const out = f.method === 0 ? data : f.method === 8 ? await inflate(data) : null;
      if (!out) throw new Error("このExcelの保存形式には対応していません");
      return new DOMParser().parseFromString(new TextDecoder().decode(out), "application/xml"); // 外部の参照（XXE）は、ブラウザが読みに行かない
    };
    const wb = await get("xl/workbook.xml"); if (!wb) throw new Error("Excelのファイルとして読めませんでした");
    const sh = wb.getElementsByTagName("sheet")[0]; const rid = sh && (sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"));
    const rels = await get("xl/_rels/workbook.xml.rels"); let target = "worksheets/sheet1.xml";
    if (rels && rid) { const r = [...rels.getElementsByTagName("Relationship")].find(x => x.getAttribute("Id") === rid); if (r) target = r.getAttribute("Target").replace(/^\/?xl\//, ""); }
    const ss = await get("xl/sharedStrings.xml");
    const strs = ss ? [...ss.getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent).join("")) : [];
    const ws = await get("xl/" + target.replace(/^\//, "")); if (!ws) throw new Error("1枚目のシートが見つかりません");
    const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref || "A"); let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    const rows = [];
    for (const r of ws.getElementsByTagName("row")) {
      if (rows.length > 6000) throw new Error("行が多すぎます（5,000行まで）");
      const row = [];
      for (const c of r.getElementsByTagName("c")) {
        const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0];
        let val = t === "s" ? strs[Number(v && v.textContent)] : t === "inlineStr" ? [...c.getElementsByTagName("t")].map(x => x.textContent).join("") : v ? v.textContent : "";
        const k = colIdx(c.getAttribute("r")); if (k > 60) continue; row[k] = val == null ? "" : val;
      }
      rows.push(Array.from(row, x => x == null ? "" : x));
    }
    return rows;
  }
  function toRows(table) {
    const hi = table.findIndex(r => r.some(c => /商品名|品名/.test(String(c)))); if (hi < 0) throw new Error("見出しの行（「商品名」がある行）が見つかりません");
    const head = table[hi].map(x => String(x).normalize("NFKC").trim().toLowerCase());
    const map = {}; COLS.forEach(([k, , al]) => { const j = head.findIndex(x => al.some(a => x === a.toLowerCase())); if (j >= 0) map[k] = j; });
    const need = ["name", "price", "perCase", "cat"].filter(k => !(k in map)); if (need.length) throw new Error(`必要な列がありません：${need.map(k => COLS.find(c => c[0] === k)[1]).join("・")}`);
    const out = [];
    table.slice(hi + 1).forEach((r, k) => {
      if (!r.some(c => String(c).trim())) return;
      const g = key => key in map ? String(r[map[key]] == null ? "" : r[map[key]]).replace(/[\u0000-\u001f\u007f]/g, " ").trim() : "";
      const n = s => { const t = String(s).normalize("NFKC").replace(/[¥,円\s]/g, ""); return t === "" ? null : Number(t); };
      // 列が無い項目は undefined のまま（＝いまの値を変えない）
      const o = key => key in map ? g(key) : undefined;
      out.push({ row: hi + k + 2, v: { id: g("id"), jan: g("jan").replace(/\.0$/, ""), cat: g("cat"), section: o("section"), name: g("name"), spec: o("spec"), perCase: n(g("perCase")), unit: o("unit"), price: n(g("price")),
        cost: "cost" in map ? n(g("cost")) : undefined, minText: o("minText"), active: "active" in map ? !/停止|休止|廃番|×/.test(g("active")) : undefined } });
    });
    return out;
  }
  function diff(file, parsed) {
    const cur = Server.catalog(); const byId = {}, byJan = {}, byNm = {};
    cur.forEach(i => { byId[i.id] = i; if (i.jan) byJan[i.jan] = i; byNm[i.name + "|" + i.spec] = i; });
    const errors = [], rows = [], seen = new Set(), dupe = {};
    parsed.forEach(({ row, v }) => {
      const e = [];
      if (!v.name) e.push("商品名が空です"); else if (v.name.length > 80) e.push("商品名が長すぎます（80文字まで）");
      if (!v.cat) e.push("ジャンルが空です");
      if (!Number.isFinite(v.price) || v.price <= 0 || v.price > 1e6) e.push("卸単価が数字ではありません");
      if (!Number.isInteger(v.perCase) || v.perCase < 1 || v.perCase > 1000) e.push("入数は1〜1000の整数で");
      if (v.cost != null && (!Number.isFinite(v.cost) || v.cost < 0)) e.push("原価が数字ではありません");
      if (v.jan && !/^\d{8,14}$/.test(v.jan)) e.push("JANは8〜14桁の数字で");
      const key = v.id || v.jan || v.name + "|" + v.spec; if (dupe[key]) e.push(`${dupe[key]}行目と同じ商品です`); dupe[key] = row;
      if (e.length) { errors.push({ row, msg: e.join("・") }); return; }
      const it = (v.id && byId[v.id]) || (v.jan && byJan[v.jan]) || byNm[v.name + "|" + v.spec];
      const warn = [];
      const cost = v.cost != null ? v.cost : it && it.cost;
      if (cost && v.price <= cost) warn.push("原価割れ"); else if (cost && (v.price - cost) / v.price < .1) warn.push("粗利10%未満");
      if (!it) { rows.push({ row, kind: "add", v, warn }); return; }
      seen.add(it.id);
      const d = ["cat", "section", "name", "spec", "perCase", "unit", "price", "cost", "minText", "jan", "active"].filter(k => v[k] !== undefined && !(k === "jan" && !v[k]) && String(v[k]) !== String(it[k] == null ? "" : it[k]) && !(k === "cost" && v[k] == null && it[k] == null)).map(k => ({ k, from: it[k], to: v[k] }));
      const pc = d.find(x => x.k === "price"); if (pc && Math.abs(pc.to - pc.from) / pc.from >= .2) warn.push(`単価が${pc.to > pc.from ? "上がる" : "下がる"}（20%以上）`);
      rows.push({ row, kind: d.length ? "chg" : "same", v: { ...v, id: it.id }, diff: d, warn });
    });
    return { file, total: parsed.length, rows, errors, missing: cur.filter(i => i.active && !seen.has(i.id)).length };
  }
  async function readFile(f) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast("5MBより大きいファイルは取り込めません"); return; }
    const name = f.name.replace(/[^\p{L}\p{N}._\- ()（）]/gu, "_").slice(0, 60);
    try {
      let table;
      if (/\.xlsx$/i.test(f.name)) table = await readXlsx(await f.arrayBuffer());
      else if (/\.csv$/i.test(f.name) || f.type === "text/csv") { const b = await f.arrayBuffer(); let t = new TextDecoder("utf-8", { fatal: false }).decode(b); if (/�/.test(t)) t = new TextDecoder("shift_jis").decode(b); table = parseCSV(t.replace(/^﻿/, "")); }
      else { toast("Excel（.xlsx）かCSVを選んでください。古い .xls は、Excelで .xlsx に保存し直してください"); return; }
      A.imp = diff(name, toRows(table)); A.stopMissing = false; draw();
    } catch (err) { toast(err.message || "読み取れませんでした"); }
  }

  // --- 書き出し（CSV。Excelで数式として動かないよう、= + - @ で始まる値は ' を付ける） ---
  const cellSafe = v => { let s = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function download(name, rows) {
    const csv = "﻿" + rows.map(r => r.map(cellSafe).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  const head = COLS.map(c => c[1]);
  const itemRow = i => [i.id, i.jan, i.cat, i.section, i.name, i.spec, i.perCase, i.unit, i.price, i.cost == null ? "" : i.cost, i.minText, i.active ? "販売中" : "停止"];
  window.ADMIN_TEST = { cellSafe, parseCSV, diff, toRows }; // 安全チェックから使う

  /* ---------- 取引先 ---------- */
  function customers() {
    const cs = Server.customers(); const os = Server.orders();
    return h`<div><span class="en">CUSTOMERS</span><h1 class="ttl h2">取引先</h1></div>
      <div class="boxw"><table class="tbl"><thead><tr><th>店番</th><th>店舗</th><th>ログインID</th><th>締め日</th><th class="r">特別価格</th><th class="r">今月の注文</th></tr></thead><tbody>
      ${cs.map(c => { const m = os.filter(o => o.customerId === c.id && Server.iso(o.createdAt).startsWith(Server.iso(Date.now()).slice(0, 7)) && o.status !== "取消"); return h`<tr><td class="num">${c.shopNo}</td><td>${c.store}<div class="sub">${c.company}・${c.contact}</div></td><td><span class="code">${c.loginId}</span></td><td>${c.closing === "31" ? "月末" : c.closing + "日"}締め</td><td class="r num">${c.special}品</td><td class="r num">${m.length}件 ${yen(m.reduce((a, o) => a + o.total, 0))}</td></tr>`; })}</tbody></table></div>
      <div class="msg info">本番では、ここで新しい取引先のIDを発行します。仮パスワードは、<b>最初のログインで必ず変えてもらう</b>形にします（メールやLINEに書いたパスワードを使い続けない）。</div>`;
  }

  /* ---------- 安全チェック ---------- */
  function security() {
    const r = A.test;
    const csp = (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || "";
    const extra = r ? [
      { name: "商品名に <img src=x onerror=…> を入れても、文字として表示される（XSS対策）", ok: (() => { const d = document.createElement("div"); d.innerHTML = h`<b>${'<img src=x onerror=alert(1)>'}</b>`.s; return !d.querySelector("img"); })() },
      { name: "書き出すCSVで、=・+・-・@ で始まる値を無害化（Excelの数式インジェクション対策）", ok: window.ADMIN_TEST.cellSafe("=HYPERLINK(\"http://x\")").startsWith("\"'=") && window.ADMIN_TEST.cellSafe("@SUM(A1)").startsWith("'") },
      { name: "取り込むExcelに、原価割れ・20%以上の値上げがあると「要確認」を出す", ok: (() => { const t = window.ADMIN_TEST; const cur = Server.catalog()[0]; const x = t.diff("t", t.toRows([["商品コード", "商品名", "ジャンル", "入数", "卸単価", "原価"], [cur.id, cur.name, cur.cat, cur.perCase, cur.price * 2, cur.price * 3]])); return x.rows[0].warn.includes("原価割れ") && x.rows[0].warn.some(w => /20%/.test(w)); })() },
      { name: "取り込むExcelの、数字でない単価・空の商品名をはじく", ok: (() => { const t = window.ADMIN_TEST; const x = t.diff("t", t.toRows([["商品名", "ジャンル", "入数", "卸単価"], ["", "お菓子", "10", "100"], ["テスト", "お菓子", "10", "abc"]])); return x.errors.length === 2; })() },
      { name: "読み込み先の制限（CSP）が入っていて、インラインのスクリプトを禁止している", ok: /script-src 'self'/.test(csp) && !/unsafe-inline/.test(csp) && /object-src 'none'/.test(csp) },
      { name: "外部のライブラリを読み込んでいない（Excelもブラウザの標準機能で読む）", ok: [...document.scripts].every(s => !s.src || new URL(s.src).origin === location.origin) },
    ] : [];
    const all = r ? r.concat(extra) : [];
    const ng = all.filter(x => !x.ok).length;
    return h`<div><span class="en">SECURITY</span><h1 class="ttl h2">安全チェック</h1></div>
      <div class="card pad stack"><p>取引先Aになりすまして、<b>他の店の注文を見る・取り消す、単価を書き換える、1円で注文する</b>などを、わざと試します。データのコピーで試すので、本物の注文や単価は変わりません。</p>
        <div class="row"><button class="btn pri" data-act-a="test">チェックを実行する</button>${r ? h`<b class="${ng ? "fail" : "pass"}">${all.length}項目中 ${all.length - ng}項目OK</b>` : ""}</div>
        ${r ? h`<div class="boxw"><table class="tbl sec-res"><tbody>${all.map(x => h`<tr><td class="${x.ok ? "pass" : "fail"}">${x.ok ? "OK" : "NG"}</td><td>${x.name}${x.note ? h`<div class="sub">${x.note}</div>` : ""}</td></tr>`)}</tbody></table></div>` : ""}</div>
      <div class="card pad stack"><b class="ttl h3">本番で守るところ</b>
        <p class="sub">このデモはブラウザの中だけで動きます。本番では、同じ決まりを<b>サーバー側</b>で守ります。画面をいじられても、データベースが断るので破られません。</p>
        <div class="boxw"><table class="tbl"><tbody>
          <tr><td>取引先どうしの分離</td><td>Supabase のRLSで「自分の店の行だけ」。店のIDは画面から受け取らず、ログインした人から決める</td></tr>
          <tr><td>単価・合計</td><td>注文はサーバー側の関数で受け付け、単価と合計をデータベースの値で計算し直す</td></tr>
          <tr><td>権限の書き換え</td><td>役割（管理者かどうか）は、取引先が書き込めない別のテーブルに置く</td></tr>
          <tr><td>管理者のログイン</td><td>パスワード＋スマホの認証アプリ（TOTP）。15分で自動ログアウト。失敗が続くとロック</td></tr>
          <tr><td>原価・仕入先</td><td>管理者だけが読めるテーブルに分ける。取引先の画面には、そもそも届かない</td></tr>
          <tr><td>通信と表示</td><td>HTTPS強制・埋め込み禁止・CSP（インラインのスクリプト禁止）をヘッダーで設定</td></tr>
          <tr><td>操作の記録</td><td>注文・訂正・単価の変更・取り込みを、だれがいつ行ったか残す</td></tr>
        </tbody></table></div></div>`;
  }

  /* ---------- 操作の記録 ---------- */
  function audit() {
    const a = Server.audit();
    return h`<div><span class="en">AUDIT LOG</span><h1 class="ttl h2">操作の記録</h1></div><p class="sub">ログイン・注文・訂正・単価の変更・Excelの取り込みを、だれがいつ行ったか残しています（新しい順・300件まで）。</p>
      ${a.length ? h`<div class="boxw"><table class="tbl"><thead><tr><th>日時</th><th>だれが</th><th>何を</th><th>内容</th></tr></thead><tbody>${a.map(x => h`<tr><td class="num">${mdHm(x.t)}</td><td>${x.who || "—"}</td><td>${x.act}</td><td>${x.detail}</td></tr>`)}</tbody></table></div>` : h`<div class="empty"><b>まだ記録はありません</b>お店の画面から注文したり、単価を変えたりすると、ここに残ります。</div>`}`;
  }

  /* ---------- 操作 ---------- */
  document.addEventListener("click", e => {
    if (!document.body.classList.contains("admin")) return;
    const t = e.target.closest("[data-adm]"); if (t) { A.tab = t.dataset.adm; closeSheet(); draw(); scrollTo(0, 0); history.replaceState(null, "", "#/admin/" + A.tab); return; }
    const of = e.target.closest("[data-of]"); if (of) { A.oFilter = of.dataset.of; draw(); return; }
    const or = e.target.closest("[data-order]"); if (or) { guard(() => orderSheet(or.dataset.order)); return; }
    const a = e.target.closest("[data-act-a]"); if (!a) return;
    const k = a.dataset.actA;
    guard(() => {
      if (k === "status") { Server.setStatus(a.dataset.id, a.dataset.st); toast(`「${a.dataset.st}」にしました`); closeSheet(); draw(); }
      if (k === "draft-clear") { A.draft = {}; draw(); }
      if (k === "draft-save") { const n = Server.savePrices(Object.entries(A.draft).map(([id, price]) => ({ id, price }))); A.draft = {}; toast(`${n}品の単価を保存しました`); draw(); }
      if (k === "csv-items") download(`ミナカワ商品表_${Server.iso(Date.now()).replace(/-/g, "")}.csv`, [head, ...Server.catalog().map(itemRow)]);
      if (k === "tpl") download("ミナカワ商品表_ひな形.csv", [head, ["", "4590000000001", "お菓子", "スナック", "ポテトチップス うすしお", "60g", 12, "ケース", 98, 80, "1ケース〜", "販売中"]]);
      if (k === "csv-orders") download(`ミナカワ受注_${Server.iso(Date.now()).replace(/-/g, "")}.csv`, [["受注番号", "受付", "取引先", "お届け日", "状態", "商品名", "数量", "単位", "単価", "金額"], ...Server.orders().flatMap(o => o.lines.map(l => [o.no, mdHm(o.createdAt), o.store, o.deliveryDate, o.status, l.name, l.qty, l.unit, l.price, l.amount]))]);
      if (k === "sample") {
        const cur = Server.catalog().slice(0, 14).map(itemRow);
        cur[0][8] = Math.round(cur[0][8] * 1.08); cur[3][8] = Math.round(cur[3][8] * 1.25); cur[5][10] = "☆混載可能 2ケース〜"; cur[7][9] = cur[7][8] + 4;
        cur.push(["", "4590000099991", "お菓子", "スナック", "BIGうまい棒風スナック 30本", "30本入", 10, "ケース", 260, 205, "1ケース〜", "販売中"]);
        cur.push(["", "4590000099992", "日用品", "紙製品", "キッチンペーパー 4ロール", "4ロール", 12, "ケース", 238, 190, "1ケース〜", "販売中"]);
        cur.push(["", "45900", "飲料", "お茶・水", "麦茶 600ml", "600ml", 24, "ケース", "", 40, "1ケース〜", "販売中"]);
        A.imp = diff("見本_商品表.csv", toRows(parseCSV([head, ...cur].map(r => r.map(cellSafe).join(",")).join("\n")))); A.stopMissing = false; draw();
      }
      if (k === "imp-clear") { A.imp = null; draw(); }
      if (k === "imp-apply") {
        const rows = A.imp.rows.filter(x => x.kind !== "same").map(x => x.v);
        const r = Server.importItems(rows, { stopMissing: !!A.stopMissing, file: A.imp.file }); A.imp = null; toast(`反映しました（新規${r.add}・更新${r.upd}・販売停止${r.stop}）`); draw();
      }
      if (k === "undo") { Server.undoImport(); toast("取り込む前の状態に戻しました"); draw(); }
      if (k === "test") { A.test = Server.selfTest(); draw(); }
    });
  });
  document.addEventListener("change", e => {
    if (!document.body.classList.contains("admin")) return;
    if (e.target.id === "file") readFile(e.target.files[0]);
    if (e.target.id === "icat") { A.cat = e.target.value; draw(); }
    if (e.target.id === "stopMissing") { A.stopMissing = e.target.checked; draw(); }
    if (e.target.dataset.pid) { const id = e.target.dataset.pid, v = Number(e.target.value); const it = Server.catalog().find(i => i.id === id); if (it && v !== it.price && v > 0) A.draft[id] = v; else delete A.draft[id]; draw(); const n = document.querySelector(`[data-pid="${CSS.escape(id)}"]`); if (n) n.focus(); }
  });
  document.addEventListener("input", e => {
    if (!document.body.classList.contains("admin")) return;
    if (e.target.id === "iq") { A.q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $("#iq"); n.focus(); n.setSelectionRange(pos, pos); }
  });
  document.addEventListener("dragover", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) { e.preventDefault(); d.classList.add("over"); } });
  document.addEventListener("dragleave", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) d.classList.remove("over"); });
  document.addEventListener("drop", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) { e.preventDefault(); d.classList.remove("over"); readFile(e.dataTransfer.files[0]); } });
  document.addEventListener("keydown", e => { const r = e.target.closest && e.target.closest("[data-order]"); if (r && e.key === "Enter") guard(() => orderSheet(r.dataset.order)); });
  document.addEventListener("submit", async e => {
    if (e.target.id === "g1") { e.preventDefault(); const pw = new FormData(e.target).get("pw"); try { A.code = await Server.loginAdmin(pw); A.step = 2; A.msg = ""; } catch (err) { A.msg = err.message; } draw(); }
    if (e.target.id === "g2") { e.preventDefault(); try { Server.verify2fa(new FormData(e.target).get("code")); A.step = 1; A.msg = ""; A.tab = A.tab || "dash"; } catch (err) { A.msg = err.message; if (/やり直/.test(err.message)) A.step = 1; } draw(); }
  });
  // 操作がないまま15分たったら、画面を閉じる
  setInterval(() => { if (document.body.classList.contains("admin") && $(".adm") && !isAdmin()) { A.msg = "15分間操作がなかったため、ログアウトしました"; A.step = 1; closeSheet(); draw(); } }, 30e3);

  window.ADMIN = { render(tab) { if (tab && tab !== A.tab && ["dash", "orders", "items", "import", "customers", "security", "audit"].includes(tab)) A.tab = tab; draw(); } };
})();

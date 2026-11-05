/* 合言葉の入口。
   単価は assets/prices.enc.json に暗号で入っていて、合言葉が合ったときだけブラウザの中で元に戻す。
   合言葉が合うまでは、発注画面のプログラム（server.js・app.js・admin.js）を読み込まない。 */
(() => {
  "use strict";
  const KEYS = "mko-gate-v2";
  const norm = s => String(s || "").normalize("NFKC").trim().toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  let enc = null;

  async function getEnc() { if (!enc) { const r = await fetch("assets/prices.enc.v2.json", { cache: "no-store" }); if (!r.ok) throw new Error("load"); enc = await r.json(); } return enc; }
  // 合言葉ごとに鍵を作って、合う枠を探す（合言葉がちがうと、どの枠も開かない）
  async function unlock(pass) {
    const e = await getEnc();
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(norm(pass)), "PBKDF2", false, ["deriveKey"]);
    for (const sl of e.slots) {
      const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: fromB64(sl.salt), iterations: e.iter }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
      try { return { key, k: e.slots.indexOf(sl), data: await openSlot(sl, key) }; } catch (x) {}
    }
    throw new Error("ng");
  }
  async function openSlot(sl, key) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(sl.iv) }, key, fromB64(sl.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function apply(data) {
    const S = window.SEED;
    S.items.forEach(i => { const p = data.prices[i.id]; if (Number.isFinite(p)) { i.price = p; i.cost = null; } }); // 原価は本物が無いので出さない
    const by = Object.fromEntries(S.items.map(i => [i.id, i]));
    S.prices.c101 = {}; S.prices.c102 = {}; // 本物の取引先Aには特別価格が無いので、見本のお店にも付けない（ファンタウンだけ、他店に見えないかの点検用に残す）
    Object.values(S.prices).forEach(m => Object.keys(m).forEach(id => { m[id] = Math.max(1, Math.round(by[id].price * 0.95 * 10) / 10); })); // 見本の特別価格（5%引き）
    S.realPrices = true;
    ["assets/server.js", "assets/app.js", "assets/admin.js"].map(x => x + "?v=" + (window.ASSET_V || "")).forEach(src => { const s = document.createElement("script"); s.src = src; s.async = false; document.body.appendChild(s); });
  }
  function show(msg) {
    const app = document.getElementById("app");
    app.innerHTML = "";
    const sec = document.createElement("section"); sec.className = "login";
    sec.innerHTML = '<form class="box stack" id="gate"><div><span class="en">PASSPHRASE</span><h1 class="ttl">合言葉を入れてください</h1></div>'
      + '<p class="sub">このデモには、本物の卸単価が入っています。ミナカワからお知らせした合言葉を入れると開きます。</p>'
      + '<label class="field">合言葉<input name="p" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" required></label>'
      + '<div class="msg bad hide" role="alert" id="gmsg"></div><button class="btn pri lg wide" type="submit">開く</button></form>';
    app.appendChild(sec);
    const m = document.getElementById("gmsg"); if (msg) { m.textContent = msg; m.classList.remove("hide"); }
    const f = document.getElementById("gate"); f.querySelector("input").focus();
    f.addEventListener("submit", async ev => {
      ev.preventDefault(); const btn = f.querySelector("button"); btn.disabled = true; btn.textContent = "確かめています…";
      const n = Number(sessionStorage.getItem(KEYS + ":n") || 0), until = Number(sessionStorage.getItem(KEYS + ":until") || 0);
      if (Date.now() < until) { show(`まちがいが続いたため、${Math.ceil((until - Date.now()) / 1000)}秒お待ちください`); return; }
      try {
        const r = await unlock(new FormData(f).get("p"));
        try { sessionStorage.setItem(KEYS, JSON.stringify({ k: r.k, key: b64(await crypto.subtle.exportKey("raw", r.key)) })); sessionStorage.removeItem(KEYS + ":n"); } catch (e) {}
        app.innerHTML = ""; apply(r.data);
      } catch (e) {
        if (n + 1 >= 5) { sessionStorage.setItem(KEYS + ":until", String(Date.now() + 60e3)); sessionStorage.setItem(KEYS + ":n", "0"); } else sessionStorage.setItem(KEYS + ":n", String(n + 1));
        show(e.message === "load" ? "読み込めませんでした。通信を確かめてください" : "合言葉がちがいます");
      }
    });
  }
  async function boot() {
    // 同じタブの中では、もう一度聞かない（タブを閉じると忘れる）
    const k = (() => { try { return sessionStorage.getItem(KEYS); } catch (e) { return null; } })();
    if (k) {
      try { const j = JSON.parse(k); const e = await getEnc(); const key = await crypto.subtle.importKey("raw", fromB64(j.key), "AES-GCM", false, ["decrypt"]); apply(await openSlot(e.slots[j.k], key)); return; }
      catch (e) { try { sessionStorage.removeItem(KEYS); } catch (x) {} }
    }
    show();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

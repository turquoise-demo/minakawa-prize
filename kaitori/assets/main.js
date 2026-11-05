(() => {
  // メニュー
  const btn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.gnav');
  const closeMenu = () => { if (!nav) return; nav.classList.remove('open'); if (btn) btn.setAttribute('aria-expanded', 'false'); };
  if (btn) btn.addEventListener('click', e => {
    e.stopPropagation();
    const o = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', o);
  });
  // メニューの項目を選んだら閉じる・外を押しても閉じる・Escでも閉じる
  if (nav) nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('click', e => { if (nav && nav.classList.contains('open') && !e.target.closest('.gnav') && !e.target.closest('.menu-btn')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('pageshow', closeMenu);

  // ふわっと表示
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // ---------- クレーンゲーム ----------
  const svg = document.getElementById('crane');
  if (svg && window.ICONS) {
    const $ = s => svg.querySelector(s);
    const carriage = $('#carriage'), cable = $('#cable'), claw = $('#claw');
    const armL = $('#armL'), armR = $('#armR'), held = $('#held'), heldIc = $('#held .ic');
    const falling = $('#falling'), fallIc = $('#falling .ic');
    const outlet = $('#outlet'), outIc = $('#outlet .ic'), mark = $('#getmark');
    const slots = [...svg.querySelectorAll('.slot')];
    const SLOT_X = [238, 306, 372], SLOT_Y = [326, 330, 326];
    const S = 0.7;
    const ROTA = ['cabbage', 'eggs', 'milk', 'meat', 'toilet', 'onion', 'tea', 'apple', 'detergent', 'juice', 'gyoza', 'corn'];
    let nextType = 3;
    const types = ['cabbage', 'eggs', 'milk'];
    const HOME = 196, L0 = 20, CABLE_TOP = 146;
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;
    const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

    let order = [0, 1, 2], k = 0, start = null, paused = false, running = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setClaw(x, L, open) {
      carriage.setAttribute('transform', `translate(${x} 0)`);
      cable.setAttribute('height', L);
      claw.setAttribute('transform', `translate(0 ${CABLE_TOP + L})`);
      armL.setAttribute('transform', `rotate(${open})`);
      armR.setAttribute('transform', `rotate(${-open})`);
    }

    const DUR = 8600;
    function frame(ts) {
      if (!running) return;
      if (start === null) start = ts;
      let t = ts - start;
      const i = order[k % 3];
      const sx = SLOT_X[i] + 50 * S, sy = SLOT_Y[i];
      const Lgrab = sy + 18 * S - CABLE_TOP - 14;    // 爪の先が景品の上部にかかる長さ
      const ty = types[i];
      if (t > DUR) {
        // 補充：獲った枠に次の商品を入れる
        types[i] = ROTA[nextType++ % ROTA.length];
        slots[i].querySelector('.ic').innerHTML = ICONS[types[i]];
        slots[i].style.opacity = 1;
        outlet.setAttribute('opacity', 0); mark.setAttribute('opacity', 0);
        k++; start = ts; t = 0;
        if (paused) { running = false; return; }
      }
      let x = HOME, L = L0, open = 26;
      if (t < 1600) { x = lerp(HOME, sx, ease(seg(t, 0, 1600))); }
      else if (t < 2600) { x = sx; L = lerp(L0, Lgrab, ease(seg(t, 1600, 2600))); }
      else if (t < 3000) { x = sx; L = Lgrab; open = lerp(26, 6, seg(t, 2600, 3000)); }
      else if (t < 4200) { x = sx; L = lerp(Lgrab, L0, ease(seg(t, 3000, 4200))); open = 6; }
      else if (t < 5800) { x = lerp(sx, HOME, ease(seg(t, 4200, 5800))) + Math.sin(t / 90) * 1.2; L = L0; open = 6; }
      else if (t < 6100) { x = HOME; L = L0; open = lerp(6, 28, seg(t, 5800, 6100)); }
      else { x = HOME; L = L0; open = 28; }
      setClaw(x, L, open);

      // 景品の受け渡し
      if (t >= 3000 && t < 5900) {
        if (slots[i].style.opacity !== '0') {
          slots[i].style.opacity = 0;
          heldIc.innerHTML = ICONS[ty];
          heldIc.setAttribute('transform', `translate(${-50 * S} 6) scale(${S})`);
        }
        held.setAttribute('opacity', 1);
      } else held.setAttribute('opacity', 0);

      if (t >= 5900 && t < 6600) {
        if (!fallIc.innerHTML) fallIc.innerHTML = ICONS[ty];
        const p = seg(t, 5900, 6600);
        const y = CABLE_TOP + L0 + 6 + p * p * 220;
        fallIc.setAttribute('transform', `translate(${HOME - 50 * S} ${y}) scale(${S})`);
        falling.setAttribute('opacity', 1);
      } else { falling.setAttribute('opacity', 0); fallIc.innerHTML = ''; }

      if (t >= 6600) {
        if (outIc.dataset.t !== ty + k) { outIc.innerHTML = ICONS[ty]; outIc.dataset.t = ty + k; }
        const p = seg(t, 6600, 7000);
        const b = Math.sin(p * Math.PI) * -10;
        outIc.setAttribute('transform', `translate(${193} ${514 + b}) scale(.66)`);
        outlet.setAttribute('opacity', 1);
        const q = seg(t, 6800, 7100);
        mark.setAttribute('opacity', q);
        mark.setAttribute('transform', `translate(300 488) scale(${.6 + .4 * q}) rotate(${-8 * q})`);
      }
      requestAnimationFrame(frame);
    }
    if (!reduce) requestAnimationFrame(frame);

    // 「ワンプレイ」ボタン：止める／再開
    const play = document.querySelector('.hero .play');
    if (play) play.addEventListener('click', () => {
      if (reduce) return;
      if (running && !paused) { paused = true; play.textContent = '▶ もう一回あそぶ'; }
      else { paused = false; play.textContent = 'Ⅱ 一時停止'; if (!running) { running = true; start = null; requestAnimationFrame(frame); } }
    });
    // 画面外では止める
    new IntersectionObserver(es => es.forEach(e => {
      if (reduce) return;
      if (!e.isIntersecting) { running = false; }
      else if (!running && !paused) { running = true; start = null; requestAnimationFrame(frame); }
    })).observe(svg);
  }

  // ---------- 自店チェック ----------
  const chk = document.querySelector('.check');
  if (chk) {
    const out = chk.querySelector('.result');
    const msgs = [
      'まずは当てはまる項目にチェックを入れてください。',
      '当てはまるのは<b>1</b>個。今のうちに、1台だけ試しておく価値があります。',
      '当てはまるのは<b>2</b>個。近くのお客さまを取りこぼしている可能性があります。',
      '当てはまるのは<b>3</b>個。生鮮クレーンの導入余地が、大きいお店です。',
      '当てはまるのは<b>4</b>個。競合店が先に始める前に、動くべきタイミングです。',
      '当てはまるのは<b>5</b>個。来年、いちばん差がつくのはこのお店です。',
    ];
    const upd = () => { const n = chk.querySelectorAll('input:checked').length; out.innerHTML = msgs[n]; };
    chk.addEventListener('change', upd); upd();
  }

  // ---------- 原価率シミュレーター ----------
  const calc = document.querySelector('.calc');
  if (calc) {
    const get = id => +calc.querySelector('#' + id).value;
    const upd = () => {
      const cost = get('c-cost'), fee = get('c-fee'), plays = get('c-plays');
      calc.querySelector('[for=c-cost] output').textContent = cost + '円';
      calc.querySelector('[for=c-fee] output').textContent = fee + '円';
      calc.querySelector('[for=c-plays] output').textContent = plays + '回';
      const sales = fee * plays;
      const r = Math.round(cost / sales * 100);
      calc.querySelector('.big').innerHTML = r + '<small>%</small>';
      calc.querySelector('.sales').textContent = sales.toLocaleString() + '円';
      calc.querySelector('.gross').textContent = (sales - cost).toLocaleString() + '円';
    };
    calc.addEventListener('input', upd); upd();
  }

})();

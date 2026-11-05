(() => {
  const svg = document.getElementById('town'); if (!svg) return;
  svg.querySelectorAll('.bld').forEach(b => b.addEventListener('click', () => { const t = document.querySelector(b.dataset.href); if (t) t.scrollIntoView({behavior:'smooth'}); }));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tr = svg.querySelector('#truck'), tb = svg.querySelector('#truck .tb');
  const stops = [60, 320, 580, 840], X0 = -160, X1 = 1100;
  let t0 = null;
  const seq = [];  // [時刻ms, x] 倉庫→店→ゲーセン→カーズ→画面外→倉庫から再スタート
  let t = 0; seq.push([t, X0]); stops.forEach(x => { t += 1500; seq.push([t, x]); t += 900; seq.push([t, x]); }); t += 1600; seq.push([t, X1]);
  const DUR = t;
  const ease = p => p < .5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2)/2;
  const frame = ts => {
    if (t0 === null) t0 = ts;
    const e = (ts - t0) % DUR;
    let x = X0;
    for (let i = 1; i < seq.length; i++) { const [ta, xa] = seq[i-1], [tb2, xb] = seq[i]; if (e <= tb2) { x = xa + (xb - xa) * ease((e - ta) / (tb2 - ta || 1)); break; } }
    tr.setAttribute('transform', `translate(${x} 300)`);
    tb.setAttribute('transform', `translate(0 ${Math.sin(ts/90)*.8})`);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();

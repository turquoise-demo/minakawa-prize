(() => {
  // ヒーロー：棚に商品が順に補充される
  const svg = document.getElementById('shop');
  if (svg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const sh = [...svg.querySelectorAll('.sh')], bub = svg.querySelector('#bubble');
    let i = 0;
    const tick = () => {
      if (i < sh.length) { sh[i].setAttribute('opacity', 1); i++; setTimeout(tick, 420); }
      else { bub.setAttribute('opacity', 1); setTimeout(() => { bub.setAttribute('opacity', 0); sh.forEach(s => s.setAttribute('opacity', 0)); i = 0; setTimeout(tick, 700); }, 2600); }
    };
    setTimeout(tick, 600);
  } else if (svg) svg.querySelectorAll('.sh').forEach(s => s.setAttribute('opacity', 1));
  // 収支シミュレーター（固定費27.5万円・ロイヤリティ0円の期間は22.5万円）
  const r = document.getElementById('fcSim');
  if (r) {
    const f = n => (Math.round(n * 10) / 10).toLocaleString();
    const upd = () => {
      const rev = +r.value, roy = +document.querySelector('input[name=simRoy]:checked').value;
      const gross = rev * 0.23, profit = gross - 22.5 - roy;
      document.getElementById('simRevOut2').textContent = rev + '万円';
      document.getElementById('simGross2').textContent = f(gross);
      document.getElementById('simProfit2').textContent = f(profit);
      document.getElementById('simMargin2').textContent = f(profit / rev * 100);
    };
    r.addEventListener('input', upd);
    document.querySelectorAll('input[name=simRoy]').forEach(x => x.addEventListener('change', upd));
    upd();
  }
})();

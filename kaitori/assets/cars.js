(() => {
  // ヒーロー：車が入ってきて査定 → 倉庫へ → 次の車
  const svg = document.getElementById('yard');
  const SEQ = ["<path d=\"M40 90V36q0-14 14-14h62q10 0 16 8l26 30q6 6 6 14v16z\" fill=\"#ffe664\"/><rect x=\"54\" y=\"30\" width=\"34\" height=\"26\" fill=\"#a0d2e6\"/><path d=\"M96 30h18q6 0 10 5l18 21H96z\" fill=\"#a0d2e6\"/><rect x=\"40\" y=\"70\" width=\"124\" height=\"8\" fill=\"#fff\" opacity=\".7\"/><rect x=\"156\" y=\"66\" width=\"10\" height=\"8\" fill=\"#ffe664\"/><g class=\"wh\"><circle cx=\"66\" cy=\"96\" r=\"14\" fill=\"#3c3c3c\"/><circle cx=\"66\" cy=\"96\" r=\"7.0\" fill=\"#ebf0f0\"/><path d=\"M59.0 96h14.0M66 89.0v14.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g><g class=\"wh\"><circle cx=\"140\" cy=\"96\" r=\"14\" fill=\"#3c3c3c\"/><circle cx=\"140\" cy=\"96\" r=\"7.0\" fill=\"#ebf0f0\"/><path d=\"M133.0 96h14.0M140 89.0v14.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g>", "<rect x=\"54\" y=\"10\" width=\"86\" height=\"6\" fill=\"#3c3c3c\"/><path d=\"M14 90V44q0-10 10-14l22-14h92q10 0 16 8l18 22q12 2 14 12v32z\" fill=\"#8cb464\"/><path d=\"M50 24h38v26H34z\" fill=\"#a0d2e6\"/><path d=\"M96 24h40q6 0 10 5l16 21H96z\" fill=\"#a0d2e6\"/><rect x=\"14\" y=\"76\" width=\"172\" height=\"12\" fill=\"#3c3c3c\"/><rect x=\"176\" y=\"58\" width=\"10\" height=\"9\" fill=\"#fff\"/><g class=\"wh\"><circle cx=\"50\" cy=\"96\" r=\"16\" fill=\"#3c3c3c\"/><circle cx=\"50\" cy=\"96\" r=\"8.0\" fill=\"#ebf0f0\"/><path d=\"M42.0 96h16.0M50 88.0v16.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g><g class=\"wh\"><circle cx=\"152\" cy=\"96\" r=\"16\" fill=\"#3c3c3c\"/><circle cx=\"152\" cy=\"96\" r=\"8.0\" fill=\"#ebf0f0\"/><path d=\"M144.0 96h16.0M152 88.0v16.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g>", "<path d=\"M18 90V40q0-14 14-14h104q12 0 20 10l24 26q6 6 6 14v14z\" fill=\"#a0d2e6\"/><rect x=\"30\" y=\"34\" width=\"34\" height=\"22\" fill=\"#a0d2e6\"/><rect x=\"70\" y=\"34\" width=\"40\" height=\"22\" fill=\"#a0d2e6\"/><path d=\"M116 34h20q8 0 12 6l16 16h-48z\" fill=\"#a0d2e6\"/><path d=\"M112 34v56\" stroke=\"#fff\" stroke-width=\"2\" opacity=\".6\"/><rect x=\"18\" y=\"72\" width=\"168\" height=\"7\" fill=\"#5064a0\"/><rect x=\"176\" y=\"64\" width=\"10\" height=\"8\" fill=\"#fff\"/><g class=\"wh\"><circle cx=\"48\" cy=\"96\" r=\"14\" fill=\"#3c3c3c\"/><circle cx=\"48\" cy=\"96\" r=\"7.0\" fill=\"#ebf0f0\"/><path d=\"M41.0 96h14.0M48 89.0v14.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g><g class=\"wh\"><circle cx=\"154\" cy=\"96\" r=\"14\" fill=\"#3c3c3c\"/><circle cx=\"154\" cy=\"96\" r=\"7.0\" fill=\"#ebf0f0\"/><path d=\"M147.0 96h14.0M154 89.0v14.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g>", "<path d=\"M6 90V72q0-6 6-8l40-10 30-18q8-4 18-4h28q10 0 18 6l22 16 20 4q6 2 6 10v22z\" fill=\"#dc5028\"/><path d=\"M80 52l20-12q4-2 10-2h14v14z\" fill=\"#a0d2e6\"/><path d=\"M130 38h4q6 0 10 4l12 10h-26z\" fill=\"#a0d2e6\"/><rect x=\"184\" y=\"68\" width=\"10\" height=\"6\" fill=\"#fff\"/><rect x=\"6\" y=\"80\" width=\"188\" height=\"4\" fill=\"#3c3c3c\" opacity=\".3\"/><g class=\"wh\"><circle cx=\"48\" cy=\"96\" r=\"13\" fill=\"#3c3c3c\"/><circle cx=\"48\" cy=\"96\" r=\"6.5\" fill=\"#ebf0f0\"/><path d=\"M41.5 96h13.0M48 89.5v13.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g><g class=\"wh\"><circle cx=\"156\" cy=\"96\" r=\"13\" fill=\"#3c3c3c\"/><circle cx=\"156\" cy=\"96\" r=\"6.5\" fill=\"#ebf0f0\"/><path d=\"M149.5 96h13.0M156 89.5v13.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g>", "<path d=\"M4 90V68q0-6 6-6h40l20-26q4-4 10-4h50q8 0 12 6l16 24h30q8 0 8 8v20z\" fill=\"#3c3c3c\"/><path d=\"M72 60l14-20h24v20z\" fill=\"#a0d2e6\"/><path d=\"M116 40h16q4 0 6 3l11 17h-33z\" fill=\"#a0d2e6\"/><rect x=\"4\" y=\"78\" width=\"192\" height=\"6\" fill=\"#ebf0f0\"/><circle cx=\"188\" cy=\"70\" r=\"5\" fill=\"#fff\"/><g class=\"wh\"><circle cx=\"44\" cy=\"96\" r=\"13\" fill=\"#3c3c3c\"/><circle cx=\"44\" cy=\"96\" r=\"6.5\" fill=\"#ebf0f0\"/><path d=\"M37.5 96h13.0M44 89.5v13.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g><g class=\"wh\"><circle cx=\"158\" cy=\"96\" r=\"13\" fill=\"#3c3c3c\"/><circle cx=\"158\" cy=\"96\" r=\"6.5\" fill=\"#ebf0f0\"/><path d=\"M151.5 96h13.0M158 89.5v13.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g>", "<rect x=\"12\" y=\"52\" width=\"110\" height=\"38\" fill=\"#ebf0f0\"/><rect x=\"12\" y=\"52\" width=\"110\" height=\"6\" fill=\"#fdf5e1\"/><path d=\"M122 90V28q0-6 6-6h28q8 0 12 6l20 32q4 6 4 12v18z\" fill=\"#fdf5e1\"/><path d=\"M132 30h22q4 0 6 4l14 24h-42z\" fill=\"#a0d2e6\"/><rect x=\"182\" y=\"66\" width=\"10\" height=\"8\" fill=\"#fff\"/><g class=\"wh\"><circle cx=\"44\" cy=\"96\" r=\"14\" fill=\"#3c3c3c\"/><circle cx=\"44\" cy=\"96\" r=\"7.0\" fill=\"#ebf0f0\"/><path d=\"M37.0 96h14.0M44 89.0v14.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g><g class=\"wh\"><circle cx=\"150\" cy=\"96\" r=\"14\" fill=\"#3c3c3c\"/><circle cx=\"150\" cy=\"96\" r=\"7.0\" fill=\"#ebf0f0\"/><path d=\"M143.0 96h14.0M150 89.0v14.0\" stroke=\"#a0a8a8\" stroke-width=\"2\"/></g>"];
  if (svg && SEQ.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const carG = svg.querySelector('#car'), ci = svg.querySelector('#car .ci');
    const bub = svg.querySelector('#bub'), bubt = svg.querySelector('#bubt'), tag = svg.querySelector('#tag');
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
    let k = 0, start = null, running = true; const DUR = 7600, STOP = 350;
    ci.innerHTML = SEQ[0];
    const frame = ts => {
      if (!running) return;
      if (start === null) start = ts;
      let t = ts - start;
      if (t > DUR) { k++; ci.innerHTML = SEQ[k % SEQ.length]; start = ts; t = 0; }
      let x, op = 1, sc = 1;
      if (t < 1800) x = -260 + (STOP + 260) * ease(seg(t, 0, 1800));
      else if (t < 5600) x = STOP;
      else { const p = ease(seg(t, 5600, 7000)); x = STOP + p * 10; sc = 1 - p * .35; op = 1 - p; }
      const y = 250 + (1 - sc) * 160;
      carG.setAttribute('transform', `translate(${x} ${y}) scale(${sc})`);
      carG.setAttribute('opacity', op);
      const rot = t < 1800 ? t * .6 : 0;
      ci.querySelectorAll('.wh').forEach(w => w.style.transform = `rotate(${rot}deg)`);
      const dots = '.'.repeat(1 + Math.floor(t / 300) % 3);
      if (t > 2000 && t < 3900) { bub.setAttribute('opacity', 1); bubt.textContent = '査定中' + dots; } else bub.setAttribute('opacity', 0);
      const q = seg(t, 3900, 4200);
      tag.setAttribute('opacity', t > 3900 && t < 5600 ? q : 0);
      tag.setAttribute('transform', `translate(470 ${200 - 8 * q}) rotate(${-6 * q})`);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) running = false; else if (!running) { running = true; start = null; requestAnimationFrame(frame); }
    })).observe(svg);
  }
  // 査定フォーム：デモURLでは送信しない
  const form = document.querySelector('form.form');
  if (form) {
    const demo = (form.dataset.demoHosts || '').split(',').includes(location.hostname) || location.protocol === 'file:';
    const note = form.querySelector('.demo-note');
    if (demo && note) note.textContent = '※このページは確認用のデモです。送信しても実際には届きません。';
    form.addEventListener('submit', e => {
      if (!demo) return;
      e.preventDefault();
      form.style.display = 'none';
      document.querySelector('.thanks').classList.add('show');
    });
  }
})();

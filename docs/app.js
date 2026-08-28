(function () {
  const clock = document.getElementById('clock');
  if (clock) {
    function tick() { clock.textContent = new Date().toISOString().slice(11, 19) + ' UTC'; }
    tick(); setInterval(tick, 1000);
  }

  const hexBg = document.getElementById('hex-bg');
  const expand = document.getElementById('hex-expand');
  const btn = document.getElementById('show-bytes');
  if (hexBg && expand && btn) {
    const quote = 'I map the attack so the defenders can close it. Dylan Senez - Junior Pentester / SOC / Detection Engineer. Authorized engagements only. Build the lab. Attack the system. Collect the telemetry. Engineer the detection. Document the findings. Hand the blue team a precise map of how I got in and how to shut the door.';
    let hex = '', offset = 0;
    for (let line = 0; line < 18; line++) {
      const addr = offset.toString(16).padStart(8, '0');
      let bytes = '', ascii = '';
      for (let i = 0; i < 16; i++) {
        const ch = quote.charCodeAt((offset + i) % quote.length);
        bytes += ch.toString(16).padStart(2, '0') + ' ';
        ascii += (ch >= 32 && ch < 127) ? String.fromCharCode(ch) : '.';
      }
      hex += addr + '  ' + bytes + ' ' + ascii + '\n';
      offset += 16;
    }
    hexBg.textContent = hex;
    expand.textContent = hex;
    btn.addEventListener('click', () => {
      const open = expand.hidden;
      expand.hidden = !open;
      btn.textContent = open ? 'HIDE BYTES' : 'SHOW BYTES';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  const cards = [...document.querySelectorAll('.region-card')];
  if (cards.length) {
    const groups = [...document.querySelectorAll('.region-group')];
    const filters = [...document.querySelectorAll('#writeup-filters button')];
    const search = document.getElementById('writeup-search');
    const mappedCount = document.getElementById('mapped-count');
    const empty = document.getElementById('writeup-empty');
    let activeFilter = 'all';

    function countByCat() {
      const counts = { all: cards.length, dfir:0, detection:0, web:0, wifi:0, ad:0, lab:0 };
      cards.forEach(c => { counts[c.dataset.cat] = (counts[c.dataset.cat] || 0) + 1; });
      Object.keys(counts).forEach(k => {
        const el = document.getElementById('n-' + k);
        if (el) el.textContent = counts[k];
      });
    }
    function applyFilter() {
      const q = (search && search.value || '').trim().toLowerCase();
      let shown = 0;
      cards.forEach(c => {
        const catOk = activeFilter === 'all' || c.dataset.cat === activeFilter;
        const hay = ((c.dataset.tags || '') + ' ' + c.textContent).toLowerCase();
        const qOk = !q || hay.includes(q);
        const on = catOk && qOk;
        c.classList.toggle('hidden', !on);
        if (on) shown++;
      });
      groups.forEach(g => {
        const any = [...g.querySelectorAll('.region-card')].some(c => !c.classList.contains('hidden'));
        g.classList.toggle('hidden', !any);
        const cnt = g.querySelector('.cnt');
        if (cnt) {
          const n = [...g.querySelectorAll('.region-card')].filter(c => !c.classList.contains('hidden')).length;
          cnt.textContent = n + ' REGION' + (n === 1 ? '' : 'S');
        }
      });
      if (mappedCount) mappedCount.textContent = String(shown);
      if (empty) empty.hidden = shown > 0;
    }
    filters.forEach(b => b.addEventListener('click', () => {
      activeFilter = b.dataset.filter;
      filters.forEach(x => x.classList.toggle('active', x === b));
      applyFilter();
    }));
    if (search) search.addEventListener('input', applyFilter);
    countByCat();
    applyFilter();

    const btnPublic = document.getElementById('btn-public');
    const btnSealed = document.getElementById('btn-sealed');
    const vaultPublic = document.getElementById('vault-public');
    const vaultSealed = document.getElementById('vault-sealed');
    if (btnPublic && btnSealed) {
      btnPublic.addEventListener('click', () => {
        btnPublic.classList.add('active'); btnSealed.classList.remove('active');
        vaultPublic.hidden = false; vaultSealed.hidden = true;
      });
      btnSealed.addEventListener('click', () => {
        btnSealed.classList.add('active'); btnPublic.classList.remove('active');
        vaultPublic.hidden = true; vaultSealed.hidden = false;
      });
    }
  }

  const pages = ['index.html','whoami.html','tradecraft.html','ops.html','research.html','certs.html','education.html','write-ups.html','contact.html'];
  const file = (location.pathname.split('/').pop() || 'index.html');
  let idx = pages.indexOf(file);
  if (idx < 0 && (file === '' || file === '/')) idx = 0;
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (idx < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'l') location.href = pages[(idx + 1) % pages.length];
    else if (e.key === 'ArrowLeft' || e.key === 'h') location.href = pages[(idx - 1 + pages.length) % pages.length];
    else if (e.key >= '1' && e.key <= '9') {
      const n = parseInt(e.key, 10) - 1;
      if (pages[n]) location.href = pages[n];
    } else if (e.key === '?') {
      alert('Nav: 1-9 jump pages | ←/→ or h/l cycle');
    }
  });
})();

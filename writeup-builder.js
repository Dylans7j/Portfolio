(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const form = $('#writeup-form'), stepsBox = $('#steps-container'), findingsBox = $('#findings-container');
  const preview = $('#markdown-preview'), name = $('#preview-name'), state = $('#draft-state');
  const key = 'd4rkgunn3r-writeup-builder-v2', oldKey = 'd4rkgunn3r-writeup-builder-v1';
  const tick = String.fromCharCode(96), fence = tick.repeat(3);
  const siteBase = 'https://dylans7j.github.io/Portfolio/';
  const lines = value => (value || '').split(/\n/).map(x => x.trim()).filter(Boolean);
  const safe = value => (value || '').trim() || 'Not recorded';
  const slug = value => (value || 'security-writeup').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'security-writeup';
  const bul = value => lines(value).map(x => '- ' + x).join('\n') || '- None recorded';
  const fileSlug = value => (value || 'screenshot.png').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');

  // ---- HTML helpers shared with the publisher ---------------------------------
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paragraph = value => `<p style="white-space:pre-wrap">${esc(value)}</p>`;
  const section = (title, value) => value ? `<h3>${esc(title)}</h3>${paragraph(value)}` : '';
  const asList = value => (Array.isArray(value) ? value : String(value || '').split('\n'));
  const list = value => '<ul>' + asList(value).filter(x => String(x).trim()).map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';

  // ---- redaction --------------------------------------------------------------
  // Rules: "real-value | placeholder", also accepts "=>" or "->" as separators.
  function parseRules(value) {
    return (value || '').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => {
      const parts = line.split(/\s*(?:\||=>|->)\s*/);
      return { find: parts[0], replace: parts.length > 1 ? parts.slice(1).join(' ') : '<REDACTED>' };
    }).filter(rule => rule.find);
  }
  function redactText(text, rules) {
    let out = String(text == null ? '' : text);
    rules.forEach(rule => { out = out.split(rule.find).join(rule.replace); });
    return out;
  }
  function deepRedact(value, rules, keyName) {
    if (keyName === 'src' || keyName === 'redactions') return value; // never touch embedded images or the rule list
    if (typeof value === 'string') return redactText(value, rules);
    if (Array.isArray(value)) return value.map(item => deepRedact(item, rules));
    if (value && typeof value === 'object') {
      const out = {};
      for (const k of Object.keys(value)) out[k] = deepRedact(value[k], rules, k);
      return out;
    }
    return value;
  }

  // ---- UI ---------------------------------------------------------------------
  function renum() {
    [...stepsBox.children].forEach((card, i) => { card.querySelector('.item-number').textContent = String(i + 1).padStart(2, '0'); });
    [...findingsBox.children].forEach((card, i) => { card.querySelector('.item-number').textContent = 'F-' + String(i + 1).padStart(2, '0'); });
  }
  function shotData(card) {
    return [...card.querySelectorAll('.step-shot')].map(box => ({ name: box.dataset.name || '', caption: box.querySelector('[data-shot-caption]').value || '', src: box.querySelector('img').getAttribute('src') || '' }));
  }
  function addShot(card, file, meta = {}) {
    const box = document.createElement('div');
    box.className = 'step-shot';
    box.dataset.name = file ? fileSlug(file.name) : fileSlug(meta.name || 'screenshot.png');
    const img = document.createElement('img');
    img.alt = meta.caption || 'Local screenshot preview';
    if (file) img.src = URL.createObjectURL(file);
    else if (meta.src) img.src = meta.src;
    else img.style.display = 'none';
    const caption = document.createElement('input');
    caption.type = 'text'; caption.dataset.shotCaption = ''; caption.placeholder = 'Screenshot caption'; caption.value = meta.caption || '';
    const path = document.createElement('code');
    path.className = 'shot-path'; path.textContent = 'assets/screenshots/' + box.dataset.name;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'remove-shot'; remove.textContent = 'Remove screenshot';
    remove.onclick = () => { if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src); box.remove(); render(); markUnsaved(); };
    caption.oninput = () => { render(); markUnsaved(); };
    box.append(img, caption, path, remove);
    card.querySelector('.screenshot-preview-list').append(box);
  }
  function wire(card) {
    card.querySelector('.remove-item').onclick = () => { card.remove(); renum(); render(); markUnsaved(); };
    const input = card.querySelector('.screenshot-input');
    if (input) input.onchange = () => { [...input.files].forEach(file => addShot(card, file)); input.value = ''; render(); markUnsaved(); };
  }
  function add(template, data = {}) {
    const fragment = $(template).content.cloneNode(true), card = fragment.querySelector('.repeatable-card');
    card.querySelectorAll('[data-field]').forEach(field => { if (data[field.dataset.field] !== undefined) field.value = data[field.dataset.field] || ''; });
    wire(card);
    (template === '#step-template' ? stepsBox : findingsBox).append(fragment);
    (data.screenshots || []).forEach(shot => addShot(card, null, shot));
    renum();
  }
  function read(card) {
    const out = {};
    card.querySelectorAll('[data-field]').forEach(field => { out[field.dataset.field] = field.value; });
    if (card.closest('#steps-container')) out.screenshots = shotData(card);
    return out;
  }
  function data() {
    return { fields: Object.fromEntries(new FormData(form).entries()), steps: [...stepsBox.children].map(read), findings: [...findingsBox.children].map(read) };
  }
  function previewMode() { const select = $('#preview-mode'); return select ? select.value : 'public'; }
  const currentRules = () => parseRules(data().fields.redactions);
  function visibleData() { const d = data(); return previewMode() === 'team' ? d : deepRedact(d, currentRules()); }

  // ---- Markdown ----------------------------------------------------------------
  function md(d) {
    const f = d.fields, atk = lines(f.attackPath);
    const counts = { Validated: 0, Documented: 0, Staged: 0 };
    d.steps.forEach(step => { if (counts[step.status] !== undefined) counts[step.status]++; });
    let out = '# ' + safe(f.title) + '\n\n## ' + safe(f.platform) + ' — ' + safe(f.difficulty) + ' — ' + safe(f.os) + '\n\n**Author:** Dylan Senez / D4RKGUNN3R  \n**Status:** ' + safe(f.status) + '  \n**Assessment type:** ' + safe(f.assessmentType) + '  \n**Last reviewed:** ' + safe(f.lastReviewed) + '  \n**Primary themes:** ' + safe(f.themes) + '\n\n> **Evidence standard:** Validated steps were directly reproduced. Documented steps are supported by preserved artifacts. Staged steps remain incomplete or await evidence.\n\n---\n\n## 01 / CASE OVERVIEW\n\n' + safe(f.summary) + '\n\n### Outcome\n\n' + safe(f.outcome) + '\n\n### Key takeaway\n\n' + safe(f.takeaway) + '\n\n### Validation summary\n\n| Status | Count |\n|---|---:|\n| Validated | ' + counts.Validated + ' |\n| Documented | ' + counts.Documented + ' |\n| Staged | ' + counts.Staged + ' |\n\n## 02 / ATTACK PATH\n\n' + fence + 'text\n' + (atk.length ? atk.join('\n      |\n      v\n') : '[Add attack-path stages]') + '\n' + fence + '\n';
    let n = 3;
    for (const step of d.steps) {
      out += '\n## ' + String(n++).padStart(2, '0') + ' / ' + safe(step.phase).toUpperCase() + '\n\n### ' + safe(step.title) + '\n\n**Status:** ' + safe(step.status) + '  \n**Environment:** ' + safe(step.environment) + '  \n**Evidence ID:** ' + safe(step.evidenceId) + '  \n**Artifact:** ' + safe(step.artifact) + '\n\n#### Objective\n\n' + safe(step.objective) + '\n\n#### Command / request\n\n' + fence + 'bash\n' + (step.command || '') + '\n' + fence + '\n\n#### Observed result\n\n' + fence + 'text\n' + (step.result || '') + '\n' + fence + '\n\n#### Analysis\n\n' + safe(step.analysis) + '\n\n> **Why this mattered:** ' + safe(step.why).replace(/\n+/g, ' ') + '\n';
      if ((step.screenshots || []).length) {
        out += '\n#### Screenshot evidence\n\n';
        step.screenshots.forEach((shot, i) => { const caption = shot.caption || ('Evidence screenshot ' + (i + 1)); const src = shot.src && shot.src.startsWith('data:') ? srcName(shot) : 'assets/screenshots/' + shot.name; out += '![' + caption + '](' + src + ')\n\n*' + caption + '*\n\n'; });
      }
    }
    if (d.findings.length) {
      out += '\n## ' + String(n++).padStart(2, '0') + ' / FINDINGS & REMEDIATION\n';
      d.findings.forEach((finding, i) => {
        out += '\n### ' + safe(finding.id || ('F-' + String(i + 1).padStart(2, '0'))) + ' — ' + safe(finding.title) + '\n\n**Severity:** ' + safe(finding.severity) + '  \n**Status:** ' + safe(finding.status) + '  \n**Affected asset:** ' + safe(finding.asset) + '\n\n#### Description\n\n' + safe(finding.description) + '\n\n#### Impact\n\n' + safe(finding.impact) + '\n\n#### Root cause\n\n' + safe(finding.rootCause) + '\n\n#### Remediation\n\n' + bul(finding.remediation) + '\n\n#### Validation\n\n' + bul(finding.validation) + '\n';
      });
    }
    if (lines(f.analysisSummary).length) out += '\n## ' + String(n++).padStart(2, '0') + ' / ANALYSIS\n\n' + safe(f.analysisSummary) + '\n';
    if (lines(f.remediationSummary).length) out += '\n## ' + String(n++).padStart(2, '0') + ' / REMEDIATION\n\n' + bul(f.remediationSummary) + '\n';
    out += '\n## ' + String(n++).padStart(2, '0') + ' / DEFENDER PERSPECTIVE\n\n' + safe(f.defenderPerspective) + '\n\n### Detection opportunities\n\n' + bul(f.detections) + '\n\n## ' + String(n++).padStart(2, '0') + ' / LESSONS LEARNED\n\n' + bul(f.lessons) + '\n\n### Open questions\n\n' + bul(f.openQuestions) + '\n';
    if (lines(f.troubleshooting).length) out += '\n## ' + String(n++).padStart(2, '0') + ' / TROUBLESHOOTING & SUCCESS FACTORS\n\n' + bul(f.troubleshooting) + '\n';
    out += '\n## ' + String(n++).padStart(2, '0') + ' / REFERENCES\n\n' + bul(f.references) + '\n';
    return out;
  }
  function srcName(shot) { return 'assets/screenshots/' + (shot.name || 'screenshot.png'); }

  // ---- Standalone HTML (identical structure to the published articles) ---------
  const articleCSS = '.article-body{max-width:900px;margin:auto}.article-body pre{background:#0c1016;color:#e4eaf2;padding:20px;border-radius:8px;overflow:auto;white-space:pre}.article-body img{max-width:100%;height:auto}.article-body figure{margin:24px 0}.article-body p,.article-body li{overflow-wrap:anywhere}@media print{body{background:#fff;color:#000}.journal-hero .eyebrow{color:#333}.article-body pre{background:#f4f4f4;color:#111;border:1px solid #ccc}.builder-output,.site-header,.journal-footer,.skip-link{display:none!important}a{color:#000;text-decoration:none}figure{break-inside:avoid}h2,h3{break-after:avoid}}';
  function documentHTML(d, options = {}) {
    const base = options.base || siteBase;
    // Standalone documents are used for print/PDF export inside an off-screen iframe,
    // where loading="lazy" images never enter the viewport and so never load. Force eager there.
    const imgLoading = options.standalone ? '' : ' loading="lazy"';
    const f = d.fields;
    const s = slug(f.title);
    const team = options.mode === 'team';
    const teamHead = team ? '<meta name="robots" content="noindex">' : '';
    const teamBanner = team ? '<aside class="team-banner" style="background:#7a1f1f;color:#fff;padding:12px 18px;font-weight:700;text-align:center">TEAM COPY — UNREDACTED. Do not publish or share outside the team.</aside>' : '';
    const stepHTML = d.steps.map((step, i) => `<section><h2>${i + 1}. ${esc(step.phase)} — ${esc(step.title)}</h2><p>${esc(step.status)} · ${esc(step.environment)} · ${esc(step.evidenceId)}</p>${section('Artifact', step.artifact)}${section('Objective', step.objective)}<h3>Command / request</h3><pre><code>${esc(step.command)}</code></pre><h3>Observed result</h3><pre><code>${esc(step.result)}</code></pre>${section('Analysis', step.analysis)}${section('Why this mattered', step.why)}${(step.screenshots || []).map(image => image.src ? `<figure><img src="${esc(image.src)}" alt="${esc(image.caption || image.name)}"${imgLoading}><figcaption>${esc(image.caption)}</figcaption></figure>` : '').join('')}</section>`).join('');
    const findings = d.findings.map((x, i) => `<section><h3>${esc(x.id || 'F-' + (i + 1))} — ${esc(x.title)}</h3><p>${esc(x.severity)} · ${esc(x.status)} · ${esc(x.asset)}</p>${section('Description', x.description)}${section('Impact', x.impact)}${section('Root cause', x.rootCause)}<h4>Remediation</h4>${list(x.remediation)}<h4>Validation</h4>${list(x.validation)}</section>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${teamHead}<title>${esc(f.title)} — Dylan Senez</title><meta name="description" content="${esc(f.summary)}"><link rel="canonical" href="${base}articles/${s}.html"><link rel="stylesheet" href="${base}styles.css"><link rel="stylesheet" href="${base}articles.css"><style>${articleCSS}</style></head><body>${teamBanner}<main class="journal"><a href="${base}write-ups.html">← All writeups</a><header class="journal-hero"><p class="eyebrow">${esc(f.platform)} / ${esc(f.difficulty)} / ${esc(f.os)}</p><h1>${esc(f.title)}</h1>${paragraph(f.summary)}<p>${esc(f.status)} · ${esc(f.assessmentType)} · Reviewed: ${esc(f.lastReviewed || 'Not recorded')}</p><p>Dylan Senez / D4RKGUNN3R</p>${paragraph(f.themes)}</header><article class="article-body"><h2>Case overview</h2>${section('Outcome', f.outcome)}${section('Key takeaway', f.takeaway)}<p>Validated steps were directly reproduced. Documented steps are supported by preserved artifacts. Staged steps remain incomplete or await evidence.</p><h2>Attack path</h2>${list(f.attackPath)}${stepHTML}${findings ? '<h2>Findings & remediation</h2>' + findings : ''}${f.analysisSummary ? '<h2>Analysis</h2>' + paragraph(f.analysisSummary) : ''}${f.remediationSummary ? '<h2>Remediation</h2>' + list(f.remediationSummary) : ''}<h2>Defender perspective</h2>${paragraph(f.defenderPerspective)}<h3>Detection opportunities</h3>${list(f.detections)}<h2>Lessons learned</h2>${list(f.lessons)}<h3>Open questions</h3>${list(f.openQuestions)}${lines(f.troubleshooting).length ? '<h2>Troubleshooting & success factors</h2>' + list(f.troubleshooting) : ''}<h2>References</h2>${list(f.references)}</article><footer class="journal-footer"><a href="${base}write-ups.html">Back to writeups</a></footer></main></body></html>`;
  }

  // ---- Screenshot collection + export helpers ----------------------------------
  function blobToDataURL(url) {
    return fetch(url).then(response => response.blob()).then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }));
  }
  async function collectImages(d) {
    const out = JSON.parse(JSON.stringify(d));
    const cards = [...stepsBox.children];
    for (let i = 0; i < out.steps.length; i++) {
      const imgNodes = [...(cards[i] ? cards[i].querySelectorAll('.step-shot img') : [])];
      const shots = out.steps[i].screenshots || [];
      for (let j = 0; j < shots.length; j++) {
        const node = imgNodes[j];
        const src = node ? node.getAttribute('src') || '' : '';
        if (src.startsWith('blob:')) { try { shots[j].src = await blobToDataURL(src); } catch (error) { shots[j].src = ''; } }
        else shots[j].src = src;
      }
    }
    return out;
  }
  async function prepare(mode) {
    const withImages = await collectImages(data());
    const out = mode === 'team' ? withImages : deepRedact(withImages, parseRules(withImages.fields.redactions));
    return { data: out, md: md(out), html: documentHTML(out, { base: siteBase, standalone: true, mode }), slug: slug(out.fields.title) };
  }
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Wait until the printable document (styles, fonts) is ready to render.
  function waitForLoad(win, doc, timeout) {
    return new Promise(resolve => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      if (doc.readyState === 'complete') return finish();
      win.addEventListener('load', finish, { once: true });
      doc.addEventListener('DOMContentLoaded', () => setTimeout(finish, 250), { once: true });
      setTimeout(finish, timeout || 3000);
    });
  }
  function printViaPopup(html) {
    const popup = window.open('', '_blank');
    if (!popup) throw new Error('Pop-up blocked — allow pop-ups for this site, then try Save as PDF again');
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    const go = () => { try { popup.focus(); popup.print(); } catch (error) { /* user can print manually */ } };
    setTimeout(go, 600);
  }
  async function exportPDF(mode) {
    const { html } = await prepare(mode);
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('title', 'Printable writeup');
    // Chrome prints an iframe blank when it is display:none, visibility:hidden, or 0x0.
    // Keep it rendered but parked off-screen at A4 pixel size so window.print() works.
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;background:#ffffff';
    document.body.append(frame);

    const win = frame.contentWindow;
    const doc = frame.contentDocument || (win && win.document);
    if (!doc) { frame.remove(); printViaPopup(html); return; }

    // document.write handles large payloads (e.g. multi-MB embedded screenshots)
    // more reliably than the srcdoc attribute.
    doc.open();
    doc.write(html);
    doc.close();

    await waitForLoad(win, doc, 4000);
    // Belt-and-braces: promote any lazy image to eager, and never let a stalled
    // image block the print dialog.
    doc.querySelectorAll('img').forEach(img => { if (img.loading === 'lazy') img.loading = 'eager'; });
    const pending = [...doc.images].filter(img => !img.complete);
    if (pending.length) {
      await Promise.race([
        Promise.all(pending.map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))),
        new Promise(resolve => setTimeout(resolve, 4000))
      ]);
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    let printed = false;
    const cleanup = () => setTimeout(() => frame.remove(), 1500);
    try {
      win.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 120000);
      win.focus();
      win.print();
      printed = true;
    } catch (error) {
      printed = false;
    }
    if (!printed) { frame.remove(); printViaPopup(html); }
  }

  // ---- Wiring ------------------------------------------------------------------
  function render() {
    const d = visibleData(), out = md(d);
    preview.textContent = out;
    name.textContent = slug(d.fields.title) + '.md';
    return out;
  }
  const markUnsaved = () => { state.textContent = 'Unsaved'; };

  function blank() {
    form.reset();
    stepsBox.innerHTML = ''; findingsBox.innerHTML = '';
    add('#step-template', { phase: 'Reconnaissance', status: 'Validated', evidenceId: 'EVD-001' });
    render();
  }

  $('#add-step').onclick = () => { add('#step-template'); render(); markUnsaved(); };
  $('#add-finding').onclick = () => { add('#finding-template'); render(); markUnsaved(); };
  form.oninput = form.onchange = () => { render(); markUnsaved(); };
  const modeSelect = $('#preview-mode');
  if (modeSelect) modeSelect.onchange = render;
  $('#save-draft').onclick = () => { localStorage.setItem(key, JSON.stringify(data())); state.textContent = 'Saved locally'; };
  $('#copy-markdown').onclick = async () => { try { await navigator.clipboard.writeText(render()); state.textContent = previewMode() === 'team' ? 'Team Markdown copied' : 'Public Markdown copied'; } catch (error) { state.textContent = 'Copy failed'; } };
  $('#download-markdown').onclick = () => { const d = visibleData(); download(slug(d.fields.title) + '.md', md(d), 'text/markdown'); };
  $('#save-pdf').onclick = async () => {
    try { state.textContent = 'Preparing PDF…'; await exportPDF(previewMode()); state.textContent = 'Print dialog opened — choose "Save as PDF"'; }
    catch (error) { state.textContent = error.message; }
  };
  $('#download-team-md').onclick = async () => {
    try { state.textContent = 'Preparing team copy…'; const { md: teamMd, slug: s } = await prepare('team'); download(s + '-team.md', teamMd, 'text/markdown'); state.textContent = 'Team Markdown downloaded'; }
    catch (error) { state.textContent = error.message; }
  };
  $('#download-team-html').onclick = async () => {
    try { state.textContent = 'Preparing team copy…'; const { html, slug: s } = await prepare('team'); download(s + '-team.html', html, 'text/html'); state.textContent = 'Team HTML downloaded'; }
    catch (error) { state.textContent = error.message; }
  };
  const loadTemplate = $('#load-template');
  if (loadTemplate) loadTemplate.onclick = async () => {
    if (!confirm('Load the blank writeup template? This replaces the current form contents.')) return;
    try {
      const response = await fetch('./writeup-template.json', { cache: 'no-store' });
      if (!response.ok) throw Error('Template file unavailable');
      const template = await response.json();
      form.reset(); stepsBox.innerHTML = ''; findingsBox.innerHTML = '';
      Object.entries(template.fields || {}).forEach(([field, value]) => { const element = form.elements.namedItem(field); if (element) element.value = value || ''; });
      (template.steps || []).forEach(step => add('#step-template', step));
      (template.findings || []).forEach(finding => add('#finding-template', finding));
      if (!(template.steps || []).length) add('#step-template', { phase: 'Reconnaissance', status: 'Validated', evidenceId: 'EVD-001' });
      render(); state.textContent = 'Template loaded';
    } catch (error) { blank(); state.textContent = error.message + ' — blank scaffold loaded'; }
  };
  $('#reset-builder').onclick = () => {
    if (!confirm('Reset builder and local draft?')) return;
    localStorage.removeItem(key); localStorage.removeItem(oldKey);
    blank(); state.textContent = 'Unsaved';
  };

  try {
    const stored = JSON.parse(localStorage.getItem(key) || localStorage.getItem(oldKey) || 'null');
    if (stored) {
      Object.entries(stored.fields || {}).forEach(([field, value]) => { const element = form.elements.namedItem(field); if (element) element.value = value || ''; });
      (stored.steps || []).forEach(step => add('#step-template', step));
      (stored.findings || []).forEach(finding => add('#finding-template', finding));
      state.textContent = 'Saved locally';
    } else add('#step-template', { phase: 'Reconnaissance', status: 'Validated', evidenceId: 'EVD-001' });
  } catch (error) { add('#step-template', { phase: 'Reconnaissance', status: 'Validated', evidenceId: 'EVD-001' }); }

  window.writeupBuilder = { data, md, slug, parseRules, redactText, deepRedact, collectImages, documentHTML, prepare, exportPDF, download, previewMode };
  render();
})();

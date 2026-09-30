(() => {
  'use strict';
  const repo = 'Dylans7j/Portfolio', branch = 'main';
  const base = 'https://dylans7j.github.io/Portfolio/';
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paragraph = value => `<p style="white-space:pre-wrap">${esc(value)}</p>`;
  const section = (title, value) => value ? `<h3>${esc(title)}</h3>${paragraph(value)}` : '';
  const list = value => '<ul>' + String(value || '').split('\n').filter(x => x.trim()).map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'publish-title');
  dialog.style.cssText = 'width:min(600px,90vw);max-height:85vh;overflow:auto;background:#101923;color:#edf2f7;border:1px solid #516170;border-radius:12px;padding:28px';
  dialog.innerHTML = `<h2 id="publish-title">Publish to website</h2>
    <p>Your report and screenshots will become public on your portfolio. Review the preview before publishing.</p>
    <form id="publish-form" style="display:grid;gap:16px">
    <label>Page name<input id="publish-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="100" style="display:block;width:100%"></label>
    <p id="publish-url" style="overflow-wrap:anywhere"></p>
    <label>Article type<select id="publish-category"><option value="machine">Machine walkthrough</option><option value="sherlock">Sherlock investigation</option><option value="investigation">Investigation</option><option value="engineering">SIEM engineering</option></select></label>
    <details><summary>GitHub connection setup</summary><p>Create a fine-grained GitHub personal access token with access only to <strong>Portfolio</strong> and <strong>Contents: Read and write</strong>. Set a short expiration. Paste it below when publishing. It is sent only to GitHub, never saved in your browser storage or report.</p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Open GitHub token settings</a></details>
    <label>GitHub token<input id="publish-token" type="password" autocomplete="off" required style="display:block;width:100%"></label>
    <label><input id="publish-reviewed" type="checkbox" required> This report is permitted for public release (retired if an HTB machine), and I have reviewed text and screenshots for secrets and flags.</label>
    <label><input id="publish-replace" type="checkbox"> Update the existing report with this page name, if one exists.</label>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="builder-button secondary" type="button" id="publish-preview">Preview report</button><button class="builder-button primary" type="submit" id="publish-submit">Publish now</button><button class="builder-button ghost" type="button" id="publish-close">Close</button></div>
    </form><p id="publish-status" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector(id);
  const status = $('#publish-status');
  let busy = false;
  let previewURL;
  const cleanup = () => { $('#publish-token').value = ''; if (previewURL) URL.revokeObjectURL(previewURL); };
  dialog.addEventListener('close', cleanup);
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  $('#publish-close').onclick = () => { if (!busy) dialog.close(); };
  function pageName() {
    const name = $('#publish-slug').value;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 100) throw Error('Use a page name with lowercase letters, numbers, and hyphens.');
    return name;
  }
  $('#publish-slug').oninput = () => { $('#publish-url').textContent = base + 'articles/' + $('#publish-slug').value + '.html'; };
  document.querySelector('#publish-writeup').onclick = () => {
    $('#publish-slug').value = window.writeupBuilder.slug(window.writeupBuilder.data().fields.title);
    $('#publish-slug').oninput(); $('#publish-reviewed').checked = false; $('#publish-replace').checked = false;
    status.textContent = ''; dialog.showModal();
  };
  async function report() {
    const d = window.writeupBuilder.data(), f = d.fields;
    if (!f.title.trim() || !f.summary.trim()) throw Error('Add a title and summary before publishing.');
    const imageGroups = [...document.querySelectorAll('#steps-container > .repeatable-card')].map(card => [...card.querySelectorAll('.step-shot img')]);
    let imageBytes = 0;
    for (let i = 0; i < d.steps.length; i++) {
      for (let j = 0; j < d.steps[i].screenshots.length; j++) {
        const image = imageGroups[i]?.[j];
        if (!image || !image.getAttribute('src') || !image.src.startsWith('blob:')) throw Error('Reattach saved screenshots before publishing. Local drafts save image names and captions, not image files.');
        const blob = await (await fetch(image.src)).blob();
        if (!['image/png','image/jpeg','image/webp','image/gif'].includes(blob.type)) throw Error('Publish screenshots as PNG, JPEG, WebP, or GIF.');
        imageBytes += blob.size;
        if (imageBytes > 15 * 1024 * 1024) throw Error('Screenshots total more than 15 MB. Resize them before publishing.');
        d.steps[i].screenshots[j].src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
      }
    }
    const stepHTML = d.steps.map((s, i) => `<section><h2>${i + 1}. ${esc(s.phase)} — ${esc(s.title)}</h2><p>${esc(s.status)} · ${esc(s.environment)} · ${esc(s.evidenceId)}</p>${section('Artifact',s.artifact)}${section('Objective',s.objective)}<h3>Command / request</h3><pre><code>${esc(s.command)}</code></pre><h3>Observed result</h3><pre><code>${esc(s.result)}</code></pre>${section('Analysis',s.analysis)}${section('Why this mattered',s.why)}${s.screenshots.map(image => `<figure><img src="${image.src}" alt="${esc(image.caption || image.name)}" loading="lazy"><figcaption>${esc(image.caption)}</figcaption></figure>`).join('')}</section>`).join('');
    const findings = d.findings.map((x,i) => `<section><h3>${esc(x.id || 'F-' + (i+1))} — ${esc(x.title)}</h3><p>${esc(x.severity)} · ${esc(x.status)} · ${esc(x.asset)}</p>${section('Description',x.description)}${section('Impact',x.impact)}${section('Root cause',x.rootCause)}<h4>Remediation</h4>${list(x.remediation)}<h4>Validation</h4>${list(x.validation)}</section>`).join('');
    const slug = pageName();
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(f.title)} — Dylan Senez</title><meta name="description" content="${esc(f.summary)}"><link rel="canonical" href="${base}articles/${slug}.html"><link rel="stylesheet" href="${base}styles.css"><link rel="stylesheet" href="${base}articles.css"><style>.article-body{max-width:900px;margin:auto}.article-body pre{background:#0c1016;color:#e4eaf2;padding:20px;border-radius:8px;overflow:auto;white-space:pre}.article-body img{max-width:100%;height:auto}.article-body figure{margin:24px 0}.article-body p,.article-body li{overflow-wrap:anywhere}</style></head><body><main class="journal"><a href="${base}write-ups.html">← All writeups</a><header class="journal-hero"><p class="eyebrow">${esc(f.platform)} / ${esc(f.difficulty)} / ${esc(f.os)}</p><h1>${esc(f.title)}</h1>${paragraph(f.summary)}<p>${esc(f.status)} · ${esc(f.assessmentType)} · Reviewed: ${esc(f.lastReviewed || 'Not recorded')}</p><p>Dylan Senez / D4RKGUNN3R</p>${paragraph(f.themes)}</header><article class="article-body"><h2>Case overview</h2>${section('Outcome',f.outcome)}${section('Key takeaway',f.takeaway)}<p>Validated steps were directly reproduced. Documented steps are supported by preserved artifacts. Staged steps remain incomplete or await evidence.</p><h2>Attack path</h2>${list(f.attackPath)}${stepHTML}${findings ? '<h2>Findings & remediation</h2>' + findings : ''}<h2>Defender perspective</h2>${paragraph(f.defenderPerspective)}<h3>Detection opportunities</h3>${list(f.detections)}<h2>Lessons learned</h2>${list(f.lessons)}<h3>Open questions</h3>${list(f.openQuestions)}<h2>References</h2>${list(f.references)}</article><footer class="journal-footer"><a href="${base}write-ups.html">Back to writeups</a></footer></main></body></html>`;
    return {html, entry: {slug, title:f.title, summary:f.summary, category:$('#publish-category').value, status:f.status, tags:[f.platform,f.os,...(f.themes || '').split(',')].map(x=>x.trim()).filter(Boolean)}};
  }
  $('#publish-preview').onclick = async () => {
    try {
      status.textContent = 'Preparing preview…';
      const {html} = await report();
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = URL.createObjectURL(new Blob([html], {type:'text/html'}));
      status.replaceChildren();
      const link = document.createElement('a'); link.href = previewURL; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open report preview'; status.append(link);
    } catch(error) { status.textContent = error.message; }
  };
  $('#publish-form').onsubmit = async event => {
    event.preventDefault();
    if (busy || !$('#publish-form').reportValidity()) return;
    busy = true;
    const controls = [...dialog.querySelectorAll('input, select, button')];
    controls.forEach(x => x.disabled = true);
    let token = $('#publish-token').value.trim();
    let commitSubmitted = false;
    async function api(path, method = 'GET', body) {
      const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {method, headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {})});
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw Error('GitHub denied access. Check token expiration, repository access, and Contents read/write permission.');
        if (response.status === 409 || response.status === 422) throw Error('GitHub could not update main. The branch may have changed or require a pull request. Refresh and retry, or check branch rules.');
        throw Error(`GitHub request failed (${response.status}). Your local draft is unchanged.`);
      }
      return response.json();
    }
    try {
      status.textContent = 'Preparing report and screenshots…';
      const {html, entry} = await report();
      const head = await api(`git/ref/heads/${branch}`);
      const parent = await api(`git/commits/${head.object.sha}`);
      const tree = await api(`git/trees/${parent.tree.sha}?recursive=1`);
      if (tree.truncated) throw Error('Repository listing is incomplete. Publishing stopped.');
      const catalogPath = 'builder-published.json';
      const file = tree.tree.find(x => x.path === catalogPath);
      let entries = [];
      if (file) {
        const blob = await api(`git/blobs/${file.sha}`);
        const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g,'')), c=>c.charCodeAt(0));
        entries = JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(entries)) throw Error('Published article index is invalid.');
      }
      const path = `articles/${entry.slug}.html`;
      const exists = tree.tree.some(x => x.path === path || x.path === 'docs/' + path);
      const owned = entries.some(x => x.slug === entry.slug);
      if (exists && !owned) throw Error('This page name belongs to an existing article. Choose another name.');
      if ((exists || owned) && !$('#publish-replace').checked) throw Error('This report already exists. Select “Update the existing report” to replace it.');
      entries = [entry, ...entries.filter(x => x.slug !== entry.slug)];
      const files = [[path,html],[catalogPath,JSON.stringify(entries,null,2)+'\n']];
      const elements = [];
      for (const [filePath,content] of files) {
        const blob = await api('git/blobs','POST',{content,encoding:'utf-8'});
        for (const prefix of ['', 'docs/']) elements.push({path:prefix+filePath,mode:'100644',type:'blob',sha:blob.sha});
      }
      status.textContent = 'Publishing report and article listing…';
      const nextTree = await api('git/trees','POST',{base_tree:parent.tree.sha,tree:elements});
      const commit = await api('git/commits','POST',{message:`Publish writeup: ${entry.title}`,tree:nextTree.sha,parents:[head.object.sha]});
      commitSubmitted = true;
      await api(`git/refs/heads/${branch}`,'PATCH',{sha:commit.sha,force:false});
      status.textContent = 'Published to GitHub. GitHub Pages may take a few minutes to show the update. ';
      const link = document.createElement('a'); link.href = base + path; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open published report'; status.append(link);
      $('#publish-token').value = '';
    } catch(error) {
      status.textContent = error.message + (commitSubmitted ? ' If the connection failed, check GitHub before retrying; the update may have completed.' : '');
    } finally {
      token = ''; $('#publish-token').value = ''; busy = false; controls.forEach(x => x.disabled = false);
    }
  };
})();

(() => {
  'use strict';
  const repo = 'Dylans7j/Portfolio', branch = 'main';
  const base = 'https://dylans7j.github.io/Portfolio/';
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'publish-title');
  dialog.style.cssText = 'width:min(620px,90vw);max-height:85vh;overflow:auto;background:#101923;color:#edf2f7;border:1px solid #516170;border-radius:12px;padding:28px';
  dialog.innerHTML = `<h2 id="publish-title">Publish writeup</h2>
    <p>Public releases are redacted and listed on your site. Team releases keep secrets and go to a private repository.</p>
    <form id="publish-form" style="display:grid;gap:16px">
    <label>Page name<input id="publish-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="100" style="display:block;width:100%"></label>
    <p id="publish-url" style="overflow-wrap:anywhere"></p>
    <label>Release<select id="publish-release" style="display:block;width:100%"><option value="public">Public site (redacted)</option><option value="team">Team / private repo (unredacted)</option></select></label>
    <label id="publish-team-repo-wrap" hidden>Private repository<input id="publish-team-repo" placeholder="owner/repo" autocomplete="off" style="display:block;width:100%"><small style="color:#9fb0bf">Must be a private repository the token can write to. Files land in <code>team/</code>.</small></label>
    <label>Article type<select id="publish-category"><option value="machine">Machine walkthrough</option><option value="sherlock">Sherlock investigation</option><option value="investigation">Investigation</option><option value="engineering">SIEM engineering</option></select></label>
    <details><summary>GitHub connection setup</summary><p>Create a fine-grained GitHub personal access token with <strong>Contents: Read and write</strong> on the target repository. Set a short expiration. It is sent only to GitHub, never saved in your browser storage or report.</p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Open GitHub token settings</a></details>
    <label>GitHub token<input id="publish-token" type="password" autocomplete="off" required style="display:block;width:100%"></label>
    <label id="publish-reviewed-wrap"><input id="publish-reviewed" type="checkbox"> This report is permitted for public release (retired if an HTB machine), and I have reviewed text and screenshots for secrets and flags.</label>
    <label id="publish-private-wrap" hidden><input id="publish-private" type="checkbox"> I confirm the destination repository is <strong>private</strong> and the unredacted secrets are approved for that team only.</label>
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
  function release() { return $('#publish-release').value; }
  function teamRepo() {
    const value = $('#publish-team-repo').value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(value)) throw Error('Enter the private repository as owner/repo.');
    return value;
  }
  $('#publish-release').onchange = () => {
    const team = release() === 'team';
    $('#publish-team-repo-wrap').hidden = !team;
    $('#publish-private-wrap').hidden = !team;
    $('#publish-reviewed-wrap').hidden = team;
  };
  $('#publish-slug').oninput = () => { $('#publish-url').textContent = base + 'articles/' + $('#publish-slug').value + '.html'; };
  document.querySelector('#publish-writeup').onclick = () => {
    $('#publish-slug').value = window.writeupBuilder.slug(window.writeupBuilder.data().fields.title);
    $('#publish-slug').oninput(); $('#publish-reviewed').checked = false; $('#publish-private').checked = false; $('#publish-replace').checked = false;
    $('#publish-release').value = 'public'; $('#publish-release').onchange();
    status.textContent = ''; dialog.showModal();
  };

  async function build(mode) {
    const shouldRedact = mode !== 'team';
    const raw = await window.writeupBuilder.collectImages(window.writeupBuilder.data());
    const rules = window.writeupBuilder.parseRules(raw.fields.redactions);
    const out = shouldRedact ? window.writeupBuilder.deepRedact(raw, rules) : raw;
    const f = out.fields;
    if (!f.title.trim() || !f.summary.trim()) throw Error('Add a title and summary before publishing.');
    return { data: out, html: window.writeupBuilder.documentHTML(out, { base, mode }), md: window.writeupBuilder.md(out), fields: f };
  }

  async function report() {
    const isTeam = release() === 'team';
    const { html, md, fields: f } = await build(isTeam ? 'team' : 'public'); // team copy is unredacted
    const slug = pageName();
    const entry = { slug, title: f.title, summary: f.summary, category: $('#publish-category').value, status: f.status, tags: [f.platform, f.os, ...(f.themes || '').split(',')].map(x => x.trim()).filter(Boolean) };
    return { html, md, entry, isTeam };
  }

  $('#publish-preview').onclick = async () => {
    try {
      status.textContent = 'Preparing preview…';
      const { html } = await report();
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      status.replaceChildren();
      const link = document.createElement('a'); link.href = previewURL; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open report preview'; status.append(link);
    } catch (error) { status.textContent = error.message; }
  };

  $('#publish-form').onsubmit = async event => {
    event.preventDefault();
    if (busy || !$('#publish-form').reportValidity()) return;
    const isTeam = release() === 'team';
    if (isTeam && !$('#publish-private').checked) { status.textContent = 'Confirm the destination is a private repository before publishing unredacted output.'; return; }
    if (!isTeam && !$('#publish-reviewed').checked) { status.textContent = 'Confirm the public release review before publishing.'; return; }
    busy = true;
    const controls = [...dialog.querySelectorAll('input, select, button')];
    controls.forEach(x => x.disabled = true);
    let token = $('#publish-token').value.trim();
    let commitSubmitted = false;
    let targetRepo = repo;
    async function api(path, method = 'GET', body) {
      const response = await fetch(`https://api.github.com/repos/${targetRepo}/${path}`, { method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw Error('GitHub denied access. Check token expiration, repository access, and Contents read/write permission.');
        if (response.status === 404) throw Error('Repository not found or token lacks access. For a private team repo, confirm the owner/repo and token permissions.');
        if (response.status === 409 || response.status === 422) throw Error('GitHub could not update the branch. It may have changed or require a pull request. Refresh and retry, or check branch rules.');
        throw Error(`GitHub request failed (${response.status}). Your local draft is unchanged.`);
      }
      return response.json();
    }
    try {
      status.textContent = 'Preparing report and screenshots…';
      const { html, md, entry } = await report();
      targetRepo = isTeam ? teamRepo() : repo;
      const head = await api(`git/ref/heads/${branch}`);
      const parent = await api(`git/commits/${head.object.sha}`);
      const tree = await api(`git/trees/${parent.tree.sha}?recursive=1`);
      if (tree.truncated) throw Error('Repository listing is incomplete. Publishing stopped.');

      let files;
      if (isTeam) {
        files = [[`team/${entry.slug}.html`, html], [`team/${entry.slug}.md`, md]];
      } else {
        const catalogPath = 'builder-published.json';
        const file = tree.tree.find(x => x.path === catalogPath);
        let entries = [];
        if (file) {
          const blob = await api(`git/blobs/${file.sha}`);
          const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), c => c.charCodeAt(0));
          entries = JSON.parse(new TextDecoder().decode(bytes));
          if (!Array.isArray(entries)) throw Error('Published article index is invalid.');
        }
        const path = `articles/${entry.slug}.html`;
        const exists = tree.tree.some(x => x.path === path || x.path === 'docs/' + path);
        const owned = entries.some(x => x.slug === entry.slug);
        if (exists && !owned) throw Error('This page name belongs to an existing article. Choose another name.');
        if ((exists || owned) && !$('#publish-replace').checked) throw Error('This report already exists. Select “Update the existing report” to replace it.');
        entries = [entry, ...entries.filter(x => x.slug !== entry.slug)];
        files = [[path, html], [catalogPath, JSON.stringify(entries, null, 2) + '\n']];
      }

      const elements = [];
      for (const [filePath, content] of files) {
        const blob = await api('git/blobs', 'POST', { content, encoding: 'utf-8' });
        const prefixes = isTeam ? [''] : ['', 'docs/'];
        for (const prefix of prefixes) elements.push({ path: prefix + filePath, mode: '100644', type: 'blob', sha: blob.sha });
      }
      status.textContent = isTeam ? 'Publishing team copy to the private repository…' : 'Publishing report and article listing…';
      const nextTree = await api('git/trees', 'POST', { base_tree: parent.tree.sha, tree: elements });
      const commit = await api('git/commits', 'POST', { message: (isTeam ? 'Publish team writeup: ' : 'Publish writeup: ') + entry.title, tree: nextTree.sha, parents: [head.object.sha] });
      commitSubmitted = true;
      await api(`git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: false });

      status.textContent = isTeam
        ? 'Published unredacted team copy to the private repository. '
        : 'Published to GitHub. GitHub Pages may take a few minutes to show the update. ';
      if (!isTeam) {
        const link = document.createElement('a'); link.href = base + `articles/${entry.slug}.html`; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open published report'; status.append(link);
      }
      $('#publish-token').value = '';
    } catch (error) {
      status.textContent = error.message + (commitSubmitted ? ' If the connection failed, check GitHub before retrying; the update may have completed.' : '');
    } finally {
      token = ''; $('#publish-token').value = ''; busy = false; controls.forEach(x => x.disabled = false);
    }
  };
})();

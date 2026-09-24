import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Marked } = require(process.env.MARKED_MODULE || 'marked');
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(path.join(root, 'content/articles.json'), 'utf8'));
if (!/^[a-f0-9]{40}$/.test(manifest.ref)) throw Error('Pin a reviewed commit SHA before building.');
const local = process.argv.indexOf('--source-root');
const sourceRoot = local >= 0 ? path.resolve(process.argv[local + 1]) : null;
if (sourceRoot && execFileSync('git', ['rev-parse', 'HEAD'], {cwd:sourceRoot,encoding:'utf8'}).trim() !== manifest.ref) throw Error('Local source commit does not match reviewed ref.');
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base = `https://github.com/${manifest.repository}/blob/${manifest.ref}/`;
const raw = `https://raw.githubusercontent.com/${manifest.repository}/${manifest.ref}/`;
const urlPath = s => s.split('/').map(encodeURIComponent).join('/');
const header = prefix => `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="${prefix}index.html"><span class="brand-mark">DS</span><span>Dylan Senez <small>/ D4RKGUNN3R</small></span></a><nav aria-label="Primary navigation"><a href="${prefix}index.html">Home</a><a href="${prefix}projects.html">Projects</a><a href="${prefix}write-ups.html" aria-current="page">Writeups & Investigations</a><a href="${prefix}index.html#contact">Contact</a></nav></header>`;
const page = (title, description, file, body, prefix='./', script='') => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Dylan Senez</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#07111d"><link rel="canonical" href="https://dylans7j.github.io/Portfolio/${file}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="${file.startsWith('articles/')?'article':'website'}"><meta property="og:image" content="https://dylans7j.github.io/Portfolio/og.png"><link rel="icon" href="${prefix}favicon.svg"><link rel="stylesheet" href="${prefix}styles.css"><link rel="stylesheet" href="${prefix}articles.css">${script}</head><body>${header(prefix)}<main id="main" class="journal">${body}<footer class="journal-footer">Dylan Senez / d4rkgunn3r · Authorized labs. Evidence before conclusions.<br><a href="${prefix}write-ups.html">Article library</a> · <a href="https://github.com/${manifest.repository}">GitHub source</a></footer></main></body></html>\n`;
const tags = a => `<div class="article-tags">${a.tags.map(t=>`<span>${escape(t)}</span>`).join('')}</div>`;
const built = [];
await mkdir(path.join(root,'articles'),{recursive:true});
for (const a of manifest.articles) {
  if (!/^[a-z0-9-]+$/.test(a.slug) || a.path.includes('..')) throw Error('Invalid article path');
  let md;
  if(sourceRoot) md = execFileSync('git', ['show', `${manifest.ref}:${a.path}`], {cwd:sourceRoot,encoding:'utf8'});
  else { const response = await fetch(raw+urlPath(a.path)); if(!response.ok) throw Error(`Source fetch failed: ${response.status}`); md = await response.text(); }
  const headings=[]; const ids=new Map();
  const resolve = (href, image=false) => {
    if(href.startsWith('#')) return href;
    const destination = new URL(href,(image?raw:base)+urlPath(a.path));
    if(destination.protocol !== 'https:') return '#';
    return destination.href;
  };
  const marked = new Marked({gfm:true, renderer:{
    html({text}) { return escape(text); },
    heading({tokens,depth,text}) {
      if(depth===1) return '';
      const stem=text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const count=(ids.get(stem)||0)+1;ids.set(stem,count);const id=stem+(count>1?`-${count}`:'');
      if(depth===2) headings.push({id,text:text.replace(/\*|`/g,'')});
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>`;
    },
    link({href,tokens}) { return `<a href="${escape(resolve(href))}">${this.parser.parseInline(tokens)}</a>`; },
    image({href,text}) {
      if(!a.images.includes(href)) return '';
      return `<figure><a href="${escape(resolve(href,true))}"><img src="${escape(resolve(href,true))}" alt="${escape(text)}" loading="lazy"></a><figcaption>${escape(text)}. Original reviewed source image; open for full resolution.</figcaption></figure>`;
    }
  }});
  const html=marked.parse(md).replace(/<table>/g,'<div class="table-scroll"><table>').replace(/<\/table>/g,'</table></div>');
  const minutes=Math.max(1,Math.ceil(md.split(/\s+/).length/220));
  const source=base+urlPath(a.path);
  const body=`<a class="article-link" href="../write-ups.html">← All articles</a><div class="journal-hero"><p class="eyebrow">${escape(a.label)} / ${minutes} MIN READ</p><h1>${escape(a.title)}</h1><p>${escape(a.summary)}</p><p class="article-state">${escape(a.status)}</p>${tags(a)}</div><div class="source-note">Source reviewed ${manifest.reviewed}. <a href="${source}">Read the exact GitHub source</a> · commit ${manifest.ref.slice(0,7)}. This article is generated from that Markdown, not maintained as a second draft. Evidence status reflects the source report; no independent retest is claimed. Only individually reviewed images are displayed.</div><div class="reading-layout"><nav class="toc" aria-label="On this page"><strong>ON THIS PAGE</strong>${headings.map(h=>`<a href="#${h.id}">${escape(h.text)}</a>`).join('')}</nav><article class="article-body">${html}</article></div>`;
  await writeFile(path.join(root,`articles/${a.slug}.html`),page(a.title,a.summary,`articles/${a.slug}.html`,body,'../'));
  built.push({...a,minutes,sourceSha256:createHash('sha256').update(md).digest('hex')});
}
const cards=built.map(a=>`<article class="article-card" data-category="${a.category}" data-tags="${escape(a.tags.join('|'))}" data-search="${escape([a.title,a.summary,...a.tags].join(' ').toLowerCase())}"><p class="eyebrow">${escape(a.label)} / ${a.minutes} MIN READ</p><h2><a href="./articles/${a.slug}.html">${escape(a.title)}</a></h2><p>${escape(a.summary)}</p><span class="article-state">${escape(a.status)}</span>${tags(a)}<a class="article-link" href="./articles/${a.slug}.html">Read the article →</a></article>`).join('');
const topics=[...new Set(built.flatMap(a=>a.tags))].sort();
const library=`<section class="journal-hero"><p class="eyebrow">FIELD NOTES / D4RKGUNN3R</p><h1>Writeups &<br><em>Investigations.</em></h1><p>Follow the evidence, understand the decisions, and see what still needs proving. Technical articles from my security lab, built from the original GitHub notes.</p></section><section aria-label="Browse articles"><div class="journal-controls"><label>Search articles<input id="article-search" type="search" placeholder="Try Splunk, Sysmon, or 4625"></label><label>Type<select id="article-category"><option value="">All articles</option><option value="investigation">Investigations</option><option value="engineering">SIEM engineering</option><option value="machine">Machine walkthroughs</option><option value="sherlock">Sherlock investigations</option></select></label><label>Platform or tool<select id="article-topic"><option value="">All topics</option>${topics.map(t=>`<option>${escape(t)}</option>`).join('')}</select></label></div><p class="result-count" id="article-count" role="status" aria-live="polite">${built.length} articles</p><div class="article-grid">${cards}</div><div id="article-empty" hidden><h2>No published articles match.</h2><p>Machine walkthroughs and Sherlocks will appear after their publication and evidence review.</p><button id="clear-filters" class="button secondary" type="button">Clear filters</button></div><noscript><p>All articles are listed above. Search and filters require JavaScript.</p></noscript></section><aside class="editorial-note"><h2>A deliberate publication queue.</h2><p>Machine walkthroughs and Sherlock investigations are not automatically imported from working notes. They must pass platform-permission, evidence, and redaction review first. Drafts are not presented as finished investigations.</p><a href="https://github.com/Dylans7j/HackTheBox-Walkthroughs/blob/main/PUBLICATION-QUEUE.md">View the walkthrough publication queue →</a></aside>`;
const references='<aside class="editorial-note"><h2>Reference material</h2><p>The field guides and working notes remain available separately from the article collection.</p><a href="https://github.com/Dylans7j/CHEATSHEETS">Security field guides and cheatsheets</a> · <a href="./research.html">Research notes</a> · <a href="./ops.html">Lab operations</a></aside>';
await writeFile(path.join(root,'write-ups.html'),page('Writeups & Investigations','Security investigations, detection engineering, and evidence-based lab articles by Dylan Senez.','write-ups.html',library+references,'./','<script src="./articles.js" defer></script>'));
await writeFile(path.join(root,'content/build-manifest.json'),JSON.stringify({repository:manifest.repository,ref:manifest.ref,reviewed:manifest.reviewed,articles:built.map(a=>({slug:a.slug,source:a.path,sha256:a.sourceSha256}))},null,2)+'\n');
// Support either GitHub Pages source directory without changing repository settings.
await mkdir(path.join(root,'docs/articles'),{recursive:true});
for(const file of ['write-ups.html','articles.css','articles.js','projects.html','projects.css',...built.map(a=>`articles/${a.slug}.html`)]) await copyFile(path.join(root,file),path.join(root,'docs',file));
for (const dir of ['', 'docs']) {
  const sitemapPath=path.join(root,dir,'sitemap.xml');
  let sitemap=await readFile(sitemapPath,'utf8');
  for(const a of built) {
    const location=`https://dylans7j.github.io/Portfolio/articles/${a.slug}.html`;
    if(!sitemap.includes(location)) sitemap=sitemap.replace('</urlset>',`  <url><loc>${location}</loc></url>\n</urlset>`);
  }
  await writeFile(sitemapPath,sitemap);
}
console.log(`Built ${built.length} reviewed articles for root and docs.`);

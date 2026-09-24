import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(path.join(root,'content/articles.json')));
for(const prefix of ['', 'docs/']) {
 for(const file of ['write-ups.html',...manifest.articles.map(a=>`articles/${a.slug}.html`)]) {
  const html=await readFile(path.join(root,prefix,file),'utf8');
  assert(html.includes('lang="en"') && html.includes('name="viewport"'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,`Duplicate IDs: ${file}`);
  for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
   if(href.startsWith('https:'))continue;
   if(href.startsWith('#')){ assert(ids.includes(href.slice(1)),`Missing anchor ${href}`);continue; }
   await access(path.resolve(root,prefix,path.dirname(file),href.split('#')[0]));
  }
 }
}
const elements={};
for(const key of ['#article-search','#article-category','#article-topic','#article-count','#article-empty','#clear-filters']) elements[key]={value:'',hidden:false,textContent:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn},focus(){}};
const cards=manifest.articles.map(a=>({hidden:false,dataset:{category:a.category,tags:a.tags.join('|'),search:[a.title,a.summary,...a.tags].join(' ').toLowerCase()}}));
vm.runInNewContext(await readFile(path.join(root,'articles.js'),'utf8'),{document:{querySelector:s=>elements[s],querySelectorAll:()=>cards}});
const visible=()=>cards.filter(c=>!c.hidden).length;
assert.equal(visible(),3);
elements['#article-search'].value='sysmon';elements['#article-search'].listeners.input();assert.equal(visible(),1);
elements['#article-category'].value='machine';elements['#article-category'].listeners.input();assert.equal(visible(),0);assert(!elements['#article-empty'].hidden);
elements['#clear-filters'].listeners.click();assert.equal(visible(),3);
elements['#article-topic'].value='KQL';elements['#article-topic'].listeners.input();assert.equal(visible(),1);
console.log('PASS: both publishing directories, local links, anchor IDs, filter/search/reset logic.');

const search = document.querySelector('#article-search');
const category = document.querySelector('#article-category');
const topic = document.querySelector('#article-topic');
const cards = [...document.querySelectorAll('.article-card')];
function filterArticles() {
  const words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const card of cards) {
    const match = words.every(word => card.dataset.search.includes(word)) &&
      (!category.value || category.value === card.dataset.category) &&
      (!topic.value || card.dataset.tags.split('|').includes(topic.value));
    card.hidden = !match;
    if (match) count++;
  }
  document.querySelector('#article-count').textContent = `${count} of ${cards.length} articles`;
  document.querySelector('#article-empty').hidden = count !== 0;
}
if (search) {
  for (const control of [search, category, topic]) control.addEventListener('input', filterArticles);
  document.querySelector('#clear-filters').addEventListener('click', () => {
    search.value = category.value = topic.value = ''; filterArticles(); search.focus();
  });
  filterArticles();
}


// Builder reports are maintained separately from the reviewed-source build.
(async () => {
  const grid = document.querySelector('.article-grid');
  if (!grid) return;
  try {
    const response = await fetch('./builder-published.json', {cache:'no-store'});
    if (response.status === 404) return;
    if (!response.ok) throw Error('Article index unavailable');
    const entries = await response.json();
    if (!Array.isArray(entries)) throw Error('Invalid article index');
    for (const entry of [...entries].reverse()) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.slug)) continue;
      if (grid.querySelector(`a[href="./articles/${entry.slug}.html"]`)) continue;
      const tags = Array.isArray(entry.tags) ? entry.tags.map(String) : [];
      const card = document.createElement('article'); card.className = 'article-card';
      card.dataset.category = entry.category; card.dataset.tags = tags.join('|');
      card.dataset.search = [entry.title,entry.summary,...tags].join(' ').toLowerCase();
      const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = tags.slice(0,2).join(' / ');
      const heading = document.createElement('h2'), link = document.createElement('a');
      link.href = `./articles/${entry.slug}.html`; link.textContent = entry.title; heading.append(link);
      const summary = document.createElement('p'); summary.textContent = entry.summary;
      const state = document.createElement('span'); state.className = 'article-state'; state.textContent = entry.status;
      const labels = document.createElement('div'); labels.className = 'article-tags';
      for (const tag of tags) {
        const span = document.createElement('span'); span.textContent = tag; labels.append(span);
        if (topic && ![...topic.options].some(x=>x.value === tag)) { const option = document.createElement('option'); option.textContent = tag; topic.append(option); }
      }
      card.append(eyebrow,heading,summary,state,labels); grid.prepend(card); cards.push(card);
    }
    if (search) filterArticles();
  } catch(error) {
    const note = document.createElement('p'); note.textContent = 'Additional writeups could not be loaded. Refresh to try again.'; grid.after(note);
  }
})();

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

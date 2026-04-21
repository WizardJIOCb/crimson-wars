const nav = document.getElementById('site-nav');
const mobileToggle = document.querySelector('.mobile-menu-toggle');
const newsGrid = document.getElementById('landing-news-grid');
const revealNodes = Array.from(document.querySelectorAll('.reveal'));

function toggleMenu(forceOpen) {
  if (!nav || !mobileToggle) return;
  const nextState = typeof forceOpen === 'boolean' ? forceOpen : !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', nextState);
  document.body.classList.toggle('menu-open', nextState);
  mobileToggle.setAttribute('aria-expanded', String(nextState));
}

mobileToggle?.addEventListener('click', () => {
  toggleMenu();
});

for (const link of Array.from(document.querySelectorAll('.site-nav a'))) {
  link.addEventListener('click', () => {
    toggleMenu(false);
  });
}

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.18 });

for (const node of revealNodes) {
  revealObserver.observe(node);
}

function formatNewsDate(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return 'Свежий апдейт';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(stamp);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderNews(items) {
  if (!newsGrid) return;
  if (!Array.isArray(items) || items.length === 0) {
    newsGrid.innerHTML = `
      <article class="news-card">
        <span class="news-meta">Пока тихо</span>
        <h3>Сводка еще не пролилась</h3>
        <p>Как только в игре появится свежий патч, этот блок первым поднимет боевую новость на поверхность.</p>
        <a href="/play?tab=news">Открыть вкладку новостей</a>
      </article>
    `;
    return;
  }

  newsGrid.innerHTML = items.slice(0, 3).map((item) => {
    const title = escapeHtml(item?.title || 'Crimson Wars update');
    const summary = escapeHtml(item?.summary || 'Свежая запись в журнале обновлений.');
    const date = escapeHtml(formatNewsDate(item?.publishedAt));
    const link = `/play?tab=news&news=${encodeURIComponent(String(item?.id || ''))}`;
    return `
      <article class="news-card">
        <span class="news-meta">${date}</span>
        <h3>${title}</h3>
        <p>${summary}</p>
        <a href="${link}">Открыть новость</a>
      </article>
    `;
  }).join('');
}

async function loadNews() {
  if (!newsGrid) return;
  try {
    const response = await fetch('/api/news', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderNews(Array.isArray(payload?.items) ? payload.items : []);
  } catch (_error) {
    newsGrid.innerHTML = `
      <article class="news-card">
        <span class="news-meta">Ошибка</span>
        <h3>Сводка не загрузилась</h3>
        <p>Игра на месте. Если нужно, можешь сразу открыть новостную вкладку внутри боевого меню и проверить все там.</p>
        <a href="/play?tab=news">Открыть новости в игре</a>
      </article>
    `;
  }
}

loadNews();

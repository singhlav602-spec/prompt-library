/* ============================================
   PROMPT LIBRARY — SCRIPT.JS
   Shared utilities + index page logic
   ============================================ */

/* ---- Fetch & Cache Prompts ---- */
let _promptsCache = null;

async function fetchPrompts() {
  if (_promptsCache) return _promptsCache;
  try {
    const res = await fetch('./prompts.json');
    if (!res.ok) throw new Error('Failed to load prompts.json');
    _promptsCache = await res.json();
    return _promptsCache;
  } catch (err) {
    console.error('Error loading prompts:', err);
    return [];
  }
}

/* ---- Build Category Tag HTML ---- */
function categoryTag(cat) {
  return `<span class="card-category">${escapeHtml(cat)}</span>`;
}

/* ---- Escape HTML to prevent XSS ---- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Wraps [PLACEHOLDER] tokens (in already-escaped text) in a styled span so
   users instantly see what to customize before copying. */
function highlightPlaceholders(escapedText) {
  return escapedText.replace(/\[[^\[\]]{2,80}\]/g, match =>
    `<span class="placeholder-token">${match}</span>`
  );
}

/* ---- Build a Prompt Card element ---- */
function buildCard(prompt, delay = 0) {
  const a = document.createElement('a');
  a.className = 'prompt-card animate-fade-up';
  a.href = `prompt.html?slug=${encodeURIComponent(prompt.slug)}`;
  a.style.animationDelay = `${delay}ms`;

  a.innerHTML = `
    ${categoryTag(prompt.category)}
    <div class="card-title">${escapeHtml(prompt.title)}</div>
    <div class="card-preview">${escapeHtml(prompt.preview || prompt.prompt.slice(0, 110) + '…')}</div>
    <div class="card-footer">
      <span class="card-open-btn">
        Open prompt
        <svg class="card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </span>
    </div>
  `;
  return a;
}

/* ---- Render the Card Grid ---- */
function renderGrid(prompts, container, searchTerm = '', activeCategory = 'All') {
  container.innerHTML = '';

  let filtered = prompts;

  if (activeCategory !== 'All') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.preview && p.preview.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No prompts found</h3>
        <p>Try a different search term or category.</p>
      </div>
    `;
    return filtered.length;
  }

  filtered.forEach((prompt, i) => {
    const card = buildCard(prompt, i * 50);
    container.appendChild(card);
  });

  return filtered.length;
}

/* ---- Copy to Clipboard ---- */
async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.innerHTML;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>Copied!</span>
    `;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = original;
      btn.classList.remove('copied');
    }, 2200);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '⎘ Copy Prompt';
      btn.classList.remove('copied');
    }, 2200);
  }
}

/* ============================================================
   INDEX PAGE LOGIC
   (runs only when #prompt-grid is present)
   ============================================================ */
async function initIndexPage() {
  const grid = document.getElementById('prompt-grid');
  if (!grid) return;

  const prompts = await fetchPrompts();

  /* --- Stats bar (real numbers only — no invented user/rating stats) --- */
  const statsBar = document.getElementById('site-stats');
  if (statsBar) {
    const categoryCount = new Set(prompts.map(p => p.category)).size;
    const trendingCount = prompts.filter(p => p.trending).length;
    const stats = [
      { icon: '📖', value: `${prompts.length}+`, label: 'Prompts' },
      { icon: '🗂️', value: `${Math.floor(categoryCount / 10) * 10}+`, label: 'Categories' },
      { icon: '❤️', value: '100%', label: 'Free to Use' },
      { icon: '⭐', value: `${trendingCount}`, label: 'Trending Picks' },
      { icon: '🚀', value: 'Weekly', label: 'New Prompts Added' },
    ];
    statsBar.innerHTML = stats.map(s => `
      <div class="stat-item">
        <div class="stat-icon">${s.icon}</div>
        <div>
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
        </div>
      </div>
    `).join('');
  }

  /* --- Hero trending hashtags (real top categories, clickable) --- */
  const heroTags = document.getElementById('hero-tags');
  if (heroTags) {
    const catCountsForTags = {};
    prompts.forEach(p => { catCountsForTags[p.category] = (catCountsForTags[p.category] || 0) + 1; });
    const topForTags = Object.entries(catCountsForTags).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const tagsHtml = topForTags.map(([cat]) => `<a href="#" class="hero-tag" data-category="${escapeHtml(cat)}">#${escapeHtml(cat.replace(/\s+/g, ''))}</a>`).join('');
    heroTags.insertAdjacentHTML('beforeend', tagsHtml);
    heroTags.querySelectorAll('.hero-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.preventDefault();
        showList(tag.dataset.category);
        document.getElementById('list-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* --- Header search icon focuses the hero search field --- */
  const headerSearchBtn = document.getElementById('header-search-btn');
  if (headerSearchBtn) {
    headerSearchBtn.addEventListener('click', () => {
      const heroSearch = document.getElementById('search-hero');
      if (heroSearch) {
        heroSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heroSearch.focus();
      }
    });
  }

  /* --- Newsletter form (UI only — not yet connected to an email service) --- */
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = newsletterForm.querySelector('button');
      const original = btn.innerHTML;
      btn.innerHTML = 'Coming soon!';
      btn.style.opacity = '0.7';
      setTimeout(() => { btn.innerHTML = original; btn.style.opacity = ''; }, 2200);
    });
  }

  const searchInput     = document.getElementById('search-input');
  const searchHero      = document.getElementById('search-hero');
  const countEl         = document.getElementById('prompt-count');
  const trendingSection = document.getElementById('trending-section');
  const trendingGrid    = document.getElementById('trending-grid');
  const categoryBrowse  = document.getElementById('category-browse');
  const categoryGridEl  = document.getElementById('category-grid');
  const categoryTailEl  = document.getElementById('category-tail');
  const listHeader      = document.getElementById('list-header');
  const backLink        = document.getElementById('back-to-categories');

  let activeCategory = 'All';
  let searchTerm = '';

  /* --- Trending strip (manually curated via "trending": true in prompts.json) --- */
  const trending = prompts.filter(p => p.trending);
  if (trending.length && trendingSection && trendingGrid) {
    trendingGrid.innerHTML = trending.map(p => `
      <a class="trending-card" href="prompt.html?slug=${encodeURIComponent(p.slug)}">
        <div class="trending-top-row">
          <span class="trending-badge">🔥 Trending</span>
          ${categoryTag(p.category)}
        </div>
        <div class="card-title">${escapeHtml(p.title)}</div>
        <div class="card-preview">${escapeHtml(p.preview || p.prompt.slice(0, 130) + '…')}</div>
      </a>
    `).join('');
    trendingSection.style.display = '';
  }

  /* --- Build category cards (top categories) + long-tail chips --- */
  const catCounts = {};
  prompts.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const TOP_N = 12;
  const topCats = sortedCats.slice(0, TOP_N);
  const tailCats = sortedCats.slice(TOP_N);

  function showCategoryBrowse() {
    activeCategory = 'All';
    searchTerm = '';
    if (searchInput) searchInput.value = '';
    if (searchHero) searchHero.value = '';
    categoryBrowse.style.display = '';
    listHeader.style.display = 'none';
    grid.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showList(category, term) {
    activeCategory = category;
    searchTerm = term || '';
    categoryBrowse.style.display = 'none';
    listHeader.style.display = 'flex';
    grid.style.display = '';
    const count = renderGrid(prompts, grid, searchTerm, activeCategory);
    if (countEl) {
      const label = searchTerm
        ? `Showing <strong>${count}</strong> results for "<strong>${escapeHtml(searchTerm)}</strong>"`
        : `Showing <strong>${count}</strong> of <strong>${prompts.length}</strong> prompts in <strong>${escapeHtml(category)}</strong>`;
      countEl.innerHTML = label;
    }
  }

  const CATEGORY_IMAGES = {
    'Story': 'images/cat-story.jpg',
    'NotebookLM': 'images/cat-notebooklm.jpg',
    'YouTube': 'images/cat-youtube.jpg',
    'Web Development': 'images/cat-webdev.jpg',
    'Marketing': 'images/cat-marketing.jpg',
    'Writing': 'images/cat-writing.jpg',
    'Social Media': 'images/cat-socialmedia.jpg',
    'Coding': 'images/cat-coding.jpg',
    'Productivity': 'images/cat-productivity.jpg',
    'AI Image': 'images/cat-aiimage.jpg',
    'Education': 'images/cat-education.jpg',
    'Business': 'images/cat-business.jpg',
  };

  categoryGridEl.innerHTML = topCats.map(([cat, count]) => {
    const img = CATEGORY_IMAGES[cat];
    return `
    <div class="category-card${img ? '' : ' no-image'}" data-category="${escapeHtml(cat)}">
      ${img ? `<div class="category-card-media" style="background-image:url('${img}')"></div>` : ''}
      <div class="category-card-info">
        <div>
          <div class="category-card-name">${escapeHtml(cat)}</div>
          <div class="category-card-count">${count} prompt${count === 1 ? '' : 's'}</div>
        </div>
        <div class="category-card-arrow">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </div>
    </div>
  `;
  }).join('');

  categoryTailEl.innerHTML = tailCats.map(([cat, count]) => `
    <button class="filter-btn" data-category="${escapeHtml(cat)}">${escapeHtml(cat)} · ${count}</button>
  `).join('');

  categoryGridEl.querySelectorAll('.category-card').forEach(el => {
    el.addEventListener('click', () => showList(el.dataset.category));
  });
  categoryTailEl.querySelectorAll('.filter-btn').forEach(el => {
    el.addEventListener('click', () => showList(el.dataset.category));
  });

  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      showCategoryBrowse();
    });
  }

  /* --- Handle ?q= from URL (e.g. redirected from prompt.html search) --- */
  const urlParams = new URLSearchParams(window.location.search);
  const urlQuery = urlParams.get('q');
  if (urlQuery) {
    if (searchInput) searchInput.value = urlQuery;
    if (searchHero)  searchHero.value  = urlQuery;
    showList('All', urlQuery);
  } else {
    showCategoryBrowse();
  }

  /* --- Search handlers: typing always searches across all categories --- */
  function handleSearch(val) {
    if (searchInput) searchInput.value = val;
    if (searchHero)  searchHero.value  = val;
    if (val.trim()) {
      showList('All', val);
    } else {
      showCategoryBrowse();
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => handleSearch(e.target.value));
  }
  if (searchHero) {
    searchHero.addEventListener('input', e => handleSearch(e.target.value));
  }
}

/* ============================================================
   PROMPT DETAIL PAGE LOGIC
   (runs only when #prompt-detail is present)
   ============================================================ */
async function initPromptPage() {
  const detail = document.getElementById('prompt-detail');
  if (!detail) return;

  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');

  if (!slug) {
    detail.innerHTML = `
      <div class="error-page animate-fade-up">
        <div class="error-code">404</div>
        <h2>No Prompt Specified</h2>
        <p>Please go back to the library and select a prompt.</p>
        <a href="index.html" class="btn-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Library
        </a>
      </div>
    `;
    return;
  }

  const prompts = await fetchPrompts();
  const prompt  = prompts.find(p => p.slug === slug);

  if (!prompt) {
    detail.innerHTML = `
      <div class="error-page animate-fade-up">
        <div class="error-code">404</div>
        <h2>Prompt Not Found</h2>
        <p>We couldn't find a prompt with the slug "<strong>${escapeHtml(slug)}</strong>".</p>
        <a href="index.html" class="btn-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Library
        </a>
      </div>
    `;
    return;
  }

  /* --- Set page title --- */
  document.title = `${prompt.title} — Free ChatGPT Prompt | SmartPrompts`;

  /* --- Set unique meta description, OG tags & canonical (critical for search CTR) --- */
  const pageDescription = (prompt.preview || prompt.prompt.slice(0, 140))
    + ` Free ${prompt.category} prompt — copy & use instantly.`;
  const pageUrl = `https://smartprompts.netlify.app/prompt.html?slug=${encodeURIComponent(prompt.slug)}`;

  const metaDesc = document.getElementById('meta-description');
  if (metaDesc) metaDesc.setAttribute('content', pageDescription);

  const ogTitle = document.getElementById('meta-og-title');
  if (ogTitle) ogTitle.setAttribute('content', `${prompt.title} — Free ChatGPT Prompt`);

  const ogDesc = document.getElementById('meta-og-description');
  if (ogDesc) ogDesc.setAttribute('content', pageDescription);

  const ogUrl = document.getElementById('meta-og-url');
  if (ogUrl) ogUrl.setAttribute('content', pageUrl);

  const canonical = document.getElementById('canonical-link');
  if (canonical) canonical.setAttribute('href', pageUrl);

  /* --- JSON-LD structured data (helps Google understand & can improve snippet quality) --- */
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": prompt.title,
    "description": pageDescription,
    "url": pageUrl,
    "category": prompt.category,
    "isAccessibleForFree": true
  };
  let ldScript = document.getElementById('ld-json');
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.id = 'ld-json';
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(ldJson);

  /* --- Related prompts --- */
  const related = prompts
    .filter(p => p.category === prompt.category && p.slug !== prompt.slug)
    .slice(0, 3);

  const placeholderCount = (prompt.prompt.match(/\[[^\[\]]{2,80}\]/g) || []).length;

  const relatedHTML = related.length > 0
    ? `
      <div class="related-section animate-fade-up" style="animation-delay:250ms">
        <div class="related-title">More in ${escapeHtml(prompt.category)}</div>
        <div class="related-grid">
          ${related.map(r => `
            <a class="prompt-card" href="prompt.html?slug=${encodeURIComponent(r.slug)}">
              ${categoryTag(r.category)}
              <div class="card-title">${escapeHtml(r.title)}</div>
              <div class="card-preview">${escapeHtml(r.preview || r.prompt.slice(0, 90) + '…')}</div>
              <div class="card-footer">
                <span class="card-open-btn">
                  Open
                  <svg class="card-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `
    : '';

  detail.innerHTML = `
    <div class="prompt-page-wrap">
      <a href="index.html" class="back-link animate-fade-up">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        All Prompts
      </a>

      <div class="animate-fade-up" style="animation-delay:50ms">
        <div class="prompt-page-category">${escapeHtml(prompt.category)}</div>
        <h1 class="prompt-page-title">${escapeHtml(prompt.title)}</h1>
        <div class="prompt-page-divider"></div>
      </div>

      <div class="animate-fade-up" style="animation-delay:120ms">
        <div class="prompt-box">
          <span class="prompt-box-quote">&ldquo;</span>
          <div class="prompt-box-header">
            <div class="prompt-box-label">
              Prompt · ${prompt.prompt.trim().split(/\s+/).length} words${placeholderCount ? ` · ${placeholderCount} field${placeholderCount === 1 ? '' : 's'} to fill in` : ''}
            </div>
            <button class="copy-btn" id="copy-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Copy Prompt</span>
            </button>
          </div>
          <div class="prompt-text" id="prompt-text">${highlightPlaceholders(escapeHtml(prompt.prompt))}</div>
        </div>
      </div>

      ${relatedHTML}
    </div>
  `;

  /* --- Wire up copy button --- */
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyToClipboard(prompt.prompt, copyBtn);
    });
  }
}

/* ---- Theme toggle (shared across index.html and prompt.html) ---- */
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  });
}

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initIndexPage();
  initPromptPage();
});

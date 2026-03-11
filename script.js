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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
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

  const searchInput  = document.getElementById('search-input');
  const searchHero   = document.getElementById('search-hero');
  const filterRow    = document.getElementById('filter-row');
  const countEl      = document.getElementById('prompt-count');

  const prompts = await fetchPrompts();

  /* --- Build category filters --- */
  const categories = ['All', ...new Set(prompts.map(p => p.category))];
  let activeCategory = 'All';
  let searchTerm = '';

  filterRow.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === 'All' ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      filterRow.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const count = renderGrid(prompts, grid, searchTerm, activeCategory);
      if (countEl) countEl.innerHTML = `Showing <strong>${count}</strong> of <strong>${prompts.length}</strong> prompts`;
    });
    filterRow.appendChild(btn);
  });

  /* --- Handle ?q= from URL (e.g. redirected from prompt.html search) --- */
  const urlParams = new URLSearchParams(window.location.search);
  const urlQuery = urlParams.get('q');
  if (urlQuery) {
    searchTerm = urlQuery;
    if (searchInput) searchInput.value = urlQuery;
    if (searchHero)  searchHero.value  = urlQuery;
  }

  /* --- Initial render --- */
  const count = renderGrid(prompts, grid, searchTerm, 'All');
  if (countEl) countEl.innerHTML = `Showing <strong>${count}</strong> of <strong>${prompts.length}</strong> prompts`;

  /* --- Search handlers --- */
  function handleSearch(val) {
    searchTerm = val;
    // Sync both search inputs
    if (searchInput)  searchInput.value = val;
    if (searchHero)   searchHero.value  = val;
    const count = renderGrid(prompts, grid, searchTerm, activeCategory);
    if (countEl) countEl.innerHTML = `Showing <strong>${count}</strong> of <strong>${prompts.length}</strong> prompts`;
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
  document.title = `${prompt.title} — Prompt Library`;

  /* --- Related prompts --- */
  const related = prompts
    .filter(p => p.category === prompt.category && p.slug !== prompt.slug)
    .slice(0, 3);

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
          <div class="prompt-box-label">Prompt</div>
          <div class="prompt-text" id="prompt-text">${escapeHtml(prompt.prompt)}</div>
        </div>

        <button class="copy-btn" id="copy-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Prompt
        </button>
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

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', () => {
  initIndexPage();
  initPromptPage();
});

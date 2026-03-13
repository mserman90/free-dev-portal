// Free Dev Portal - App Logic
const state = {
  lang: 'tr',
  data: [],
  filtered: [],
  page: 1,
  perPage: 12,
  view: 'grid'
};

function loadData() {
  return fetch('data/free-for-dev.json')
    .then(r => r.json())
    .then(json => {
      state.data = json;
      populateCategories();
      applyFilters();
    })
    .catch(e => console.error('Data load error:', e));
}

function getFilters() {
  const q = document.getElementById('q')?.value.trim().toLowerCase() || '';
  const category = document.getElementById('category')?.value || 'all';
  const priority = document.getElementById('priority')?.value || 'all';
  const sort = document.getElementById('sort')?.value || 'priority';
  
  const noCC = document.getElementById('no-cc')?.checked || false;
  const openSource = document.getElementById('open-source')?.checked || false;
  const hasAcademic = document.getElementById('has-academic')?.checked || false;

  return { q, category, priority, sort, noCC, openSource, hasAcademic };
}

function matchesText(e, q) {
  if (!q) return true;
  const fields = [
    e.name,
    e.description_en,
    e.description_tr,
    e.free_tier_summary,
    e.academic_notes,
    e.url,
    ...(e.tags || []),
    ...(e.usage_examples || [])
  ].filter(Boolean).join(' ').toLowerCase();
  return fields.includes(q);
}

function applyFilters() {
  const filters = getFilters();
  let items = [...state.data];

  // Text search
  if (filters.q) {
    items = items.filter(e => matchesText(e, filters.q));
  }

  // Category
  if (filters.category !== 'all') {
    items = items.filter(e => e.category === filters.category);
  }

  // Priority
  if (filters.priority !== 'all') {
    items = items.filter(e => String(e.priority) === String(filters.priority));
  }

  // Checkboxes
  if (filters.noCC) {
    items = items.filter(e => e.requires_credit_card === false);
  }
  if (filters.openSource) {
    items = items.filter(e => e.is_open_source === true);
  }
  if (filters.hasAcademic) {
    items = items.filter(e => e.academic_notes && e.academic_notes.length > 0);
  }

  // Sorting
  if (filters.sort === 'priority') {
    items.sort((a, b) => {
      const pa = a.priority ?? 99;
      const pb = b.priority ?? 99;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
  } else if (filters.sort === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  state.filtered = items;
  state.page = 1;
  renderResults();
}

function populateCategories() {
  const select = document.getElementById('category');
  if (!select) return;
  
  const existing = new Set();
  state.data.forEach(e => {
    if (e.category) existing.add(e.category);
  });
  
  const sorted = Array.from(existing).sort();
  sorted.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function renderResults() {
  const list = document.getElementById('results-list');
  const countEl = document.getElementById('results-count');
  const emptyEl = document.getElementById('no-results');

  if (!list || !countEl || !emptyEl) return;

  list.innerHTML = '';
  countEl.textContent = state.filtered.length;

  if (state.filtered.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  
  const start = (state.page - 1) * state.perPage;
  const end = start + state.perPage;
  const pageItems = state.filtered.slice(start, end);

  pageItems.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'card';
    
    // Description based on language
    const desc = state.lang === 'tr' 
      ? (entry.description_tr || entry.description_en) 
      : (entry.description_en || entry.description_tr);

    card.innerHTML = \`
      <div class=\"card-header\">
        <div class=\"card-title-wrap\">
          <div class=\"card-title\"><a href=\"\${entry.url}\" target=\"_blank\" rel=\"noreferrer\">\${entry.name}</a></div>
          <div class=\"card-category\">\${entry.category}</div>
        </div>
      </div>
      <div class=\"card-desc\">\${desc || ''}</div>
      \${entry.free_tier_summary ? \`<div class=\"card-tier\">\${entry.free_tier_summary}</div>\` : ''}
      <div class=\"tags\">
        \${(entry.tags || []).map(t => \`<span class=\"tag\">\${t}</span>\`).join('')}
      </div>
      <div class=\"badges\">
        \${entry.priority ? \`<span class=\"badge badge-priority\">P\${entry.priority}</span>\` : ''}
        \${entry.requires_credit_card === false ? \`<span class=\"badge badge-no-cc\">\${state.lang === 'tr' ? 'KK Yok' : 'No CC'}</span>\` : ''}
        \${entry.is_open_source === true ? \`<span class=\"badge badge-oss\">OSS</span>\` : ''}
      </div>
      \${entry.academic_notes ? \`<div class=\"card-notes\"><strong>\${state.lang === 'tr' ? 'Akademik:' : 'Academic:'}</strong> \${entry.academic_notes}</div>\` : ''}
      <div class=\"card-footer\">
        <div>\${new URL(entry.url).hostname}</div>
        <button class=\"btn-details\" onclick=\"window.showModalById('\${entry.id || entry.name}')\">\${state.lang === 'tr' ? 'Detay' : 'Details'}</button>
      </div>
    \`;
    list.appendChild(card);
  });

  renderPagination();
}

// Global modal function
window.showModalById = (id) => {
  const entry = state.data.find(e => (e.id || e.name) === id);
  if (entry) showModal(entry);
};

function renderPagination() {
  const pag = document.getElementById('pagination');
  if (!pag) return;
  pag.innerHTML = '';
  
  const totalPages = Math.ceil(state.filtered.length / state.perPage);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '‹';
  prevBtn.disabled = state.page === 1;
  prevBtn.onclick = () => { state.page--; renderResults(); window.scrollTo({top: 0, behavior: 'smooth'}); };
  pag.appendChild(prevBtn);

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = \`\${state.page} / \${totalPages}\`;
  pag.appendChild(info);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '›';
  nextBtn.disabled = state.page === totalPages;
  nextBtn.onclick = () => { state.page++; renderResults(); window.scrollTo({top: 0, behavior: 'smooth'}); };
  pag.appendChild(nextBtn);
}

function showModal(entry) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;

  const desc = state.lang === 'tr' 
    ? (entry.description_tr || entry.description_en) 
    : (entry.description_en || entry.description_tr);

  content.innerHTML = \`
    <h2>\${entry.name}</h2>
    <div class=\"modal-url\"><a href=\"\${entry.url}\" target=\"_blank\">\${entry.url}</a></div>
    <div class=\"modal-section\">
      <h3>\${state.lang === 'tr' ? 'Açıklama' : 'Description'}</h3>
      <p>\${desc}</p>
    </div>
    \${entry.free_tier_summary ? \`
      <div class=\"modal-section\">
        <h3>\${state.lang === 'tr' ? 'Ücretsiz Katman' : 'Free Tier'}</h3>
        <p>\${entry.free_tier_summary}</p>
      </div>
    \` : ''}
    \${entry.usage_examples ? \`
      <div class=\"modal-section\">
        <h3>\${state.lang === 'tr' ? 'Kullanım Örnekleri' : 'Usage Examples'}</h3>
        <ul>\${entry.usage_examples.map(ex => \`<li>\${ex}</li>\`).join('')}</ul>
      </div>
    \` : ''}
  \`;
  overlay.classList.remove('hidden');
}

function updateLanguage(lang) {
  state.lang = lang;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  
  document.querySelectorAll('[data-i18n-tr]').forEach(el => {
    const tr = el.getAttribute('data-i18n-tr');
    const en = el.getAttribute('data-i18n-en');
    el.textContent = lang === 'tr' ? tr : en;
  });

  const qInput = document.getElementById('q');
  if (qInput) {
    qInput.placeholder = lang === 'tr' ? 'Ara: isim, kategori, etiket...' : 'Search: name, category, tag...';
  }

  applyFilters();
}

function attachEvents() {
  const filterIds = ['category', 'priority', 'sort', 'no-cc', 'open-source', 'has-academic'];
  filterIds.forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => updateLanguage(btn.dataset.lang));
  });

  const qInput = document.getElementById('q');
  const clearBtn = document.getElementById('clear-search');
  
  qInput?.addEventListener('input', () => {
    if (clearBtn) clearBtn.style.display = qInput.value ? 'flex' : 'none';
    applyFilters(); // Real-time search
  });

  qInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.preventDefault();
  });

  clearBtn?.addEventListener('click', () => {
    if (qInput) {
      qInput.value = '';
      clearBtn.style.display = 'none';
      qInput.focus();
    }
    applyFilters();
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (qInput) qInput.value = '';
    ['category', 'priority'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    const sort = document.getElementById('sort');
    if (sort) sort.value = 'priority';
    
    ['no-cc', 'open-source', 'has-academic'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
    
    if (clearBtn) clearBtn.style.display = 'none';
    applyFilters();
  });

  document.getElementById('modal-close')?.addEventListener('click', () => {
    document.getElementById('modal-overlay')?.classList.add('hidden');
  });

  window.addEventListener('click', (e) => {
    const overlay = document.getElementById('modal-overlay');
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  loadData().then(() => updateLanguage('tr'));
});

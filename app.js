// Free Dev Portal - App Logic
const state = {
  lang: 'tr',
  data: [],
  filtered: [],
  page: 1,
  perPage: 12
};

async function loadData() {
  try {
    const r = await fetch('./data/free-for-dev.json');
    if (!r.ok) throw new Error('Fetch failed');
    state.data = await r.json();
    populateCategories();
    applyFilters();
  } catch (e) {
    console.error('Data error:', e);
    const list = document.getElementById('results-list');
    if (list) list.innerHTML = '<p style="color:red;padding:2rem;text-align:center;">Veri yüklenemedi. Lütfen sayfayı yenileyin.</p>';
  }
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
  const fields = [e.name, e.description_en, e.description_tr, e.free_tier_summary, e.academic_notes, e.url].filter(Boolean).join(' ').toLowerCase();
  return fields.includes(q);
}

function applyFilters() {
  const filters = getFilters();
  let items = [...state.data];
  if (filters.q) items = items.filter(e => matchesText(e, filters.q));
  if (filters.category !== 'all') items = items.filter(e => e.category === filters.category);
  if (filters.priority !== 'all') items = items.filter(e => String(e.priority) === String(filters.priority));
  if (filters.noCC) items = items.filter(e => e.requires_credit_card === false);
  if (filters.openSource) items = items.filter(e => e.is_open_source === true);
  if (filters.hasAcademic) items = items.filter(e => e.academic_notes && e.academic_notes.length > 0);
  
  if (filters.sort === 'priority') {
    items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.name.localeCompare(b.name));
  } else {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  state.filtered = items;
  state.page = 1;
  renderResults();
}

function populateCategories() {
  const select = document.getElementById('category');
  if (!select) return;
  const cats = new Set();
  state.data.forEach(e => { if (e.category) cats.add(e.category); });
  const sorted = Array.from(cats).sort();
  select.innerHTML = '<option value="all">Tümü</option>';
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
  
  const pageItems = state.filtered.slice((state.page - 1) * state.perPage, state.page * state.perPage);
  pageItems.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'card';
    const desc = state.lang === 'tr' ? (entry.description_tr || entry.description_en) : (entry.description_en || entry.description_tr);
    const tagsHtml = (entry.tags || []).map(t => '<span class="tag">' + t + '</span>').join('');
    const badgesHtml = (entry.priority ? '<span class="badge badge-priority">P' + entry.priority + '</span>' : '') +
                       (entry.requires_credit_card === false ? '<span class="badge badge-no-cc">' + (state.lang === 'tr' ? 'KK Yok' : 'No CC') + '</span>' : '') +
                       (entry.is_open_source === true ? '<span class="badge badge-oss">OSS</span>' : '');
    
    let hostname = '';
    try { hostname = new URL(entry.url).hostname; } catch(e) {}

    card.innerHTML = '<div class="card-header"><div class="card-title-wrap"><div class="card-title"><a href="' + entry.url + '" target="_blank">' + entry.name + '</a></div>' +
                     '<div class="card-category">' + entry.category + '</div></div></div>' +
                     '<div class="card-desc">' + (desc || '') + '</div>' +
                     (entry.free_tier_summary ? '<div class="card-tier">' + entry.free_tier_summary + '</div>' : '') +
                     '<div class="tags">' + tagsHtml + '</div><div class="badges">' + badgesHtml + '</div>' +
                     (entry.academic_notes ? '<div class="card-notes"><strong>Akademik:</strong> ' + entry.academic_notes + '</div>' : '') +
                     '<div class="card-footer"><div>' + hostname + '</div>' +
                     '<button class="btn-details" onclick="showModalById(\'' + (entry.id || entry.name) + '\')">' + (state.lang === 'tr' ? 'Detay' : 'Details') + '</button></div>';
    list.appendChild(card);
  });
  renderPagination();
}

window.showModalById = (id) => {
  const entry = state.data.find(e => (e.id || e.name) === id);
  if (entry) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    const desc = state.lang === 'tr' ? (entry.description_tr || entry.description_en) : (entry.description_en || entry.description_tr);
    content.innerHTML = '<h2>' + entry.name + '</h2><p>' + desc + '</p><a href="' + entry.url + '" target="_blank">' + entry.url + '</a>';
    overlay.classList.remove('hidden');
  }
};

function renderPagination() {
  const pag = document.getElementById('pagination');
  if (!pag) return;
  pag.innerHTML = '';
  const total = Math.ceil(state.filtered.length / state.perPage);
  if (total <= 1) return;
  const btn = (txt, dis, cb) => { const b = document.createElement('button'); b.textContent = txt; b.disabled = dis; b.onclick = cb; pag.appendChild(b); };
  btn(String.fromCharCode(8249), state.page === 1, () => { state.page--; renderResults(); window.scrollTo({top:0, behavior:\'smooth\'}); });
  const span = document.createElement('span'); span.className='page-info'; span.textContent = state.page + ' / ' + total; pag.appendChild(span);
  btn(String.fromCharCode(8250), state.page === total, () => { state.page++; renderResults(); window.scrollTo({top:0, behavior:\'smooth\'}); });
}

function updateLanguage(lang) {
  state.lang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  document.querySelectorAll('[data-i18n-tr]').forEach(el => {
    el.textContent = lang === 'tr' ? el.getAttribute('data-i18n-tr') : el.getAttribute('data-i18n-en');
  });
  applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => updateLanguage(b.dataset.lang)));
  document.getElementById('q')?.addEventListener('input', applyFilters);
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    document.getElementById('q').value = '';
    ['category', 'priority'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'all'; });
    applyFilters();
  });
  document.getElementById('modal-close')?.addEventListener('click', () => document.getElementById('modal-overlay').classList.add('hidden'));
  ['category', 'priority', 'sort', 'no-cc', 'open-source', 'has-academic'].forEach(id => document.getElementById(id)?.addEventListener('change', applyFilters));
  loadData();
});

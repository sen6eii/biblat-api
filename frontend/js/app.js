const API_BASE = 'http://localhost:3000';

let state = {
  apiKey: localStorage.getItem('biblat_api_key') || '',
  currentPage: 1,
  totalPages: 1,
  currentSection: 'dashboard',
  searchQuery: '',
  filterCategory: '',
  editingId: null,
  books: [],
  stats: { books: 0, authors: 0, categories: 0 }
};

// Utilidades
const $ = id => document.getElementById(id);
const api = async (path, opts = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (state.apiKey) headers['x-api-key'] = state.apiKey;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  return res.json();
};

const toast = (msg, type = 'success') => {
  const container = $('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
};

// Navegación
const navigate = (section) => {
  state.currentSection = section;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`section-${section}`)?.classList.add('active');
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

  if (section === 'dashboard') loadDashboard();
  else if (section === 'books') loadBooks();
};

// Dashboard
const loadDashboard = async () => {
  try {
    const [booksRes, authorsRes, catsRes] = await Promise.all([
      api('/v1/books?limit=1'),
      api('/v1/authors'),
      api('/v1/categories')
    ]);

    const total = booksRes.meta?.total || 0;
    const authors = authorsRes.data?.length || 0;
    const cats = catsRes.data?.length || 0;

    $('stat-books').textContent = total.toLocaleString();
    $('stat-authors').textContent = authors.toLocaleString();
    $('stat-categories').textContent = cats.toLocaleString();

    // Últimos libros
    const recent = await api('/v1/books?limit=5');
    const tbody = $('recent-books');
    if (recent.data?.length) {
      tbody.innerHTML = recent.data.map(b => `
        <tr>
          <td>${b.cover_url
            ? `<img src="${b.cover_url}" class="book-cover" alt="" onerror="this.style.display='none'">`
            : `<div class="cover-placeholder">sin img</div>`}
          </td>
          <td><strong>${esc(b.title)}</strong></td>
          <td>${esc(b.author)}</td>
          <td>${b.year || '—'}</td>
          <td><span class="badge">${esc(b.category || '—')}</span></td>
        </tr>`).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Sin libros aún. Corre el scraper para poblar la base.</td></tr>';
    }
  } catch (e) {
    toast('Error al cargar el dashboard. ¿El servidor está corriendo?', 'error');
  }
};

// Libros
const loadBooks = async () => {
  const { currentPage, searchQuery, filterCategory } = state;
  showTableLoading();

  try {
    let path;
    if (searchQuery) {
      path = `/v1/books/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=20`;
    } else {
      path = `/v1/books?page=${currentPage}&limit=20`;
      if (filterCategory) path += `&category=${encodeURIComponent(filterCategory)}`;
    }

    const res = await api(path);
    state.books = res.data || [];
    state.totalPages = res.meta?.pages || 1;

    renderBooks(state.books);
    renderPagination(res.meta);
    await loadCategoryFilter();
  } catch (e) {
    toast('Error al cargar libros', 'error');
  }
};

const showTableLoading = () => {
  $('books-tbody').innerHTML = `<tr><td colspan="7"><div class="loading"><div class="spinner"></div>Cargando...</div></td></tr>`;
};

const renderBooks = (books) => {
  const tbody = $('books-tbody');
  if (!books.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>
      <p>No se encontraron libros</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = books.map(b => `
    <tr>
      <td>${b.cover_url
        ? `<img src="${b.cover_url}" class="book-cover" alt="" onerror="this.style.display='none'">`
        : `<div class="cover-placeholder">sin img</div>`}
      </td>
      <td><strong>${esc(b.title)}</strong></td>
      <td>${esc(b.author)}</td>
      <td>${b.year || '—'}</td>
      <td><span class="badge">${esc(b.category || '—')}</span></td>
      <td>${b.isbn ? esc(b.isbn) : '—'}</td>
      <td>
        <div class="actions">
          <button class="icon-btn" onclick="openEditModal('${b.id}')" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="icon-btn del" onclick="deleteBook('${b.id}', '${esc(b.title)}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
};

const renderPagination = (meta) => {
  if (!meta) return;
  $('pagination-info').textContent = `${meta.total} libros · Página ${meta.page} de ${meta.pages}`;

  const container = $('pagination-pages');
  const { page, pages } = meta;
  let html = '';

  const addBtn = (p, label, active = false) => {
    html += `<button class="page-btn ${active ? 'active' : ''}" onclick="goToPage(${p})" ${active ? 'disabled' : ''}>${label || p}</button>`;
  };

  if (page > 1) addBtn(page - 1, '←');
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) addBtn(i, i, i === page);
  if (page < pages) addBtn(page + 1, '→');

  container.innerHTML = html;
};

const loadCategoryFilter = async () => {
  const sel = $('filter-category');
  if (sel.options.length > 1) return;
  const res = await api('/v1/categories');
  res.data?.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
};

window.goToPage = (page) => {
  state.currentPage = page;
  loadBooks();
};

// Búsqueda y filtros
$('search-input').addEventListener('input', debounce(e => {
  state.searchQuery = e.target.value.trim();
  state.currentPage = 1;
  if (state.currentSection === 'books') loadBooks();
}, 400));

$('filter-category').addEventListener('change', e => {
  state.filterCategory = e.target.value;
  state.currentPage = 1;
  loadBooks();
});

// Modal nuevo/editar
const openNewModal = () => {
  state.editingId = null;
  $('modal-title').textContent = 'Agregar libro';
  $('book-form').reset();
  openModal();
};

window.openEditModal = async (id) => {
  state.editingId = id;
  $('modal-title').textContent = 'Editar libro';
  const res = await api(`/v1/books/${id}`);
  if (res.data) {
    const b = res.data;
    $('f-title').value = b.title || '';
    $('f-author').value = b.author || '';
    $('f-year').value = b.year || '';
    $('f-editorial').value = b.editorial || '';
    $('f-category').value = b.category || '';
    $('f-isbn').value = b.isbn || '';
    $('f-cover-url').value = b.cover_url || '';
    $('f-subject').value = b.subject || '';
  }
  openModal();
};

const openModal = () => $('book-modal').classList.add('open');
const closeModal = () => $('book-modal').classList.remove('open');

$('modal-overlay-bg').addEventListener('click', closeModal);

$('book-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!state.apiKey) {
    toast('Configura tu API key en "Configuración"', 'error');
    return;
  }

  const body = {
    title: $('f-title').value,
    author: $('f-author').value,
    year: $('f-year').value ? parseInt($('f-year').value) : null,
    editorial: $('f-editorial').value || null,
    category: $('f-category').value || null,
    isbn: $('f-isbn').value || null,
    cover_url: $('f-cover-url').value || null,
    subject: $('f-subject').value || null
  };

  try {
    let res;
    if (state.editingId) {
      res = await api(`/v1/books/${state.editingId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      res = await api('/v1/books', { method: 'POST', body: JSON.stringify(body) });
    }

    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast(state.editingId ? 'Libro actualizado' : 'Libro creado');
      closeModal();
      loadBooks();
    }
  } catch (err) {
    toast('Error al guardar el libro', 'error');
  }
});

window.deleteBook = async (id, title) => {
  if (!state.apiKey) {
    toast('Configura tu API key en "Configuración"', 'error');
    return;
  }
  if (!confirm(`¿Eliminar "${title}"?`)) return;

  try {
    const res = await api(`/v1/books/${id}`, { method: 'DELETE' });
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Libro eliminado');
      loadBooks();
    }
  } catch (err) {
    toast('Error al eliminar', 'error');
  }
};

// API Key
const saveApiKey = () => {
  const key = $('api-key-input').value.trim();
  state.apiKey = key;
  localStorage.setItem('biblat_api_key', key);
  toast('API key guardada');
};

if (state.apiKey) $('api-key-input').value = state.apiKey;

// Helpers
const esc = str => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Init
navigate('dashboard');

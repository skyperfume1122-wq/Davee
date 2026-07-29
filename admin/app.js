// === HÜFEL Admin Panel App ===

const API = {
  async get(path) {
    const res = await fetch(path, { credentials: 'same-origin' });
    if (res.status === 401) { await handleSessionExpired(); return { error: 'Unauthorized' }; }
    return res.json();
  },
  async post(path, data) {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.status === 401) { await handleSessionExpired(); return { error: 'Unauthorized' }; }
    return res.json();
  },
  async put(path, data) {
    const res = await fetch(path, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.status === 401) { await handleSessionExpired(); return { error: 'Unauthorized' }; }
    return res.json();
  },
  async del(path) {
    const res = await fetch(path, { method: 'DELETE', credentials: 'same-origin' });
    if (res.status === 401) { await handleSessionExpired(); return { error: 'Unauthorized' }; }
    return res.json();
  }
};

// Handle session expiry - redirect to login
async function handleSessionExpired() {
  currentUser = null;
  renderLogin();
  throw new Error('Session expired. Please log in again.');
}

// File upload helper - returns a Promise with the uploaded URL
function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    fetch('/api/upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData
    })
    .then(r => {
      if (r.status === 401) {
        handleSessionExpired();
        reject('Session expired');
        return null;
      }
      return r.json();
    })
    .then(data => {
      if (!data) return;
      if (data.success) resolve(data.url);
      else reject(data.error || 'Upload failed');
    })
    .catch(reject);
  });
}

// Create a file upload UI that replaces a text input
function createFileUploader(containerId, currentValue, onUrlChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <input type="file" accept="image/*" class="file-input" style="flex:1;padding:8px;background:var(--bg-soft);border:1px solid var(--line);border-radius:var(--radius);color:var(--fg);font-size:13px;">
      <input type="hidden" id="${containerId}-hidden" value="${currentValue || ''}">
      <div id="${containerId}-preview" style="width:60px;height:60px;border-radius:6px;overflow:hidden;border:1px solid var(--line);background:var(--bg-soft);display:${currentValue ? 'block' : 'none'};">
        ${currentValue ? `<img src="${currentValue}" style="width:100%;height:100%;object-fit:cover;">` : ''}
      </div>
      <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('${containerId}').querySelector('.file-input').click()">📁 Browse</button>
    </div>
    <div id="${containerId}-status" style="font-size:11px;color:var(--muted2);margin-top:4px;">${currentValue ? 'Current: ' + currentValue.substring(0, 40) + '...' : 'No file selected'}</div>
  `;
  
  const fileInput = container.querySelector('.file-input');
  fileInput.addEventListener('change', async function() {
    if (!this.files || !this.files[0]) return;
    const status = document.getElementById(containerId + '-status');
    status.textContent = 'Uploading...';
    status.style.color = 'var(--accent)';
    try {
      const url = await uploadFile(this.files[0]);
      document.getElementById(containerId + '-hidden').value = url;
      const preview = document.getElementById(containerId + '-preview');
      preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
      preview.style.display = 'block';
      status.textContent = '✓ Uploaded: ' + url.substring(0, 50) + '...';
      status.style.color = 'var(--success)';
      if (onUrlChange) onUrlChange(url);
    } catch (err) {
      status.textContent = '✗ Upload failed: ' + err;
      status.style.color = 'var(--danger)';
    }
  });
}

// Toast notification
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// Loading spinner
function loading() {
  return '<div class="loading">Loading...</div>';
}

// Empty state
function empty(msg = 'No items found') {
  return `
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>${msg}</p>
    </div>
  `;
}

// --- Router / Page Rendering ---

let currentUser = null;

async function checkAuth() {
  const data = await API.get('/api/auth/me');
  if (data.authenticated) {
    currentUser = data.user;
    renderDashboard();
  } else {
    renderLogin();
  }
}

function renderLogin() {
  const app = document.getElementById('app');
  const tpl = document.getElementById('tpl-login');
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-pass').value;
    const errEl = document.getElementById('login-error');

    try {
      const res = await API.post('/api/auth/login', { username, password });
      if (res.success) {
        toast('Welcome back!', 'success');
        currentUser = res.user;
        renderDashboard();
      } else {
        errEl.textContent = 'Invalid credentials';
      }
    } catch (err) {
      errEl.textContent = 'Connection error';
    }
  });
}

function renderDashboard() {
  const app = document.getElementById('app');
  const tpl = document.getElementById('tpl-dashboard');
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));

  document.getElementById('user-display').textContent = `👤 ${currentUser.username}`;

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await API.post('/api/auth/logout');
    currentUser = null;
    renderLogin();
  });

  // Navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const page = item.dataset.page;
      navigate(page);
    });
  });

  // Initial page load
  navigate('dashboard');
}

async function navigate(page) {
  const content = document.getElementById('page-content');
  const title = document.getElementById('page-title');

  switch (page) {
    case 'dashboard': renderDashboardPage(content, title); break;
    case 'products': renderProductsPage(content, title); break;
    case 'representatives': renderRepresentativesPage(content, title); break;
    case 'settings': renderSettingsPage(content, title); break;
    case 'music': renderMusicPage(content, title); break;
    case 'beforeafter': renderBeforeAfterPage(content, title); break;
    case 'journal': renderJournalPage(content, title); break;
  }
}

// ============ DASHBOARD ============

async function renderDashboardPage(content, title) {
  title.textContent = 'Dashboard';

  try {
    const products = await API.get('/api/products');
    const reps = await API.get('/api/representatives');
    const settings = await API.get('/api/settings');
    const journalPosts = await API.get('/api/journal/admin/all');

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${products.length}</div>
          <div class="stat-label">Products</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reps.length}</div>
          <div class="stat-label">Representatives</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${journalPosts.length}</div>
          <div class="stat-label">Journal Posts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${settings.site_name || 'HÜFEL'}</div>
          <div class="stat-label">Languages</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="table-container">
          <div class="table-header">
            <h3>Recent Products</h3>
            <button class="btn btn-sm btn-primary" onclick="navigate('products')">Manage</button>
          </div>
          <table>
            <thead><tr><th>Title</th><th>Category</th></tr></thead>
            <tbody>
              ${products.slice(0, 5).map(p => `
                <tr><td>${p.title_en || p.title_fa || 'Untitled'}</td><td>${p.category || '—'}</td></tr>
              `).join('')}
              ${products.length === 0 ? '<tr><td colspan="2" style="text-align:center;color:var(--muted2);padding:24px;">No products yet</td></tr>' : ''}
            </tbody>
          </table>
        </div>

        <div class="table-container">
          <div class="table-header">
            <h3>Representatives</h3>
            <button class="btn btn-sm btn-primary" onclick="navigate('representatives')">Manage</button>
          </div>
          <table>
            <thead><tr><th>Name</th><th>City</th><th>Country</th></tr></thead>
            <tbody>
              ${reps.slice(0, 5).map(r => `
                <tr><td>${r.name}</td><td>${r.city_en || '—'}</td><td>${r.country || '—'}</td></tr>
              `).join('')}
              ${reps.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:var(--muted2);padding:24px;">No representatives yet</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-top: 20px; padding: 16px 20px; background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius-lg);">
        <h3 style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">📋 Quick Actions</h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="navigate('products')">+ Add Product</button>
          <button class="btn btn-sm btn-secondary" onclick="navigate('representatives')">+ Add Representative</button>
          <button class="btn btn-sm btn-secondary" onclick="navigate('settings')">⚙️ Edit Settings</button>
          <button class="btn btn-sm btn-secondary" onclick="navigate('music')">🎵 Manage Music</button>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error loading dashboard: ${err.message}</p></div>`;
  }
}

// ============ PRODUCTS ============

async function renderProductsPage(content, title) {
  title.textContent = 'Products';
  content.innerHTML = loading();

  try {
    const products = await API.get('/api/products');
    const langLabels = ['EN', 'FA', 'AR', 'ZH'];
    const langFields = ['_en', '_fa', '_ar', '_zh'];

    content.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h3>All Products (${products.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="showProductModal()">+ Add Product</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>English</th>
              <th>فارسی</th>
              <th>العربية</th>
              <th>中文</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><span class="badge badge-info">${p.code || '—'}</span></td>
                <td>${p.title_en || '—'}</td>
                <td dir="rtl">${p.title_fa || '—'}</td>
                <td dir="rtl">${p.title_ar || '—'}</td>
                <td>${p.title_zh || '—'}</td>
                <td>${p.category || '—'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="showProductModal(${p.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${products.length === 0 ? empty('No products yet. Click "+ Add Product" to create one.') : ''}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

async function showProductModal(id = null) {
  let product = { title_en: '', title_fa: '', title_ar: '', title_zh: '',
    description_en: '', description_fa: '', description_ar: '', description_zh: '',
    code: '', category: '', finish: '', collection: '', image_url: '',
    is_featured: 0, is_new: 0, is_best_seller: 0, sort_order: 0 };

  if (id) {
    product = await API.get(`/api/products/${id}`);
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-lg">
      <h2>${id ? 'Edit Product' : 'Add Product'}</h2>
      <div class="tabs" id="product-tabs">
        <button class="tab active" data-tab="main">General</button>
        <button class="tab" data-tab="en">EN</button>
        <button class="tab" data-tab="fa">FA</button>
        <button class="tab" data-tab="ar">AR</button>
        <button class="tab" data-tab="zh">ZH</button>
      </div>

      <div id="product-tab-main">
        <div class="form-row">
          <div class="form-group">
            <label>Code</label>
            <input class="form-input" id="p-code" value="${product.code || ''}" placeholder="e.g. HF-100">
          </div>
          <div class="form-group">
            <label>Category</label>
            <input class="form-input" id="p-category" value="${product.category || ''}" placeholder="e.g. Handles">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Finish</label>
            <input class="form-input" id="p-finish" value="${product.finish || ''}" placeholder="e.g. Matte Black">
          </div>
          <div class="form-group">
            <label>Collection</label>
            <input class="form-input" id="p-collection" value="${product.collection || ''}" placeholder="e.g. Natural Grain">
          </div>
        </div>
        <div class="form-group">
          <label>Product Image</label>
          <div id="p-image-uploader"></div>
        </div>
        <div class="form-group">
          <label>3D Model (GLB/GLTF/OBJ)</label>
          <div id="p-model-uploader"></div>
        </div>
        <div class="form-row-3">
          <label class="form-group" style="display:flex;align-items:center;gap:8px;margin-bottom:0;">
            <input type="checkbox" id="p-featured" ${product.is_featured ? 'checked' : ''}>
            <span style="font-size:13px;">Featured</span>
          </label>
          <label class="form-group" style="display:flex;align-items:center;gap:8px;margin-bottom:0;">
            <input type="checkbox" id="p-new" ${product.is_new ? 'checked' : ''}>
            <span style="font-size:13px;">New</span>
          </label>
          <label class="form-group" style="display:flex;align-items:center;gap:8px;margin-bottom:0;">
            <input type="checkbox" id="p-best" ${product.is_best_seller ? 'checked' : ''}>
            <span style="font-size:13px;">Best Seller</span>
          </label>
        </div>
        <div class="form-group">
          <label>Sort Order</label>
          <input class="form-input" id="p-sort" type="number" value="${product.sort_order || 0}">
        </div>
      </div>

      <div id="product-tab-en" style="display:none;">
        <div class="form-group"><label>Title (English)</label><input class="form-input" id="p-title_en" value="${product.title_en || ''}"></div>
        <div class="form-group"><label>Description (English)</label><textarea class="form-input" id="p-desc_en">${product.description_en || ''}</textarea></div>
      </div>
      <div id="product-tab-fa" style="display:none;" dir="rtl">
        <div class="form-group"><label>عنوان (فارسی)</label><input class="form-input" id="p-title_fa" value="${product.title_fa || ''}"></div>
        <div class="form-group"><label>توضیحات (فارسی)</label><textarea class="form-input" id="p-desc_fa">${product.description_fa || ''}</textarea></div>
      </div>
      <div id="product-tab-ar" style="display:none;" dir="rtl">
        <div class="form-group"><label>العنوان (العربية)</label><input class="form-input" id="p-title_ar" value="${product.title_ar || ''}"></div>
        <div class="form-group"><label>الوصف (العربية)</label><textarea class="form-input" id="p-desc_ar">${product.description_ar || ''}</textarea></div>
      </div>
      <div id="product-tab-zh" style="display:none;">
        <div class="form-group"><label>标题 (中文)</label><input class="form-input" id="p-title_zh" value="${product.title_zh || ''}"></div>
        <div class="form-group"><label>描述 (中文)</label><textarea class="form-input" id="p-desc_zh">${product.description_zh || ''}</textarea></div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveProduct(${id || ''})">💾 Save</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Init file uploaders
  createFileUploader('p-image-uploader', product.image_url);
  createFileUploader('p-model-uploader', product.model_3d_url);

  // Tab switching
  modal.querySelectorAll('#product-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('#product-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      modal.querySelectorAll('[id^="product-tab-"]').forEach(el => el.style.display = 'none');
      const target = document.getElementById(`product-tab-${tab.dataset.tab}`);
      if (target) target.style.display = 'block';
    });
  });
}

async function saveProduct(id = null) {
  const data = {
    code: document.getElementById('p-code').value,
    title_en: document.getElementById('p-title_en').value,
    title_fa: document.getElementById('p-title_fa').value,
    title_ar: document.getElementById('p-title_ar').value,
    title_zh: document.getElementById('p-title_zh').value,
    category: document.getElementById('p-category').value,
    finish: document.getElementById('p-finish').value,
    collection: document.getElementById('p-collection').value,      image_url: (document.getElementById('p-image-uploader-hidden') || {value: ''}).value || '',
    model_3d_url: (document.getElementById('p-model-uploader-hidden') || {value: ''}).value || '',
    description_en: document.getElementById('p-desc_en').value,
    description_fa: document.getElementById('p-desc_fa').value,
    description_ar: document.getElementById('p-desc_ar').value,
    description_zh: document.getElementById('p-desc_zh').value,
    is_featured: document.getElementById('p-featured').checked ? 1 : 0,
    is_new: document.getElementById('p-new').checked ? 1 : 0,
    is_best_seller: document.getElementById('p-best').checked ? 1 : 0,
    sort_order: parseInt(document.getElementById('p-sort').value) || 0
  };

  try {
    if (id) {
      await API.put(`/api/products/${id}`, data);
      toast('Product updated!');
    } else {
      await API.post('/api/products', data);
      toast('Product created!');
    }
    document.querySelector('.modal-overlay').remove();
    navigate('products');
  } catch (err) {
    toast('Error saving product', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await API.del(`/api/products/${id}`);
  toast('Product deleted');
  navigate('products');
}

// ============ REPRESENTATIVES ============

async function renderRepresentativesPage(content, title) {
  title.textContent = 'Representatives';
  content.innerHTML = loading();

  try {
    const reps = await API.get('/api/representatives');

    content.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h3>All Representatives (${reps.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="showRepModal()">+ Add Representative</button>
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Company</th><th>City</th><th>Country</th><th>Phone</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${reps.map(r => `
              <tr>
                <td>${r.name}</td>
                <td>${r.company || '—'}</td>
                <td>${r.city_en || r.city_fa || '—'}</td>
                <td>${r.country || '—'}</td>
                <td>${r.phone || '—'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="showRepModal(${r.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteRep(${r.id})">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${reps.length === 0 ? empty('No representatives yet.') : ''}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

async function showRepModal(id = null) {
  let rep = { name: '', company: '', city_en: '', city_fa: '', city_ar: '', city_zh: '',
    country: '', phone: '', email: '', address: '', lat: 0, lng: 0, is_active: 1, sort_order: 0 };

  if (id) {
    const all = await API.get('/api/representatives/all');
    rep = all.find(r => r.id === id) || rep;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>${id ? 'Edit Representative' : 'Add Representative'}</h2>
      <div class="form-row">
        <div class="form-group"><label>Name *</label><input class="form-input" id="r-name" value="${rep.name}"></div>
        <div class="form-group"><label>Company</label><input class="form-input" id="r-company" value="${rep.company}"></div>
      </div>
      <div class="form-group"><label>City (English)</label><input class="form-input" id="r-city_en" value="${rep.city_en}"></div>
      <div class="form-group"><label>City (فارسی)</label><input class="form-input" id="r-city_fa" value="${rep.city_fa}"></div>
      <div class="form-group"><label>City (العربية)</label><input class="form-input" id="r-city_ar" value="${rep.city_ar}"></div>
      <div class="form-group"><label>City (中文)</label><input class="form-input" id="r-city_zh" value="${rep.city_zh}"></div>
      <div class="form-row">
        <div class="form-group"><label>Country</label><input class="form-input" id="r-country" value="${rep.country}"></div>
        <div class="form-group"><label>Phone</label><input class="form-input" id="r-phone" value="${rep.phone}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input class="form-input" id="r-email" value="${rep.email}"></div>
        <div class="form-group"><label>Sort Order</label><input class="form-input" id="r-sort" type="number" value="${rep.sort_order || 0}"></div>
      </div>
      <div class="form-group"><label>Address</label><textarea class="form-input" id="r-address">${rep.address || ''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Latitude</label><input class="form-input" id="r-lat" type="number" step="any" value="${rep.lat || 0}"></div>
        <div class="form-group"><label>Longitude</label><input class="form-input" id="r-lng" type="number" step="any" value="${rep.lng || 0}"></div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="r-active" ${rep.is_active ? 'checked' : ''}>
        <span style="font-size:13px;">Active</span>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveRep(${id || ''})">💾 Save</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveRep(id = null) {
  const data = {
    name: document.getElementById('r-name').value,
    company: document.getElementById('r-company').value,
    city_en: document.getElementById('r-city_en').value,
    city_fa: document.getElementById('r-city_fa').value,
    city_ar: document.getElementById('r-city_ar').value,
    city_zh: document.getElementById('r-city_zh').value,
    country: document.getElementById('r-country').value,
    phone: document.getElementById('r-phone').value,
    email: document.getElementById('r-email').value,
    address: document.getElementById('r-address').value,
    lat: parseFloat(document.getElementById('r-lat').value) || 0,
    lng: parseFloat(document.getElementById('r-lng').value) || 0,
    sort_order: parseInt(document.getElementById('r-sort').value) || 0,
    is_active: document.getElementById('r-active').checked ? 1 : 0
  };

  try {
    if (id) {
      await API.put(`/api/representatives/${id}`, data);
      toast('Representative updated!');
    } else {
      await API.post('/api/representatives', data);
      toast('Representative created!');
    }
    document.querySelector('.modal-overlay').remove();
    navigate('representatives');
  } catch (err) {
    toast('Error saving', 'error');
  }
}

async function deleteRep(id) {
  if (!confirm('Delete this representative?')) return;
  await API.del(`/api/representatives/${id}`);
  toast('Deleted');
  navigate('representatives');
}

// ============ SETTINGS ============

async function renderSettingsPage(content, title) {
  title.textContent = 'Settings';
  content.innerHTML = loading();

  try {
    const settings = await API.get('/api/settings');

    content.innerHTML = `
      <div class="settings-section">
        <h3>🏢 Site Identity</h3>
        <div class="form-row">
          <div class="form-group"><label>Site Name</label><input class="form-input" id="s-site_name" value="${settings.site_name || ''}"></div>
          <div class="form-group"><label>Logo URL</label><input class="form-input" id="s-logo_url" value="${settings.logo_url || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Tagline (English)</label><input class="form-input" id="s-site_tagline_en" value="${settings.site_tagline_en || ''}"></div>
          <div class="form-group"><label>Tagline (فارسی)</label><input class="form-input" id="s-site_tagline_fa" value="${settings.site_tagline_fa || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Tagline (العربية)</label><input class="form-input" id="s-site_tagline_ar" value="${settings.site_tagline_ar || ''}"></div>
          <div class="form-group"><label>Tagline (中文)</label><input class="form-input" id="s-site_tagline_zh" value="${settings.site_tagline_zh || ''}"></div>
        </div>
      </div>

      <div class="settings-section">
        <h3>🎨 Theme Colors</h3>
        <div class="form-row-3">
          <div class="form-group">
            <label>Accent Color</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="s-theme_accent" value="${settings.theme_accent || '#c8a45c'}" class="color-swatch">
              <input class="form-input" id="s-theme_accent_text" value="${settings.theme_accent || '#c8a45c'}">
            </div>
          </div>
          <div class="form-group">
            <label>Background</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="s-theme_bg" value="${settings.theme_bg || '#0b0a09'}" class="color-swatch">
              <input class="form-input" id="s-theme_bg_text" value="${settings.theme_bg || '#0b0a09'}">
            </div>
          </div>
          <div class="form-group">
            <label>Accent Soft</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="s-theme_accent_soft" value="${settings.theme_accent_soft || '#d4b373'}" class="color-swatch">
              <input class="form-input" id="s-theme_accent_soft_text" value="${settings.theme_accent_soft || '#d4b373'}">
            </div>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Text Color</label><input class="form-input" id="s-theme_fg" value="${settings.theme_fg || '#f5f3ef'}"></div>
          <div class="form-group"><label>Muted Color</label><input class="form-input" id="s-theme_muted" value="${settings.theme_muted || '#8a8783'}"></div>
          <div class="form-group"><label>Line Color</label><input class="form-input" id="s-theme_line" value="${settings.theme_line || '#1f1d1b'}"></div>
        </div>
      </div>

      <div class="settings-section">
        <h3>🔤 Fonts</h3>
        <div class="form-row-3">
          <div class="form-group"><label>Primary Font (English)</label>
            <select class="form-input" id="s-font_primary">
              <option value="Inter" ${(settings.font_primary||'Inter') === 'Inter' ? 'selected' : ''}>Inter</option>
              <option value="Open Sans" ${settings.font_primary === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
              <option value="Roboto" ${settings.font_primary === 'Roboto' ? 'selected' : ''}>Roboto</option>
              <option value="Poppins" ${settings.font_primary === 'Poppins' ? 'selected' : ''}>Poppins</option>
            </select>
          </div>
          <div class="form-group"><label>Display Font (Headings)</label>
            <select class="form-input" id="s-font_display">
              <option value="Cormorant Garamond" ${(settings.font_display||'Cormorant Garamond') === 'Cormorant Garamond' ? 'selected' : ''}>Cormorant Garamond</option>
              <option value="Playfair Display" ${settings.font_display === 'Playfair Display' ? 'selected' : ''}>Playfair Display</option>
              <option value="Cinzel" ${settings.font_display === 'Cinzel' ? 'selected' : ''}>Cinzel</option>
            </select>
          </div>
          <div class="form-group"><label>Logo Font</label>
            <select class="form-input" id="s-font_antrian">
              <option value="Antrian" ${(settings.font_antrian||'Antrian') === 'Antrian' ? 'selected' : ''}>Antrian</option>
              <option value="Playfair Display" ${settings.font_antrian === 'Playfair Display' ? 'selected' : ''}>Playfair Display</option>
              <option value="Cinzel" ${settings.font_antrian === 'Cinzel' ? 'selected' : ''}>Cinzel</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>📞 Contact Info</h3>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input class="form-input" id="s-contact_phone" value="${settings.contact_phone || ''}"></div>
          <div class="form-group"><label>Email</label><input class="form-input" id="s-contact_email" value="${settings.contact_email || ''}"></div>
        </div>
        <div class="form-group"><label>Cities (display)</label><input class="form-input" id="s-contact_cities" value="${settings.contact_cities || ''}"></div>
      </div>

      <div class="settings-section">
        <h3>🎬 Hero Section</h3>
        <div class="form-group"><label>Background Video URL</label><input class="form-input" id="s-hero_video" value="${settings.hero_video || ''}"></div>
        <div class="form-row">
          <div class="form-group"><label>Kicker (English)</label><input class="form-input" id="s-hero_kicker_en" value="${settings.hero_kicker_en || ''}"></div>
          <div class="form-group"><label>Kicker (فارسی)</label><input class="form-input" id="s-hero_kicker_fa" value="${settings.hero_kicker_fa || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Kicker (العربية)</label><input class="form-input" id="s-hero_kicker_ar" value="${settings.hero_kicker_ar || ''}"></div>
          <div class="form-group"><label>Kicker (中文)</label><input class="form-input" id="s-hero_kicker_zh" value="${settings.hero_kicker_zh || ''}"></div>
        </div>
      </div>

      <div style="display:flex;gap:12px;">
        <button class="btn btn-primary" onclick="saveSettings()">💾 Save All Settings</button>
      </div>
    `;

    // Sync color inputs with text inputs
    ['theme_accent', 'theme_bg', 'theme_accent_soft'].forEach(key => {
      const colorInput = document.getElementById(`s-${key}`);
      const textInput = document.getElementById(`s-${key}_text`);
      if (colorInput && textInput) {
        colorInput.addEventListener('input', () => textInput.value = colorInput.value);
        textInput.addEventListener('input', () => colorInput.value = textInput.value);
      }
    });

  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

async function saveSettings() {
  const fields = [
    'site_name', 'site_tagline_en', 'site_tagline_fa', 'site_tagline_ar', 'site_tagline_zh',
    'logo_url', 'theme_accent', 'theme_bg', 'theme_accent_soft', 'theme_fg', 'theme_muted', 'theme_line',
    'font_primary', 'font_display', 'font_antrian',
    'contact_phone', 'contact_email', 'contact_cities',
    'hero_video', 'hero_kicker_en', 'hero_kicker_fa', 'hero_kicker_ar', 'hero_kicker_zh'
  ];

  const data = {};
  for (const field of fields) {
    const el = document.getElementById(`s-${field}`);
    if (el) data[field] = el.value;
  }

  try {
    await API.put('/api/settings', data);
    toast('Settings saved!');
  } catch (err) {
    toast('Error saving settings', 'error');
  }
}

// ============ MUSIC PLAYER ============

async function renderMusicPage(content, title) {
  title.textContent = 'Music Player';
  content.innerHTML = loading();

  try {
    const songs = await API.get('/api/settings/songs');

    content.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h3>Songs / Playlist (${songs.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="showSongModal()">+ Add Song</button>
        </div>
        <table>
          <thead><tr><th>#</th><th>Title (EN)</th><th>File URL</th><th>Actions</th></tr></thead>
          <tbody>
            ${songs.map((s, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${s.title_en || 'Theme Song'}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;">${s.file_url}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="showSongModal(${s.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteSong(${s.id})">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${songs.length === 0 ? empty('No songs added yet. Add your Hüfel theme song!') : ''}
      </div>
      <div style="margin-top:16px;padding:16px 20px;background:var(--bg-card);border:1px solid var(--line);border-radius:var(--radius-lg);">
        <p style="font-size:13px;color:var(--muted);">
          💡 <strong>Tip:</strong> The theme song is served from <code>/music/Hufel.mp3</code>. 
          Add it to the playlist above with file URL: <code>/music/Hufel.mp3</code>
        </p>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

async function showSongModal(id = null) {
  let song = { title_en: '', title_fa: '', title_ar: '', title_zh: '', file_url: '', is_active: 1, sort_order: 0 };

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>${id ? 'Edit Song' : 'Add Song'}</h2>
      <div class="form-group"><label>Title (English)</label><input class="form-input" id="s-title_en" value="${song.title_en}"></div>
      <div class="form-group"><label>Title (فارسی)</label><input class="form-input" id="s-title_fa" value="${song.title_fa}"></div>
      <div class="form-group"><label>Title (العربية)</label><input class="form-input" id="s-title_ar" value="${song.title_ar}"></div>
      <div class="form-group"><label>Title (中文)</label><input class="form-input" id="s-title_zh" value="${song.title_zh}"></div>
      <div class="form-group"><label>File URL (e.g. /music/Hufel.mp3)</label><input class="form-input" id="s-file_url" value="${song.file_url || '/music/Hufel.mp3'}" placeholder="/music/Hufel.mp3"></div>
      <div class="form-row">
        <div class="form-group"><label>Sort Order</label><input class="form-input" id="s-sort" type="number" value="${song.sort_order || 0}"></div>
        <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:24px;">
          <input type="checkbox" id="s-active" ${song.is_active ? 'checked' : ''}>
          <span style="font-size:13px;">Active</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveSong(${id || ''})">💾 Save</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveSong(id = null) {
  const data = {
    title_en: document.getElementById('s-title_en').value,
    title_fa: document.getElementById('s-title_fa').value,
    title_ar: document.getElementById('s-title_ar').value,
    title_zh: document.getElementById('s-title_zh').value,
    file_url: document.getElementById('s-file_url').value,
    sort_order: parseInt(document.getElementById('s-sort').value) || 0,
    is_active: document.getElementById('s-active').checked ? 1 : 0
  };

  try {
    if (id) {
      await API.put('/api/settings/songs/' + id, data);
      toast('Song updated!');
    } else {
      await API.post('/api/settings/songs', data);
      toast('Song added!');
    }
    document.querySelector('.modal-overlay').remove();
    navigate('music');
  } catch (err) {
    toast('Error saving', 'error');
  }
}

async function deleteSong(id) {
  if (!confirm('Delete this song?')) return;
  await API.del(`/api/settings/songs/${id}`);
  toast('Deleted');
  navigate('music');
}

// ============ BEFORE & AFTER ============

async function renderBeforeAfterPage(content, title) {
  title.textContent = 'Before & After';
  content.innerHTML = loading();

  try {
    const items = await API.get('/api/beforeafter/all');

    content.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h3>All Before/After Images (${items.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="showBeforeAfterModal()">+ Add Set</button>
        </div>
        <table>
          <thead>
            <tr><th>Preview</th><th>Title (EN)</th><th>Before</th><th>After</th><th>Active</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>
                  <div style="display:flex;gap:4px;">
                    ${item.before_image ? `<img src="${item.before_image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--line);">` : '<div style="width:40px;height:40px;border-radius:4px;background:var(--bg-card2);border:1px solid var(--line);"></div>'}
                    ${item.after_image ? `<img src="${item.after_image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--line);">` : '<div style="width:40px;height:40px;border-radius:4px;background:var(--bg-card2);border:1px solid var(--line);"></div>'}
                  </div>
                </td>
                <td>${item.title_en || '—'}</td>
                <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;font-size:11px;">${item.before_image ? item.before_image.substring(0, 30) + '...' : '—'}</td>
                <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;font-size:11px;">${item.after_image ? item.after_image.substring(0, 30) + '...' : '—'}</td>
                <td>${item.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="showBeforeAfterModal(${item.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteBeforeAfter(${item.id})">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${items.length === 0 ? empty('No before/after images yet.') : ''}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

async function showBeforeAfterModal(id = null) {
  let item = { title_en: '', title_fa: '', title_ar: '', title_zh: '', before_image: '', after_image: '', sort_order: 0, is_active: 1 };

  if (id) {
    const res = await fetch('/api/beforeafter/' + id);
    item = await res.json();
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-lg">
      <h2>${id ? 'Edit Before/After' : 'Add Before/After'}</h2>
      <div class="form-group"><label>Title (English)</label><input class="form-input" id="ba-title_en" value="${item.title_en}"></div>
      <div class="form-group"><label>Title (فارسی)</label><input class="form-input" id="ba-title_fa" value="${item.title_fa}"></div>
      <div class="form-group"><label>Title (العربية)</label><input class="form-input" id="ba-title_ar" value="${item.title_ar}"></div>
      <div class="form-group"><label>Title (中文)</label><input class="form-input" id="ba-title_zh" value="${item.title_zh}"></div>
      <div class="form-row">
        <div class="form-group"><label>Before Image</label><div id="ba-before-uploader"></div></div>
        <div class="form-group"><label>After Image</label><div id="ba-after-uploader"></div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Sort Order</label><input class="form-input" id="ba-sort" type="number" value="${item.sort_order || 0}"></div>
        <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:24px;">
          <input type="checkbox" id="ba-active" ${item.is_active ? 'checked' : ''}>
          <span style="font-size:13px;">Active</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveBeforeAfter(${id || ''})">💾 Save</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Init file uploaders
  setTimeout(() => {
    createFileUploader('ba-before-uploader', item.before_image);
    createFileUploader('ba-after-uploader', item.after_image);
  }, 50);
}

async function saveBeforeAfter(id = null) {
  const data = {
    title_en: document.getElementById('ba-title_en').value,
    title_fa: document.getElementById('ba-title_fa').value,
    title_ar: document.getElementById('ba-title_ar').value,
    title_zh: document.getElementById('ba-title_zh').value,
    before_image: (document.getElementById('ba-before-uploader-hidden') || {value: ''}).value,
    after_image: (document.getElementById('ba-after-uploader-hidden') || {value: ''}).value,
    sort_order: parseInt(document.getElementById('ba-sort').value) || 0,
    is_active: document.getElementById('ba-active').checked ? 1 : 0
  };

  try {
    if (id) {
      await API.put('/api/beforeafter/' + id, data);
      toast('Before/After updated!');
    } else {
      await API.post('/api/beforeafter', data);
      toast('Before/After created!');
    }
    document.querySelector('.modal-overlay').remove();
    navigate('beforeafter');
  } catch (err) {
    toast('Error saving', 'error');
  }
}

async function deleteBeforeAfter(id) {
  if (!confirm('Delete this before/after set?')) return;
  await API.del('/api/beforeafter/' + id);
  toast('Deleted');
  navigate('beforeafter');
}

// ============ JOURNAL POSTS ============

async function renderJournalPage(content, title) {
  title.textContent = 'Journal';
  content.innerHTML = loading();

  try {
    const posts = await API.get('/api/journal/admin/all');

    content.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h3>All Journal Posts (${posts.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="showJournalModal()">+ Add Post</button>
        </div>
        <table>
          <thead>
            <tr><th>Title (EN)</th><th>Slug</th><th>Image</th><th>Author</th><th>Published</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${posts.map(p => `
              <tr>
                <td>${p.title_en || '—'}</td>
                <td style="font-size:11px;color:var(--muted);">${p.slug || '—'}</td>
                <td>${p.image_url ? '<span style="color:var(--success);">✓</span>' : '—'}</td>
                <td>${p.author || '—'}</td>
                <td>${p.published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-warning">Draft</span>'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="showJournalModal(${p.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteJournal(${p.id})">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${posts.length === 0 ? empty('No journal posts yet. Click "+ Add Post" to create one.') : ''}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

async function showJournalModal(id = null) {
  let post = { title_en: '', title_fa: '', title_ar: '', title_zh: '',
    excerpt_en: '', excerpt_fa: '', excerpt_ar: '', excerpt_zh: '',
    content_en: '', content_fa: '', content_ar: '', content_zh: '',
    image_url: '', author: '', published: 1, sort_order: 0, slug: '' };

  if (id) {
    post = await API.get(`/api/journal/admin/${id}`);
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-lg">
      <h2>${id ? 'Edit Journal Post' : 'Add Journal Post'}</h2>
      <div class="tabs" id="journal-tabs">
        <button class="tab active" data-tab="main">Main</button>
        <button class="tab" data-tab="en">EN</button>
        <button class="tab" data-tab="fa">FA</button>
        <button class="tab" data-tab="ar">AR</button>
        <button class="tab" data-tab="zh">ZH</button>
      </div>

      <div id="journal-tab-main">
        <div class="form-row">
          <div class="form-group"><label>Slug (URL)</label><input class="form-input" id="j-slug" value="${post.slug || ''}" placeholder="Auto-generated if empty"></div>
          <div class="form-group"><label>Author</label><input class="form-input" id="j-author" value="${post.author || ''}" placeholder="e.g. Hüfel Team"></div>
        </div>
        <div class="form-group">
          <label>Featured Image</label>
          <div id="j-image-uploader"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Sort Order</label><input class="form-input" id="j-sort" type="number" value="${post.sort_order || 0}"></div>
          <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:24px;">
            <input type="checkbox" id="j-published" ${post.published ? 'checked' : ''}>
            <span style="font-size:13px;">Published</span>
          </div>
        </div>
      </div>

      <div id="journal-tab-en" style="display:none;">
        <div class="form-group"><label>Title (English)</label><input class="form-input" id="j-title_en" value="${post.title_en || ''}"></div>
        <div class="form-group"><label>Excerpt (English)</label><textarea class="form-input" id="j-excerpt_en">${post.excerpt_en || ''}</textarea></div>
        <div class="form-group"><label>Content (English)</label><textarea class="form-input" id="j-content_en" style="min-height:150px;">${post.content_en || ''}</textarea></div>
      </div>
      <div id="journal-tab-fa" style="display:none;" dir="rtl">
        <div class="form-group"><label>عنوان (فارسی)</label><input class="form-input" id="j-title_fa" value="${post.title_fa || ''}"></div>
        <div class="form-group"><label>خلاصه (فارسی)</label><textarea class="form-input" id="j-excerpt_fa">${post.excerpt_fa || ''}</textarea></div>
        <div class="form-group"><label>محتوا (فارسی)</label><textarea class="form-input" id="j-content_fa" style="min-height:150px;">${post.content_fa || ''}</textarea></div>
      </div>
      <div id="journal-tab-ar" style="display:none;" dir="rtl">
        <div class="form-group"><label>العنوان (العربية)</label><input class="form-input" id="j-title_ar" value="${post.title_ar || ''}"></div>
        <div class="form-group"><label>الملخص (العربية)</label><textarea class="form-input" id="j-excerpt_ar">${post.excerpt_ar || ''}</textarea></div>
        <div class="form-group"><label>المحتوى (العربية)</label><textarea class="form-input" id="j-content_ar" style="min-height:150px;">${post.content_ar || ''}</textarea></div>
      </div>
      <div id="journal-tab-zh" style="display:none;">
        <div class="form-group"><label>标题 (中文)</label><input class="form-input" id="j-title_zh" value="${post.title_zh || ''}"></div>
        <div class="form-group"><label>摘要 (中文)</label><textarea class="form-input" id="j-excerpt_zh">${post.excerpt_zh || ''}</textarea></div>
        <div class="form-group"><label>内容 (中文)</label><textarea class="form-input" id="j-content_zh" style="min-height:150px;">${post.content_zh || ''}</textarea></div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveJournal(${id || ''})">💾 Save</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Init file uploader
  createFileUploader('j-image-uploader', post.image_url);

  // Tab switching
  modal.querySelectorAll('#journal-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('#journal-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      modal.querySelectorAll('[id^="journal-tab-"]').forEach(el => el.style.display = 'none');
      const target = document.getElementById(`journal-tab-${tab.dataset.tab}`);
      if (target) target.style.display = 'block';
    });
  });
}

async function saveJournal(id = null) {
  const data = {
    title_en: document.getElementById('j-title_en').value,
    title_fa: document.getElementById('j-title_fa').value,
    title_ar: document.getElementById('j-title_ar').value,
    title_zh: document.getElementById('j-title_zh').value,
    slug: document.getElementById('j-slug').value,
    excerpt_en: document.getElementById('j-excerpt_en').value,
    excerpt_fa: document.getElementById('j-excerpt_fa').value,
    excerpt_ar: document.getElementById('j-excerpt_ar').value,
    excerpt_zh: document.getElementById('j-excerpt_zh').value,
    content_en: document.getElementById('j-content_en').value,
    content_fa: document.getElementById('j-content_fa').value,
    content_ar: document.getElementById('j-content_ar').value,
    content_zh: document.getElementById('j-content_zh').value,
    image_url: (document.getElementById('j-image-uploader-hidden') || {value: ''}).value || '',
    author: document.getElementById('j-author').value,
    sort_order: parseInt(document.getElementById('j-sort').value) || 0,
    published: document.getElementById('j-published').checked ? 1 : 0
  };

  try {
    if (id) {
      await API.put(`/api/journal/${id}`, data);
      toast('Journal post updated!');
    } else {
      await API.post('/api/journal', data);
      toast('Journal post created!');
    }
    document.querySelector('.modal-overlay').remove();
    navigate('journal');
  } catch (err) {
    toast('Error saving journal post', 'error');
  }
}

async function deleteJournal(id) {
  if (!confirm('Delete this journal post?')) return;
  await API.del(`/api/journal/${id}`);
  toast('Journal post deleted');
  navigate('journal');
}

// ============ INIT ============

checkAuth();

(function () {
  const loginForm = document.getElementById('loginForm');
  const tokenInput = document.getElementById('adminToken');
  const panel = document.getElementById('crmPanel');
  const feedback = document.getElementById('crmFeedback');
  const statsEl = document.getElementById('crmStats');
  const tableEl = document.getElementById('leadsTable');
  const statusFilter = document.getElementById('statusFilter');
  const refreshBtn = document.getElementById('refreshLeads');

  const STORAGE_KEY = 'gj_admin_token';

  function getToken() {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  }

  function setToken(token) {
    sessionStorage.setItem(STORAGE_KEY, token);
  }

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback show ' + (type || '');
  }

  async function api(path, options = {}) {
    const res = await apiFetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function loadStats() {
    const { res, data } = await api('/api/admin/stats');
    if (!res.ok) throw new Error(data.message || 'Failed to load stats');
    const by = data.data.byStatus || {};
    statsEl.innerHTML = `
      <div class="crm-stat"><strong>${data.data.total}</strong>Total leads</div>
      <div class="crm-stat"><strong>${by.new || 0}</strong>New</div>
      <div class="crm-stat"><strong>${by.contacted || 0}</strong>Contacted</div>
      <div class="crm-stat"><strong>${by.quoted || 0}</strong>Quoted</div>
    `;
  }

  async function loadLeads() {
    const status = statusFilter.value;
    const qs = status ? '?status=' + encodeURIComponent(status) : '';
    const { res, data } = await api('/api/admin/leads' + qs);
    if (!res.ok) throw new Error(data.message || 'Failed to load leads');

    if (!data.data.length) {
      tableEl.innerHTML = '<p class="form-note">No leads yet. New contact-form submissions appear here.</p>';
      return;
    }

    const rows = data.data
      .map((l) => {
        const route = [l.origin, l.destination].filter(Boolean).join(' → ') || '—';
        return `<tr>
          <td><strong>${l.id}</strong><br/><span style="color:var(--mist);font-size:0.8rem">${new Date(l.createdAt).toLocaleString()}</span></td>
          <td>${l.firstName} ${l.lastName}<br/><a href="mailto:${l.email}" style="color:var(--gold)">${l.email}</a><br/>${l.phone || ''}</td>
          <td>${l.service || '—'}<br/>${route}<br/>${l.mode || ''} ${l.cargoType || ''}</td>
          <td style="max-width:220px">${(l.message || '').slice(0, 160)}</td>
          <td>
            <select data-lead-id="${l.id}" class="lead-status">
              ${['new', 'contacted', 'quoted', 'won', 'lost', 'archived']
                .map((s) => `<option value="${s}" ${s === l.status ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
          </td>
        </tr>`;
      })
      .join('');

    tableEl.innerHTML = `
      <table>
        <thead>
          <tr><th>ID</th><th>Contact</th><th>Quote</th><th>Message</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function refreshAll() {
    await loadStats();
    await loadLeads();
    showFeedback('Inbox updated.', 'success');
  }

  async function unlock() {
    panel.hidden = false;
    loginForm.hidden = true;
    await refreshAll();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setToken(tokenInput.value.trim());
    try {
      await unlock();
    } catch (err) {
      panel.hidden = true;
      loginForm.hidden = false;
      showFeedback(err.message || 'Unauthorized.', 'error');
    }
  });

  refreshBtn.addEventListener('click', () => {
    refreshAll().catch((err) => showFeedback(err.message, 'error'));
  });

  statusFilter.addEventListener('change', () => {
    loadLeads().catch((err) => showFeedback(err.message, 'error'));
  });

  tableEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.lead-status');
    if (!select) return;
    const id = select.getAttribute('data-lead-id');
    const { res, data } = await api('/api/admin/leads/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ status: select.value }),
    });
    if (!res.ok) {
      showFeedback(data.message || 'Update failed.', 'error');
      return;
    }
    showFeedback(id + ' → ' + select.value, 'success');
    loadStats().catch(() => {});
  });

  if (getToken()) {
    tokenInput.value = getToken();
    unlock().catch(() => {
      panel.hidden = true;
      loginForm.hidden = false;
    });
  }
})();

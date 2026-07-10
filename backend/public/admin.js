(function () {
  const loginForm = document.getElementById('loginForm');
  const tokenInput = document.getElementById('adminToken');
  const panel = document.getElementById('crmPanel');
  const feedback = document.getElementById('crmFeedback');
  const statsEl = document.getElementById('crmStats');
  const tableEl = document.getElementById('leadsTable');
  const statusFilter = document.getElementById('statusFilter');
  const refreshBtn = document.getElementById('refreshLeads');
  const alertCheckBtn = document.getElementById('runAlertCheck');
  const remindersPanel = document.getElementById('remindersPanel');
  const remindersList = document.getElementById('remindersList');

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

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
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

  function renderReminders(reminders) {
    if (!reminders || !reminders.length) {
      remindersPanel.hidden = true;
      remindersList.innerHTML = '';
      return;
    }
    remindersPanel.hidden = false;
    remindersList.innerHTML = reminders
      .map((r) => {
        const cls = r.overdue ? 'reminder-item reminder-item--overdue' : 'reminder-item';
        const owner = r.assignedTo ? ` · ${escapeHtml(r.assignedTo)}` : '';
        return `<li class="${cls}">
          <strong>${escapeHtml(r.id)}</strong>
          ${escapeHtml(r.name)} — ${escapeHtml(r.hint)}
          <span class="reminder-meta">${r.ageHours}h · ${escapeHtml(r.status)}${owner}</span>
        </li>`;
      })
      .join('');
  }

  async function loadStats() {
    const { res, data } = await api('/api/admin/stats');
    if (!res.ok) throw new Error(data.message || 'Failed to load stats');
    const by = data.data.byStatus || {};
    const overdueCount = (data.data.reminders || []).filter((r) => r.overdue).length;
    statsEl.innerHTML = `
      <div class="crm-stat"><strong>${data.data.total}</strong>Total leads</div>
      <div class="crm-stat"><strong>${by.new || 0}</strong>New</div>
      <div class="crm-stat"><strong>${by.contacted || 0}</strong>Contacted</div>
      <div class="crm-stat"><strong>${by.quoted || 0}</strong>Quoted</div>
      <div class="crm-stat"><strong>${overdueCount}</strong>Overdue</div>
    `;
    renderReminders(data.data.reminders);
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
        return `<tr data-lead-row="${escapeHtml(l.id)}">
          <td><strong>${escapeHtml(l.id)}</strong><br/><span class="lead-muted">${new Date(l.createdAt).toLocaleString()}</span></td>
          <td>${escapeHtml(l.firstName)} ${escapeHtml(l.lastName)}<br/><a href="mailto:${escapeHtml(l.email)}" style="color:var(--gold)">${escapeHtml(l.email)}</a><br/>${escapeHtml(l.phone || '')}</td>
          <td>${escapeHtml(l.service || '—')}<br/>${escapeHtml(route)}<br/>${escapeHtml(l.mode || '')} ${escapeHtml(l.cargoType || '')}</td>
          <td class="lead-message">${escapeHtml((l.message || '').slice(0, 160))}</td>
          <td>
            <select data-lead-id="${escapeHtml(l.id)}" data-field="status" class="lead-status">
              ${['new', 'contacted', 'quoted', 'won', 'lost', 'archived']
                .map((s) => `<option value="${s}" ${s === l.status ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
          </td>
          <td>
            <input
              type="text"
              class="lead-assign"
              data-lead-id="${escapeHtml(l.id)}"
              data-field="assignedTo"
              value="${escapeHtml(l.assignedTo || '')}"
              placeholder="Owner"
              maxlength="80"
            />
          </td>
          <td>
            <textarea
              class="lead-notes"
              data-lead-id="${escapeHtml(l.id)}"
              data-field="notes"
              rows="2"
              maxlength="2000"
              placeholder="Notes…"
            >${escapeHtml(l.notes || '')}</textarea>
          </td>
        </tr>`;
      })
      .join('');

    tableEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Contact</th>
            <th>Quote</th>
            <th>Message</th>
            <th>Status</th>
            <th>Assigned</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function patchLead(id, patch) {
    const { res, data } = await api('/api/admin/leads/' + id, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(data.message || 'Update failed.');
    return data.data;
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

  alertCheckBtn.addEventListener('click', async () => {
    showFeedback('Checking shipment alerts…', '');
    try {
      const { res, data } = await api('/api/alerts/check', { method: 'POST', body: '{}' });
      if (!res.ok) {
        showFeedback(data.message || 'Alert check failed.', 'error');
        return;
      }
      showFeedback(
        `Alert check: ${data.checked || 0} watched, ${data.sent || 0} emailed, ${data.unchanged || 0} unchanged.`,
        'success'
      );
    } catch (err) {
      showFeedback(err.message || 'Alert check failed.', 'error');
    }
  });

  statusFilter.addEventListener('change', () => {
    loadLeads().catch((err) => showFeedback(err.message, 'error'));
  });

  tableEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.lead-status');
    if (!select) return;
    const id = select.getAttribute('data-lead-id');
    try {
      await patchLead(id, { status: select.value });
      showFeedback(id + ' → ' + select.value, 'success');
      loadStats().catch(() => {});
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  });

  let notesTimer = null;
  tableEl.addEventListener('input', (e) => {
    const el = e.target.closest('.lead-assign, .lead-notes');
    if (!el) return;
    const id = el.getAttribute('data-lead-id');
    const field = el.getAttribute('data-field');
    clearTimeout(notesTimer);
    notesTimer = setTimeout(async () => {
      try {
        await patchLead(id, { [field]: el.value });
        showFeedback(id + ' saved.', 'success');
        if (field === 'assignedTo') loadStats().catch(() => {});
      } catch (err) {
        showFeedback(err.message, 'error');
      }
    }, 500);
  });

  if (getToken()) {
    tokenInput.value = getToken();
    unlock().catch(() => {
      panel.hidden = true;
      loginForm.hidden = false;
    });
  }
})();

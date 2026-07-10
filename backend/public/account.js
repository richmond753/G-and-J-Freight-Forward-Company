(function () {
  const STORAGE_KEY = 'gj_customer_token';
  const authPanel = document.getElementById('authPanel');
  const dashPanel = document.getElementById('dashPanel');
  const feedback = document.getElementById('accountFeedback');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const welcomeLine = document.getElementById('welcomeLine');
  const quotesList = document.getElementById('quotesList');
  const shipmentsList = document.getElementById('shipmentsList');

  function getToken() {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  }

  function setToken(token) {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
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
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  document.querySelectorAll('.account-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.account-tab').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      const tab = btn.getAttribute('data-tab');
      loginForm.hidden = tab !== 'login';
      registerForm.hidden = tab !== 'register';
    });
  });

  async function loadDashboard(customer) {
    authPanel.hidden = true;
    dashPanel.hidden = false;
    welcomeLine.textContent =
      'Signed in as ' + (customer.name || customer.email) +
      (customer.company ? ' · ' + customer.company : '');

    const [quotes, ships] = await Promise.all([
      api('/api/account/quotes'),
      api('/api/account/shipments'),
    ]);

    if (!quotes.res.ok) {
      quotesList.innerHTML = '<li class="form-note">Could not load quotes.</li>';
    } else if (!quotes.data.data.length) {
      quotesList.innerHTML =
        '<li class="form-note">No saved quotes yet. <a href="/#contact" style="color:var(--gold)">Request a quote</a>.</li>';
    } else {
      quotesList.innerHTML = quotes.data.data
        .map(
          (q) =>
            `<li><strong>${escapeHtml(q.id)}</strong> · ${escapeHtml(q.route)}
            <span class="status-pill">${escapeHtml(q.status)}</span>
            <br/><span class="lead-muted">${escapeHtml(q.mode)} — ${escapeHtml(q.summary || '')}</span></li>`
        )
        .join('');
    }

    if (!ships.res.ok) {
      shipmentsList.innerHTML = '<li class="form-note">Could not load shipments.</li>';
    } else if (!ships.data.data.length) {
      shipmentsList.innerHTML = '<li class="form-note">No past shipments on file yet.</li>';
    } else {
      shipmentsList.innerHTML = ships.data.data
        .map(
          (s) =>
            `<li><strong>${escapeHtml(s.id)}</strong>
            <span class="status-pill">${escapeHtml(s.status)}</span>
            <br/><span class="lead-muted">${escapeHtml(s.origin)} → ${escapeHtml(s.destination)} · ${escapeHtml(s.mode)} · ETA ${escapeHtml(String(s.eta || '—'))}</span>
            <br/><a href="/track.html?number=${encodeURIComponent(s.id)}" style="color:var(--gold)">Track</a></li>`
        )
        .join('');
    }
  }

  async function unlock() {
    const { res, data } = await api('/api/account/me');
    if (!res.ok) {
      setToken('');
      authPanel.hidden = false;
      dashPanel.hidden = true;
      return;
    }
    await loadDashboard(data.customer);
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFeedback('Signing in…', '');
    const { res, data } = await api('/api/account/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value,
      }),
    });
    if (!res.ok) {
      showFeedback(data.message || 'Login failed.', 'error');
      return;
    }
    setToken(data.token);
    showFeedback(data.message || 'Welcome.', 'success');
    await loadDashboard(data.customer);
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFeedback('Creating account…', '');
    const { res, data } = await api('/api/account/register', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('regName').value.trim(),
        company: document.getElementById('regCompany').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
      }),
    });
    if (!res.ok) {
      showFeedback(data.message || 'Registration failed.', 'error');
      return;
    }
    setToken(data.token);
    showFeedback(data.message || 'Account created.', 'success');
    await loadDashboard(data.customer);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/api/account/logout', { method: 'POST', body: '{}' });
    setToken('');
    authPanel.hidden = false;
    dashPanel.hidden = true;
    showFeedback('Signed out.', 'success');
  });

  if (getToken()) unlock();
})();

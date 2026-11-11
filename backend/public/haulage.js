(function () {
  const lookupForm = document.getElementById('lookupForm');
  const updateForm = document.getElementById('updateForm');
  const tripResult = document.getElementById('tripResult');
  const updateFeedback = document.getElementById('updateFeedback');
  const statusSelect = document.getElementById('status');

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showFeedback(el, message, type) {
    el.textContent = message;
    el.className = 'form-feedback show ' + (type || '');
  }

  async function loadStatuses() {
    try {
      const res = await apiFetch('/api/haulage/statuses');
      const data = await res.json();
      (data.data || []).forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.label;
        statusSelect.appendChild(opt);
      });
    } catch {
      /* ignore */
    }
  }

  function renderTrip(trip) {
    const history = (trip.history || [])
      .map(
        (h) =>
          `<li><time>${escapeHtml(new Date(h.at).toLocaleString())}</time>
          <strong>${escapeHtml(h.status)}</strong>
          <span> · ${escapeHtml(h.note || '')}</span></li>`
      )
      .join('');

    tripResult.hidden = false;
    tripResult.innerHTML = `
      <div class="status-pill">${escapeHtml(trip.status)}</div>
      <h3 class="trip-id">${escapeHtml(trip.id)}</h3>
      <dl class="track-meta">
        <div><dt>Origin</dt><dd>${escapeHtml(trip.origin)}</dd></div>
        <div><dt>Destination</dt><dd>${escapeHtml(trip.destination)}</dd></div>
        <div><dt>Cargo</dt><dd>${escapeHtml(trip.cargo || '—')}</dd></div>
        <div><dt>Driver</dt><dd>${escapeHtml(trip.driverName || '—')}</dd></div>
        <div><dt>Vehicle</dt><dd>${escapeHtml(trip.vehicle || '—')}</dd></div>
        <div><dt>Updated</dt><dd>${escapeHtml(new Date(trip.updatedAt).toLocaleString())}</dd></div>
      </dl>
      <p class="form-note">${escapeHtml(trip.note || '')}</p>
      ${history ? `<h4 class="portal-card-title">History</h4><ul class="milestone-list">${history}</ul>` : ''}
    `;
  }

  lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tripId').value.trim();
    tripResult.hidden = true;
    try {
      const res = await apiFetch('/api/haulage/' + encodeURIComponent(id));
      const data = await res.json();
      if (!res.ok) {
        tripResult.hidden = false;
        tripResult.innerHTML = `<p class="form-note">${escapeHtml(data.message || 'Not found.')}</p>`;
        return;
      }
      renderTrip(data.data);
      document.getElementById('updTripId').value = data.data.id;
    } catch {
      tripResult.hidden = false;
      tripResult.innerHTML = '<p class="form-note">Network error.</p>';
    }
  });

  updateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFeedback(updateFeedback, 'Posting update…', '');
    try {
      const res = await apiFetch('/api/haulage/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: document.getElementById('updTripId').value.trim(),
          status: statusSelect.value,
          driverName: document.getElementById('driverName').value.trim(),
          note: document.getElementById('note').value.trim(),
          pin: document.getElementById('pin').value,
        }),
      });
      const data = await res.json();
      showFeedback(
        updateFeedback,
        data.message || (res.ok ? 'Updated.' : 'Update failed.'),
        res.ok ? 'success' : 'error'
      );
      if (res.ok && data.data) {
        document.getElementById('tripId').value = data.data.id;
        renderTrip(data.data);
      }
    } catch {
      showFeedback(updateFeedback, 'Network error.', 'error');
    }
  });

  loadStatuses();

  const params = new URLSearchParams(window.location.search);
  if (params.get('trip')) {
    document.getElementById('tripId').value = params.get('trip');
    lookupForm.requestSubmit();
  }
})();

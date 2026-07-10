(function () {
  const form = document.getElementById('trackForm');
  const input = document.getElementById('trackingNumber');
  const carrierSelect = document.getElementById('carrierSelect');
  const feedback = document.getElementById('trackFeedback');
  const result = document.getElementById('trackResult');
  const alertForm = document.getElementById('alertForm');
  const alertFeedback = document.getElementById('alertFeedback');

  function showFeedback(el, message, type) {
    el.textContent = message;
    el.className = 'form-feedback show ' + (type || '');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso || iso === '—') return '—';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return escapeHtml(iso);
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return escapeHtml(iso);
    }
  }

  async function loadCarriers() {
    try {
      const res = await fetch('/api/tracking/carriers');
      const data = await res.json();
      (data.data || []).forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        carrierSelect.appendChild(opt);
      });
    } catch {
      /* optional */
    }
  }

  function renderLinks(links, primaryLink) {
    const list = [];
    if (primaryLink && primaryLink.url) list.push(primaryLink);
    (links || []).forEach((l) => {
      if (!list.some((x) => x.id === l.id)) list.push(l);
    });
    if (!list.length) return '';
    return `
      <h3 style="margin-top:1.25rem;color:var(--gold);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;">Live carrier tracking</h3>
      <ul class="docs-list">
        ${list
          .slice(0, 8)
          .map(
            (l) =>
              `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="color:var(--gold)">${escapeHtml(l.name)} → Track on official site</a></li>`
          )
          .join('')}
      </ul>
    `;
  }

  function renderShipment(payload) {
    const data = payload.data || {};
    const milestones = (data.milestones || [])
      .map(
        (m) =>
          `<li><time datetime="${escapeHtml(m.at)}">${formatDate(m.at)}</time><strong>${escapeHtml(m.label)}</strong><span> · ${escapeHtml(m.location)}</span></li>`
      )
      .join('');

    const docs = (data.documents || [])
      .map(
        (d) =>
          `<li><strong>${escapeHtml(d.name)}</strong> <span class="status-pill">${escapeHtml(d.type)}</span></li>`
      )
      .join('');

    const sourceNote =
      payload.mode === 'live'
        ? `Live feed · ${escapeHtml(data.source || 'carrier')}`
        : payload.mode === 'local'
          ? 'G&J operations record'
          : 'Carrier website hand-off';

    result.hidden = false;
    result.innerHTML = `
      <div class="status-pill">${escapeHtml(data.status || 'Tracking')}</div>
      <p class="form-note" style="margin-top:0.5rem">${sourceNote}</p>
      <h2 style="margin:0.75rem 0 0.25rem;font-family:'Bebas Neue',sans-serif;letter-spacing:0.06em;font-size:1.8rem;color:var(--white);">${escapeHtml(data.trackingNumber)}</h2>
      <dl class="track-meta">
        <div><dt>Carrier</dt><dd>${escapeHtml(data.carrier || '—')}</dd></div>
        <div><dt>Mode</dt><dd>${escapeHtml(data.mode || '—')}</dd></div>
        <div><dt>Origin</dt><dd>${escapeHtml(data.origin || '—')}</dd></div>
        <div><dt>Destination</dt><dd>${escapeHtml(data.destination || '—')}</dd></div>
        <div><dt>ETA</dt><dd>${escapeHtml(String(data.eta || '—'))}</dd></div>
        <div><dt>Vessel</dt><dd>${escapeHtml(data.vessel || '—')}</dd></div>
      </dl>
      ${
        milestones
          ? `<h3 style="color:var(--gold);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;">Milestones</h3><ul class="milestone-list">${milestones}</ul>`
          : '<p class="form-note">In-app milestones appear when a live API feed is available. Use the carrier links below for full live status.</p>'
      }
      ${docs ? `<h3 style="margin-top:1.25rem;color:var(--gold);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;">Documents</h3><ul class="docs-list">${docs}</ul>` : ''}
      ${renderLinks(payload.links, payload.primaryLink)}
      <p class="form-note" style="margin-top:1rem;">Need help? <a href="/#contact" style="color:var(--gold)">Contact operations</a></p>
    `;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const number = input.value.trim();
    if (!number) {
      showFeedback(feedback, 'Enter a tracking or container number.', 'error');
      input.focus();
      return;
    }

    showFeedback(feedback, 'Looking up shipment across G&J and ocean carriers…', '');
    result.hidden = true;

    const carrier = carrierSelect.value;
    const qs = new URLSearchParams({ number });
    if (carrier) qs.set('carrier', carrier);

    try {
      const res = await fetch('/api/tracking/live?' + qs.toString());
      const data = await res.json();
      if (!res.ok || !data.success) {
        showFeedback(feedback, data.message || 'Shipment not found.', 'error');
        return;
      }
      showFeedback(
        feedback,
        data.message || 'Tracking result ready.',
        data.mode === 'carrier-links' ? '' : 'success'
      );
      renderShipment(data);
    } catch {
      showFeedback(feedback, 'Network error. Please try again.', 'error');
    }
  });

  alertForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const trackingNumber = input.value.trim();
    const email = document.getElementById('alertEmail').value.trim();
    const phone = document.getElementById('alertPhone').value.trim();
    if (!trackingNumber) {
      showFeedback(alertFeedback, 'Enter a tracking number above first.', 'error');
      input.focus();
      return;
    }
    if (!email) {
      showFeedback(alertFeedback, 'Email is required for alerts.', 'error');
      return;
    }

    showFeedback(alertFeedback, 'Enabling alerts…', '');
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber,
          email,
          phone,
          carrier: carrierSelect.value || '',
        }),
      });
      const data = await res.json();
      showFeedback(
        alertFeedback,
        data.message || (res.ok ? 'Alerts enabled.' : 'Could not enable alerts.'),
        res.ok ? 'success' : 'error'
      );
    } catch {
      showFeedback(alertFeedback, 'Network error. Please try again.', 'error');
    }
  });

  loadCarriers();

  const params = new URLSearchParams(window.location.search);
  const preset = params.get('number') || params.get('trackingNumber');
  if (preset) {
    input.value = preset;
    if (params.get('carrier')) carrierSelect.value = params.get('carrier');
    form.requestSubmit();
  }
})();

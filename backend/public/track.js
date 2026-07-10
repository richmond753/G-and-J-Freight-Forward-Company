(function () {
  const form = document.getElementById('trackForm');
  const input = document.getElementById('trackingNumber');
  const feedback = document.getElementById('trackFeedback');
  const result = document.getElementById('trackResult');

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback show ' + (type || '');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  function renderShipment(data) {
    const milestones = (data.milestones || [])
      .map(
        (m) =>
          `<li><time datetime="${m.at}">${formatDate(m.at)}</time><strong>${m.label}</strong><span> · ${m.location}</span></li>`
      )
      .join('');

    const docs = (data.documents || [])
      .map((d) => `<li><strong>${d.name}</strong> <span class="status-pill">${d.type}</span></li>`)
      .join('');

    result.hidden = false;
    result.innerHTML = `
      <div class="status-pill">${data.status}</div>
      <h2 style="margin:0.75rem 0 0.25rem;font-family:'Bebas Neue',sans-serif;letter-spacing:0.06em;font-size:1.8rem;color:var(--white);">${data.trackingNumber}</h2>
      <dl class="track-meta">
        <div><dt>Mode</dt><dd>${data.mode}</dd></div>
        <div><dt>Origin</dt><dd>${data.origin}</dd></div>
        <div><dt>Destination</dt><dd>${data.destination}</dd></div>
        <div><dt>ETA</dt><dd>${data.eta}</dd></div>
        <div><dt>Carrier / vessel</dt><dd>${data.vessel}</dd></div>
        <div><dt>Consignee</dt><dd>${data.consignee}</dd></div>
      </dl>
      <h3 style="color:var(--gold);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;">Milestones</h3>
      <ul class="milestone-list">${milestones}</ul>
      <h3 style="margin-top:1.25rem;color:var(--gold);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;">Documents</h3>
      <ul class="docs-list">${docs || '<li>No documents yet.</li>'}</ul>
      <p class="form-note" style="margin-top:1rem;">Need help? <a href="/#contact" style="color:var(--gold)">Contact operations</a> or open the <a href="/portal.html" style="color:var(--gold)">customer portal</a>.</p>
    `;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const number = input.value.trim();
    if (!number) {
      showFeedback('Enter a tracking number.', 'error');
      input.focus();
      return;
    }

    showFeedback('Looking up shipment…', '');
    result.hidden = true;

    try {
      const res = await fetch('/api/tracking/' + encodeURIComponent(number));
      const data = await res.json();
      if (!res.ok || !data.success) {
        showFeedback(data.message || 'Shipment not found.', 'error');
        return;
      }
      showFeedback('Shipment found.', 'success');
      renderShipment(data.data);
    } catch {
      showFeedback('Network error. Please try again.', 'error');
    }
  });

  const params = new URLSearchParams(window.location.search);
  const preset = params.get('number') || params.get('trackingNumber');
  if (preset) {
    input.value = preset;
    form.requestSubmit();
  }
})();

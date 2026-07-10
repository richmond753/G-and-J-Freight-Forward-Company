(function () {
  const docsForm = document.getElementById('docsForm');
  const docsList = document.getElementById('docsList');
  const payMethods = document.getElementById('payMethods');
  const carrierStatus = document.getElementById('carrierStatus');

  async function loadPayments() {
    try {
      const res = await fetch('/api/portal/payments/methods');
      const data = await res.json();
      payMethods.innerHTML = (data.data || [])
        .map((m) => {
          const nums = (m.numbers || []).join(' · ');
          const extra = nums
            ? '<br/><span class="lead-muted">' + nums + (m.accountName ? ' · ' + m.accountName : '') + '</span>'
            : m.number
              ? '<br/><span class="lead-muted">' + m.number + (m.accountName ? ' · ' + m.accountName : '') + '</span>'
              : '';
          return `<li><strong>${m.label}</strong> · ${m.currency} <span class="status-pill">${m.status}</span>${extra}</li>`;
        })
        .join('');
    } catch {
      payMethods.textContent = 'Could not load payment methods.';
    }
  }

  async function loadCarriers() {
    try {
      const res = await fetch('/api/portal/carriers/status');
      const data = await res.json();
      const providers = (data.data && data.data.providers) || [];
      carrierStatus.innerHTML = providers
        .map(
          (p) =>
            `<li><strong>${p.name}</strong> <span class="status-pill">${p.status}</span></li>`
        )
        .join('');
    } catch {
      carrierStatus.textContent = 'Could not load carrier status.';
    }
  }

  docsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const number = document.getElementById('docsTracking').value.trim();
    docsList.innerHTML = '<li>Loading…</li>';
    try {
      const res = await fetch('/api/portal/documents?trackingNumber=' + encodeURIComponent(number));
      const data = await res.json();
      if (!res.ok || !data.success) {
        docsList.innerHTML = `<li>${data.message || 'Not found.'}</li>`;
        return;
      }
      docsList.innerHTML = (data.data || [])
        .map(
          (d) =>
            `<li><strong>${d.name}</strong> <span class="status-pill">${d.type}</span> · ${d.status}</li>`
        )
        .join('');
    } catch {
      docsList.innerHTML = '<li>Network error.</li>';
    }
  });

  loadPayments();
  loadCarriers();
})();

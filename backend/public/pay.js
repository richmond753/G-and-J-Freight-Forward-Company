(function () {
  const momoName = document.getElementById('momoName');
  const momoList = document.getElementById('momoList');
  const bankDetails = document.getElementById('bankDetails');
  const paystackStatus = document.getElementById('paystackStatus');
  const paystackForm = document.getElementById('paystackForm');
  const paystackFeedback = document.getElementById('paystackFeedback');
  const paystackSubmit = document.getElementById('paystackSubmit');
  const paystackWaFallback = document.getElementById('paystackWaFallback');
  const notifyForm = document.getElementById('notifyForm');
  const notifyFeedback = document.getElementById('notifyFeedback');
  const notifyWaLink = document.getElementById('notifyWaLink');
  const verifyBanner = document.getElementById('verifyBanner');

  let cfgCache = null;
  let paystackEnabled = false;

  function show(el, message, type) {
    el.hidden = false;
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

  function buildPayWa(extra) {
    const primary =
      (cfgCache && cfgCache.momo && cfgCache.momo.number) || '233244333374';
    const parts = [
      'Hello G and J Freight, I want to pay an invoice.',
      extra.email ? 'Email: ' + extra.email : null,
      extra.amount ? 'Amount: GHS ' + extra.amount : null,
      extra.trackingNumber ? 'Invoice/tracking: ' + extra.trackingNumber : null,
      extra.note ? 'Note: ' + extra.note : null,
    ].filter(Boolean);
    return 'https://wa.me/' + primary + '?text=' + encodeURIComponent(parts.join('\n'));
  }

  async function loadConfig() {
    const res = await apiFetch('/api/portal/payments/config');
    const data = await res.json();
    const cfg = data.data || {};
    cfgCache = cfg;

    momoName.textContent = (cfg.momo && cfg.momo.accountName) || 'G and J Freight Services';
    const lines = (cfg.momo && cfg.momo.numbers) || [];
    momoList.innerHTML = lines
      .map(
        (n) =>
          `<li>
            <strong>${escapeHtml(n.numberDisplay)}</strong>
            <a href="${escapeHtml(n.tel)}" style="color:var(--gold);margin-left:0.5rem">Call</a>
            <a href="${escapeHtml(n.waMe)}" target="_blank" rel="noopener" style="color:var(--gold);margin-left:0.5rem">WhatsApp</a>
            <button type="button" class="btn-outline copy-momo" data-number="${escapeHtml(
              n.number
            )}" style="margin-left:0.5rem;padding:0.2rem 0.55rem;font-size:0.75rem">Copy</button>
          </li>`
      )
      .join('');

    if (cfg.bank && cfg.bank.configured) {
      bankDetails.innerHTML = `
        <dl class="track-meta">
          <div><dt>Bank</dt><dd>${escapeHtml(cfg.bank.name)}</dd></div>
          <div><dt>Account name</dt><dd>${escapeHtml(cfg.bank.accountName)}</dd></div>
          <div><dt>Account number</dt><dd>${escapeHtml(cfg.bank.accountNumber)}</dd></div>
          ${
            cfg.bank.branch
              ? `<div><dt>Branch</dt><dd>${escapeHtml(cfg.bank.branch)}</dd></div>`
              : ''
          }
        </dl>
        <p class="form-note">Use your invoice number as the transfer narration.</p>
      `;
    } else {
      bankDetails.innerHTML = `
        <p class="form-note">Bank account details are provided by accounts on request (or once set on the server).</p>
        <div class="track-row">
          <a class="form-submit" href="${escapeHtml(
            (cfg.bank && cfg.bank.requestWaMe) || buildPayWa({})
          )}" target="_blank" rel="noopener">WhatsApp for bank details</a>
        </div>
        <p class="form-note" style="margin-top:0.75rem">You can also call any MoMo number above and ask for the bank slip.</p>
      `;
    }

    paystackEnabled = !!(cfg.paystack && cfg.paystack.enabled);
    if (paystackEnabled) {
      paystackStatus.textContent =
        'Paystack is live — pay with MoMo or card. You will be redirected to a secure checkout.';
      paystackSubmit.textContent = 'Pay with MoMo / Card';
    } else {
      paystackStatus.textContent =
        'Online Paystack checkout needs API keys on the server. Until then, use this form to message accounts with your amount, or pay via MoMo above.';
      paystackSubmit.textContent = 'Send payment request via WhatsApp';
    }
    paystackWaFallback.href = buildPayWa({});
  }

  momoList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-momo');
    if (!btn) return;
    const number = btn.getAttribute('data-number') || '';
    try {
      await navigator.clipboard.writeText(number);
      btn.textContent = 'Copied';
      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 1600);
    } catch {
      btn.textContent = 'Select & copy';
    }
  });

  paystackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      email: document.getElementById('payEmail').value.trim(),
      amount: Number(document.getElementById('payAmount').value),
      trackingNumber: document.getElementById('payTracking').value.trim(),
      note: document.getElementById('payNote').value.trim(),
      method: 'paystack',
    };

    paystackWaFallback.href = buildPayWa(payload);

    if (!paystackEnabled) {
      show(
        paystackFeedback,
        'Paystack keys are not on the server yet — opening WhatsApp so accounts can take your payment.',
        ''
      );
      window.open(paystackWaFallback.href, '_blank', 'noopener');
      return;
    }

    show(paystackFeedback, 'Starting Paystack checkout…', '');
    try {
      const res = await apiFetch('/api/portal/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        show(
          paystackFeedback,
          (data.message || 'Could not start checkout.') + ' You can WhatsApp accounts instead.',
          'error'
        );
        return;
      }
      show(paystackFeedback, 'Redirecting to Paystack…', 'success');
      window.location.href = data.data.authorizationUrl;
    } catch {
      show(paystackFeedback, 'Network error. Please try WhatsApp or MoMo.', 'error');
    }
  });

  notifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    notifyWaLink.hidden = true;
    show(notifyFeedback, 'Sending notice…', '');
    const body = {
      email: document.getElementById('notifyEmail').value.trim(),
      method: document.getElementById('notifyMethod').value,
      amount: document.getElementById('notifyAmount').value
        ? Number(document.getElementById('notifyAmount').value)
        : undefined,
      trackingNumber: document.getElementById('notifyTracking').value.trim(),
      reference: document.getElementById('notifyRef').value.trim(),
      note: document.getElementById('notifyNote').value.trim(),
    };
    try {
      const res = await apiFetch('/api/portal/payments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(notifyFeedback, data.message || 'Could not send notice.', 'error');
        return;
      }
      show(notifyFeedback, data.message || 'Notice saved.', 'success');
      if (data.whatsappUrl) {
        notifyWaLink.href = data.whatsappUrl;
        notifyWaLink.hidden = false;
        if (!data.emailed) {
          window.open(data.whatsappUrl, '_blank', 'noopener');
        }
      }
      notifyForm.reset();
    } catch {
      show(notifyFeedback, 'Network error. Please WhatsApp accounts directly.', 'error');
    }
  });

  async function maybeVerify() {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    verifyBanner.hidden = false;
    show(verifyBanner, 'Verifying payment ' + reference + '…', '');
    try {
      const res = await apiFetch(
        '/api/portal/payments/verify?reference=' + encodeURIComponent(reference)
      );
      const data = await res.json();
      if (data.paid) {
        show(
          verifyBanner,
          'Payment confirmed: GHS ' +
            (data.data && data.data.amount) +
            ' (' +
            reference +
            '). Thank you.',
          'success'
        );
      } else {
        show(verifyBanner, data.message || 'Payment not completed yet.', 'error');
      }
    } catch {
      show(verifyBanner, 'Could not verify payment right now.', 'error');
    }
  }

  loadConfig().catch(() => {
    momoName.textContent = 'G and J Freight Services';
    momoList.innerHTML = `
      <li><strong>+233 (0) 24 433 3374</strong></li>
      <li><strong>+233 (0) 24 583 9831</strong></li>
      <li><strong>+233 (0) 20 749 9123</strong></li>
      <li><strong>+233 (0) 57 079 3888</strong></li>
    `;
    bankDetails.innerHTML =
      '<p class="form-note">Could not load config. WhatsApp or call any number above for bank details.</p>';
    paystackStatus.textContent = 'Could not load Paystack status.';
  });
  maybeVerify();
})();

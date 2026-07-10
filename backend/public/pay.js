(function () {
  const momoName = document.getElementById('momoName');
  const momoNumber = document.getElementById('momoNumber');
  const momoWaLink = document.getElementById('momoWaLink');
  const copyMomoBtn = document.getElementById('copyMomoBtn');
  const bankDetails = document.getElementById('bankDetails');
  const paystackStatus = document.getElementById('paystackStatus');
  const paystackForm = document.getElementById('paystackForm');
  const paystackFeedback = document.getElementById('paystackFeedback');
  const notifyForm = document.getElementById('notifyForm');
  const notifyFeedback = document.getElementById('notifyFeedback');
  const verifyBanner = document.getElementById('verifyBanner');

  let momoRaw = '';

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

  async function loadConfig() {
    const res = await fetch('/api/portal/payments/config');
    const data = await res.json();
    const cfg = data.data || {};

    momoName.textContent = cfg.momo.accountName;
    momoNumber.textContent = cfg.momo.numberDisplay;
    momoRaw = cfg.momo.number;
    momoWaLink.href = cfg.momo.waMe;

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
        <p class="form-note">Bank account details will appear here once
        <code>BANK_NAME</code>, <code>BANK_ACCOUNT_NAME</code>, and
        <code>BANK_ACCOUNT_NUMBER</code> are set on the server.
        Meanwhile pay via MoMo or ask accounts for the account slip.</p>
      `;
    }

    if (cfg.paystack && cfg.paystack.enabled) {
      paystackStatus.textContent =
        'Paystack is live — pay with MTN MoMo or card. You will be redirected to a secure checkout.';
      paystackForm.hidden = false;
    } else {
      paystackStatus.textContent =
        'Paystack online checkout turns on when PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY are added on Render. MoMo and bank above work now.';
      paystackForm.hidden = true;
    }
  }

  copyMomoBtn.addEventListener('click', async () => {
    const text = String(momoRaw || momoNumber.textContent || '').replace(/\s/g, '');
    try {
      await navigator.clipboard.writeText(text);
      copyMomoBtn.textContent = 'Copied';
      setTimeout(() => {
        copyMomoBtn.textContent = 'Copy MoMo number';
      }, 2000);
    } catch {
      copyMomoBtn.textContent = 'Copy failed — select the number';
    }
  });

  paystackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    show(paystackFeedback, 'Starting Paystack checkout…', '');
    try {
      const res = await fetch('/api/portal/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('payEmail').value.trim(),
          amount: Number(document.getElementById('payAmount').value),
          trackingNumber: document.getElementById('payTracking').value.trim(),
          note: document.getElementById('payNote').value.trim(),
          method: 'paystack',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        show(paystackFeedback, data.message || 'Could not start checkout.', 'error');
        return;
      }
      show(paystackFeedback, 'Redirecting to Paystack…', 'success');
      window.location.href = data.data.authorizationUrl;
    } catch {
      show(paystackFeedback, 'Network error. Please try again.', 'error');
    }
  });

  notifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    show(notifyFeedback, 'Sending notice…', '');
    try {
      const res = await fetch('/api/portal/payments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('notifyEmail').value.trim(),
          method: document.getElementById('notifyMethod').value,
          amount: document.getElementById('notifyAmount').value
            ? Number(document.getElementById('notifyAmount').value)
            : undefined,
          trackingNumber: document.getElementById('notifyTracking').value.trim(),
          reference: document.getElementById('notifyRef').value.trim(),
          note: document.getElementById('notifyNote').value.trim(),
        }),
      });
      const data = await res.json();
      show(
        notifyFeedback,
        data.message || (res.ok ? 'Sent.' : 'Could not send.'),
        res.ok ? 'success' : 'error'
      );
      if (res.ok) notifyForm.reset();
    } catch {
      show(notifyFeedback, 'Network error.', 'error');
    }
  });

  async function maybeVerify() {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    verifyBanner.hidden = false;
    show(verifyBanner, 'Verifying payment ' + reference + '…', '');
    try {
      const res = await fetch(
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
    momoNumber.textContent = '+233 24 433 3374';
    bankDetails.innerHTML = '<p class="form-note">Could not load payment config.</p>';
    paystackStatus.textContent = 'Could not load Paystack status.';
  });
  maybeVerify();
})();

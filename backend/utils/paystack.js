// Paystack Initialize + Verify helpers (Node 18+ global fetch)

const { getPaymentConfig } = require('./paymentConfig');

async function paystackRequest(path, { method = 'GET', body } = {}) {
  const { secretKey } = getPaymentConfig();
  if (!secretKey) {
    const err = new Error('Paystack is not configured.');
    err.code = 'PAYSTACK_DISABLED';
    throw err;
  }

  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    const err = new Error(data.message || 'Paystack request failed.');
    err.code = 'PAYSTACK_ERROR';
    err.details = data;
    throw err;
  }
  return data;
}

/**
 * amountGhs — cedis (e.g. 150.50). Paystack expects pesewas (x100).
 */
async function initializeTransaction({ email, amountGhs, reference, metadata, callbackUrl }) {
  const amount = Math.round(Number(amountGhs) * 100);
  if (!Number.isFinite(amount) || amount < 100) {
    const err = new Error('Amount must be at least GHS 1.00.');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  const payload = {
    email,
    amount,
    currency: 'GHS',
    reference,
    callback_url: callbackUrl,
    metadata: metadata || {},
    channels: ['card', 'mobile_money', 'bank', 'ussd', 'bank_transfer'],
  };

  const data = await paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: payload,
  });
  return data.data;
}

async function verifyTransaction(reference) {
  const data = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  return data.data;
}

module.exports = { initializeTransaction, verifyTransaction };

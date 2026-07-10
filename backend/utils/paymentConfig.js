/**
 * Payment display + Paystack config from environment.
 * MoMo defaults to all public company numbers until overridden.
 */
function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatMomoDisplay(raw) {
  const d = digitsOnly(raw);
  if (d.length === 12 && d.startsWith('233')) {
    return `+${d.slice(0, 3)} (${d.slice(3, 4)}) ${d.slice(4, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  if (d.length === 10 && d.startsWith('0')) {
    return `+233 (0) ${d.slice(1, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  if (d.length === 9) {
    return `+233 (0) ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  }
  return String(raw || '').trim();
}

function toIntl(raw) {
  let d = digitsOnly(raw);
  if (d.startsWith('0') && d.length === 10) d = '233' + d.slice(1);
  if (d.length === 9) d = '233' + d;
  return d;
}

const DEFAULT_MOMO_NUMBERS = [
  '233244333374',
  '233245839831',
  '233207499123',
  '233570793888',
];

function parseMomoNumbers() {
  const fromEnv = (process.env.MOMO_NUMBERS || process.env.MOMO_NUMBER || '')
    .split(/[,;\s]+/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map(toIntl)
    .filter((n) => n.length >= 12);

  const list = fromEnv.length ? fromEnv : DEFAULT_MOMO_NUMBERS.slice();
  // de-dupe, keep order
  return [...new Set(list)];
}

function getPaymentConfig() {
  const numbers = parseMomoNumbers();
  const primary = numbers[0];
  const momoName = process.env.MOMO_ACCOUNT_NAME || 'G and J Freight Services';
  const bankName = process.env.BANK_NAME || '';
  const bankAccountName = process.env.BANK_ACCOUNT_NAME || '';
  const bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER || '';
  const bankBranch = process.env.BANK_BRANCH || '';
  const publicKey = (process.env.PAYSTACK_PUBLIC_KEY || '').trim();
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const paystackEnabled = Boolean(publicKey && secretKey);
  const siteUrl = (
    process.env.PUBLIC_SITE_URL ||
    'https://g-and-j-freight-forward-company.onrender.com'
  ).replace(/\/$/, '');

  const bankConfigured = Boolean(bankName && bankAccountName && bankAccountNumber);

  const lines = numbers.map((number) => ({
    number,
    numberDisplay: formatMomoDisplay(number),
    tel: `tel:+${number}`,
    waMe: `https://wa.me/${number}?text=${encodeURIComponent(
      'Hello G and J Freight, I want to pay an invoice via MoMo.'
    )}`,
  }));

  return {
    currency: 'GHS',
    momo: {
      accountName: momoName,
      network: 'MTN / Telecel / AT',
      number: primary,
      numberDisplay: formatMomoDisplay(primary),
      numbers: lines,
      waMe: lines[0].waMe,
    },
    bank: {
      configured: bankConfigured,
      name: bankName,
      accountName: bankAccountName,
      accountNumber: bankAccountNumber,
      branch: bankBranch,
      requestWaMe: `https://wa.me/${primary}?text=${encodeURIComponent(
        'Hello G and J Freight, please send your bank account details for a transfer payment.'
      )}`,
    },
    paystack: {
      enabled: paystackEnabled,
      publicKey: publicKey || null,
    },
    siteUrl,
    secretKey: secretKey || null,
    accountsEmail:
      process.env.CONTACT_RECEIVER ||
      process.env.SMTP_USER ||
      'info@gandjfreightservices.com',
  };
}

function publicPaymentConfig() {
  const cfg = getPaymentConfig();
  return {
    currency: cfg.currency,
    momo: cfg.momo,
    bank: cfg.bank,
    paystack: {
      enabled: cfg.paystack.enabled,
      publicKey: cfg.paystack.publicKey,
    },
    accountsEmail: cfg.accountsEmail,
    message: cfg.paystack.enabled
      ? 'Online MoMo and card payments are available via Paystack.'
      : 'Pay via any MoMo number below, bank transfer, or message accounts. Paystack checkout activates when API keys are set on the server.',
  };
}

module.exports = {
  getPaymentConfig,
  publicPaymentConfig,
  digitsOnly,
  formatMomoDisplay,
  DEFAULT_MOMO_NUMBERS,
};

/**
 * Payment display + Paystack config from environment.
 * MoMo defaults to the public contact number until overridden.
 */
function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatMomoDisplay(raw) {
  const d = digitsOnly(raw);
  if (d.length === 12 && d.startsWith('233')) {
    return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  if (d.length === 10 && d.startsWith('0')) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return String(raw || '').trim();
}

function getPaymentConfig() {
  const momoNumber = process.env.MOMO_NUMBER || '233244333374';
  const momoName = process.env.MOMO_ACCOUNT_NAME || 'G and J Freight Services';
  const bankName = process.env.BANK_NAME || '';
  const bankAccountName = process.env.BANK_ACCOUNT_NAME || '';
  const bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER || '';
  const bankBranch = process.env.BANK_BRANCH || '';
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
  const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
  const paystackEnabled = Boolean(publicKey && secretKey);
  const siteUrl =
    process.env.PUBLIC_SITE_URL ||
    'https://g-and-j-freight-forward-company.onrender.com';

  const bankConfigured = Boolean(bankName && bankAccountName && bankAccountNumber);

  return {
    currency: 'GHS',
    momo: {
      number: momoNumber,
      numberDisplay: formatMomoDisplay(momoNumber),
      accountName: momoName,
      network: 'MTN',
      waMe: `https://wa.me/${digitsOnly(momoNumber)}?text=${encodeURIComponent(
        'Hello G and J Freight, I want to pay an invoice via MoMo.'
      )}`,
    },
    bank: {
      configured: bankConfigured,
      name: bankName,
      accountName: bankAccountName,
      accountNumber: bankAccountNumber,
      branch: bankBranch,
    },
    paystack: {
      enabled: paystackEnabled,
      publicKey: publicKey || null,
    },
    siteUrl,
    secretKey: secretKey || null,
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
    message: cfg.paystack.enabled
      ? 'Online MoMo and card payments are available via Paystack.'
      : 'Pay via MoMo or bank transfer below. Online Paystack checkout activates when API keys are set on the server.',
  };
}

module.exports = { getPaymentConfig, publicPaymentConfig, digitsOnly, formatMomoDisplay };

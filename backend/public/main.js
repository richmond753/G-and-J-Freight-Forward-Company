/* ── Navbar scroll ─────────────────────────── */
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

/* ── Hamburger ─────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
  hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  const spans = hamburger.querySelectorAll('span');
  if (isOpen) {
    spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});
function closeMobile() {
  mobileMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Open menu');
  hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
}
/* Close the mobile menu with the Escape key */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
    closeMobile();
    hamburger.focus();
  }
});

/* ── Scroll reveal ─────────────────────────── */
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => observer.observe(el));

/* ── Form helpers ──────────────────────────── */
function setFieldError(id, msg) {
  const input = document.getElementById(id);
  const errEl = document.querySelector('.field-error[data-for="' + id + '"]');
  if (input) input.classList.toggle('invalid', !!msg);
  if (errEl) {
    errEl.textContent = msg || '';
    errEl.classList.toggle('show', !!msg);
  }
}

function showFeedback(message, type) {
  const fb = document.getElementById('formFeedback');
  fb.textContent = message;
  fb.className = 'form-feedback show ' + type;
}

function refreshCaptcha() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 1;
  const expected = String(a + b);
  const q = document.getElementById('captchaQuestion');
  const expectedEl = document.getElementById('captchaExpected');
  const answerEl = document.getElementById('captchaAnswer');
  if (q) q.textContent = a + ' + ' + b + ' = ?';
  if (expectedEl) expectedEl.value = expected;
  if (answerEl) answerEl.value = '';
}

function validateForm(payload) {
  let firstInvalid = null;
  const fail = (id, msg) => { setFieldError(id, msg); if (!firstInvalid) firstInvalid = id; };

  ['fname', 'lname', 'email', 'phone', 'message', 'weightKg', 'volumeCbm', 'captchaAnswer'].forEach(id => setFieldError(id, ''));

  if (!payload.firstName) fail('fname', 'First name is required.');
  if (!payload.lastName)  fail('lname', 'Last name is required.');
  if (!payload.email)     fail('email', 'Email address is required.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) fail('email', 'Please enter a valid email address.');
  if (payload.phone && !/^[\d\s\+\-\(\)]{7,20}$/.test(payload.phone)) fail('phone', 'Please enter a valid phone number.');
  if (payload.weightKg && !/^\d+(\.\d{1,2})?$/.test(payload.weightKg)) fail('weightKg', 'Weight must be a number (kg).');
  if (payload.volumeCbm && !/^\d+(\.\d{1,2})?$/.test(payload.volumeCbm)) fail('volumeCbm', 'Volume must be a number (CBM).');
  if (!payload.message)         fail('message', 'Message is required.');
  else if (payload.message.length < 10) fail('message', 'Message must be at least 10 characters.');
  if (!payload.captchaAnswer) fail('captchaAnswer', 'Please solve the security check.');
  else if (payload.captchaAnswer !== payload.captchaExpected) fail('captchaAnswer', 'Security check failed. Please try again.');

  return firstInvalid;
}

/* ── Form submit ───────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('formSubmit');
  const payload = {
    website: document.getElementById('website') ? document.getElementById('website').value : '',
    firstName: document.getElementById('fname').value.trim(),
    lastName:  document.getElementById('lname').value.trim(),
    email:     document.getElementById('email').value.trim(),
    phone:     document.getElementById('phone').value.trim(),
    service:   document.getElementById('service').value,
    origin:    document.getElementById('origin') ? document.getElementById('origin').value.trim() : '',
    destination: document.getElementById('destination') ? document.getElementById('destination').value.trim() : '',
    mode:      document.getElementById('mode') ? document.getElementById('mode').value : '',
    cargoType: document.getElementById('cargoType') ? document.getElementById('cargoType').value.trim() : '',
    weightKg:  document.getElementById('weightKg') ? document.getElementById('weightKg').value.trim() : '',
    volumeCbm: document.getElementById('volumeCbm') ? document.getElementById('volumeCbm').value.trim() : '',
    message:   document.getElementById('message').value.trim(),
    captchaAnswer: document.getElementById('captchaAnswer') ? document.getElementById('captchaAnswer').value.trim() : '',
    captchaExpected: document.getElementById('captchaExpected') ? document.getElementById('captchaExpected').value.trim() : '',
  };

  const firstInvalid = validateForm(payload);
  if (firstInvalid) {
    showFeedback('Please correct the highlighted fields and try again.', 'error');
    document.getElementById(firstInvalid).focus();
    return;
  }

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Sending…';

  try {
    const res  = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      const ref = data.leadId ? ' Reference: ' + data.leadId + '.' : '';
      showFeedback((data.message || 'Your message has been sent. We will be in touch shortly.') + ref, 'success');
      e.target.reset();
      refreshCaptcha();
    } else {
      if (Array.isArray(data.errors)) {
        const map = {
          firstName: 'fname', lastName: 'lname', email: 'email', phone: 'phone',
          message: 'message', captchaAnswer: 'captchaAnswer', weightKg: 'weightKg', volumeCbm: 'volumeCbm',
        };
        data.errors.forEach(err => setFieldError(map[err.field] || err.field, err.message));
      }
      showFeedback(data.message || 'Something went wrong. Please try again.', 'error');
      refreshCaptcha();
    }
  } catch {
    showFeedback('Network error. Please check your connection or call us directly.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

refreshCaptcha();

/* ── WhatsApp quote shortcut ─────────────────── */
(function () {
  const btn = document.getElementById('whatsappQuoteBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const parts = [
      'Hello G and J Freight, I would like a quote.',
      '',
      'Name: ' + (document.getElementById('fname')?.value || '') + ' ' + (document.getElementById('lname')?.value || ''),
      'Email: ' + (document.getElementById('email')?.value || ''),
      'Phone: ' + (document.getElementById('phone')?.value || ''),
      'Service: ' + (document.getElementById('service')?.value || ''),
      'Origin: ' + (document.getElementById('origin')?.value || ''),
      'Destination: ' + (document.getElementById('destination')?.value || ''),
      'Mode: ' + (document.getElementById('mode')?.value || ''),
      'Cargo: ' + (document.getElementById('cargoType')?.value || ''),
      'Weight (kg): ' + (document.getElementById('weightKg')?.value || ''),
      'Volume (CBM): ' + (document.getElementById('volumeCbm')?.value || ''),
      'Message: ' + (document.getElementById('message')?.value || ''),
    ];
    const text = parts.join('\n').trim();
    const url = 'https://wa.me/233244333374?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener');
  });
})();

/* ── Active nav link ───────────────────────── */
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  navAnchors.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + current ? 'var(--gold)' : '';
  });
});

/* ── Back to top ───────────────────────────── */
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('show', window.scrollY > 600);
});
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ── FAQ accordion ─────────────────────────── */
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const answer = q.nextElementSibling;
    const isOpen = q.getAttribute('aria-expanded') === 'true';
    q.setAttribute('aria-expanded', String(!isOpen));
    answer.classList.toggle('open', !isOpen);
  });
});

/* ── Dynamic year & years-in-business ──────── */
(function () {
  const now = new Date().getFullYear();
  const years = now - 2008;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('footerYear', now);
  set('yearsBadge', years);
  const yearsStat = document.getElementById('yearsStat');
  if (yearsStat) yearsStat.innerHTML = years + '<span>+</span>';
  set('yearsCaption', years + '+');
})();

/* ── Chat assistant (self-contained, no external service) ──────────── */
(function () {
  const panel   = document.getElementById('chatPanel');
  const toggle  = document.getElementById('chatToggle');
  const closeBtn= document.getElementById('chatClose');
  const body    = document.getElementById('chatBody');
  const form    = document.getElementById('chatForm');
  const input   = document.getElementById('chatInput');
  const quick   = document.getElementById('chatQuick');
  if (!panel || !toggle) return;

  let greeted = false;
  const WA = 'https://wa.me/233244333374';

  function addMsg(html, who) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + who;
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  const responses = {
    hello:   'Hello! 👋 I\'m the G&amp;J virtual assistant. Ask me about <strong>quotes</strong>, <strong>services</strong>, <strong>contact details</strong>, <strong>business hours</strong> or <strong>tracking</strong>.',
    quote:   'You can request a free quote with our form — tell us your cargo type, origin, destination and weight/volume. <a href="#contact" data-close>Open the quote form →</a><br/>Prefer to talk now? <a href="' + WA + '" target="_blank" rel="noopener">Message us on WhatsApp</a>.',
    services:'We offer 6 core services: ✈️ Air &amp; Sea Freight, 🚢 Import &amp; Export, 🏭 Warehousing, 📦 Consolidation, 🚛 Haulage and 💼 Consultancy. <a href="#services" data-close>See all services →</a>',
    contact: 'Reach us at:<br/>📞 +233 (0) 24 433 3374<br/>✉️ info@gandjfreightservices.com<br/>📍 Kpodo Plaza, Tema Comm 4, Accra – Ghana.<br/><a href="#contact" data-close>Go to contact →</a>',
    hours:   'Our business hours:<br/>Mon – Fri: 8:00am – 5:00pm<br/>Sat: 9:00am – 1:00pm (GMT).<br/>Outside these hours, <a href="' + WA + '" target="_blank" rel="noopener">WhatsApp us</a> and we\'ll reply soon.',
      track:   'Track cargo here: <a href="/track.html">Open tracking →</a><br/>Use a G&amp;J booking (e.g. GJ-2026-00142) or a container number for Maersk / MSC / CMA CGM and more.<br/>Or call 📞 +233 (0) 24 583 9831 / <a href="' + WA + '" target="_blank" rel="noopener">WhatsApp us</a>.',
    thanks:  'You\'re welcome! 😊 Is there anything else I can help you with?',
    default: 'I\'m not certain about that, but our team can help directly. Call 📞 +233 (0) 24 433 3374, <a href="' + WA + '" target="_blank" rel="noopener">WhatsApp us</a>, or use the <a href="#contact" data-close>contact form</a>.'
  };

  function detect(text) {
    const t = text.toLowerCase();
    if (/(quote|price|pricing|cost|rate|estimate|charge)/.test(t)) return 'quote';
    if (/(service|freight|ship|cargo|haulage|warehous|import|export|consolid|consult|air|sea)/.test(t)) return 'services';
    if (/(contact|email|phone|call|address|location|where.*(you|office)|reach)/.test(t)) return 'contact';
    if (/(hour|open|opening|time|when.*open)/.test(t)) return 'hours';
    if (/(track|status|where is my|delivery|arrive|shipment)/.test(t)) return 'track';
    if (/(thank|thanks|cheers|appreciate)/.test(t)) return 'thanks';
    if (/(^|\b)(hi|hello|hey|good (morning|afternoon|evening))(\b|$)/.test(t)) return 'hello';
    return 'default';
  }

  function botReply(key) {
    setTimeout(() => addMsg(responses[key] || responses.default, 'bot'), 350);
  }

  function openChat() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    if (!greeted) { addMsg(responses.hello, 'bot'); greeted = true; }
    setTimeout(() => input.focus(), 300);
  }
  function closeChat() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => panel.classList.contains('open') ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) closeChat(); });

  /* close the panel when a link inside a bot message is followed */
  body.addEventListener('click', (e) => {
    if (e.target.closest('a[data-close]')) closeChat();
  });

  quick.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-q]');
    if (!btn) return;
    addMsg(btn.textContent, 'user');
    botReply(btn.dataset.q);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMsg(text.replace(/</g, '&lt;'), 'user');
    input.value = '';
    botReply(detect(text));
  });
})();

window.googleTranslateElementInit = function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,ak,fr,es,ar,zh-CN,pt,de,ru,ja,hi,it,tr,nl,sw,ha,yo,ig',
    autoDisplay: false,
  }, 'google_translate_element');
};

/* In-page language picker - cookie + reload on same domain (never translate.goog proxy) */
(function initLanguagePicker() {
  // Escape Google Translate proxy host that strips site CSS
  if (/\.translate\.goog$/i.test(location.hostname)) {
    location.replace('https://g-and-j-freight-forward-company.onrender.com/');
    return;
  }

  const select = document.getElementById('langSelect');
  if (!select) return;

  function readGoogTrans() {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (!match) return 'en';
    const parts = decodeURIComponent(match[1]).split('/');
    return parts[2] || 'en';
  }

  function clearGoogTransCookies() {
    const hostname = location.hostname;
    const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'googtrans=; path=/; ' + expire;
    document.cookie = 'googtrans=; path=/; domain=' + hostname + '; ' + expire;
    if (hostname.indexOf('.') !== -1) {
      document.cookie = 'googtrans=; path=/; domain=.' + hostname + '; ' + expire;
    }
  }

  function setGoogTransCookie(lang) {
    clearGoogTransCookies();
    if (lang === 'en') return;
    const value = '/en/' + lang;
    document.cookie = 'googtrans=' + value + '; path=/';
    document.cookie = 'googtrans=' + value + '; path=/; domain=' + location.hostname;
  }

  function applyLanguage(lang) {
    if (lang === 'en') {
      clearGoogTransCookies();
      location.reload();
      return;
    }
    setGoogTransCookie(lang);
    location.reload();
  }

  const current = readGoogTrans();
  if (Array.from(select.options).some((o) => o.value === current)) {
    select.value = current;
  }

  select.addEventListener('change', () => applyLanguage(select.value));

  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
  }
})();

var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
(function () {
  var TAWK_PROPERTY_ID = 'YOUR_TAWK_PROPERTY_ID';
  var TAWK_WIDGET_ID   = 'YOUR_TAWK_WIDGET_ID';
  if (TAWK_PROPERTY_ID.indexOf('YOUR_') === 0) return;
  var s1 = document.createElement('script'), s0 = document.getElementsByTagName('script')[0];
  s1.async = true;
  s1.src = 'https://embed.tawk.to/' + TAWK_PROPERTY_ID + '/' + TAWK_WIDGET_ID;
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');
  s0.parentNode.insertBefore(s1, s0);
})();

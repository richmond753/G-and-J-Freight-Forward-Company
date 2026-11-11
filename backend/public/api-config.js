(function () {
  const hostname = window.location.hostname;
  const isRender = hostname.endsWith('.onrender.com');
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const apiOrigin =
    isRender || isLocal
      ? window.location.origin
      : 'https://g-and-j-freight-forward-company.onrender.com';

  window.apiFetch = function (path, options) {
    return window.fetch(new URL(path, apiOrigin), options);
  };
})();

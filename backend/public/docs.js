(function () {
  const uploadForm = document.getElementById('uploadForm');
  const listForm = document.getElementById('listForm');
  const feedback = document.getElementById('uploadFeedback');
  const docsList = document.getElementById('docsList');
  const docType = document.getElementById('docType');

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback show ' + (type || '');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function loadTypes() {
    try {
      const res = await apiFetch('/api/documents/types');
      const data = await res.json();
      (data.data || []).forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.label;
        docType.appendChild(opt);
      });
    } catch {
      /* ignore */
    }
  }

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(uploadForm);
    showFeedback('Uploading…', '');
    try {
      const res = await apiFetch('/api/documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      showFeedback(
        data.message || (res.ok ? 'Uploaded.' : 'Upload failed.'),
        res.ok ? 'success' : 'error'
      );
      if (res.ok) {
        uploadForm.reset();
        const track = data.data && data.data.trackingNumber;
        if (track) {
          document.getElementById('listTracking').value = track;
          listForm.requestSubmit();
        }
      }
    } catch {
      showFeedback('Network error. Please try again.', 'error');
    }
  });

  listForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const trackingNumber = document.getElementById('listTracking').value.trim();
    if (!trackingNumber) {
      docsList.innerHTML = '<li class="form-note">Enter a tracking number.</li>';
      return;
    }
    docsList.innerHTML = '<li class="form-note">Loading…</li>';
    try {
      const res = await apiFetch(
        '/api/documents?trackingNumber=' + encodeURIComponent(trackingNumber)
      );
      const data = await res.json();
      if (!res.ok || !data.data || !data.data.length) {
        docsList.innerHTML =
          '<li class="form-note">' +
          escapeHtml(data.message || 'No documents found for that reference.') +
          '</li>';
        return;
      }
      docsList.innerHTML = data.data
        .map(
          (d) =>
            `<li><strong>${escapeHtml(d.docType)}</strong> — ${escapeHtml(d.originalName)}
            <span class="status-pill">${escapeHtml(d.id)}</span>
            <br/><span class="lead-muted">${new Date(d.uploadedAt).toLocaleString()}</span></li>`
        )
        .join('');
    } catch {
      docsList.innerHTML = '<li class="form-note">Could not load documents.</li>';
    }
  });

  loadTypes();
})();

(() => {
  const STORAGE_KEY = 'symptomEntries';

  const SYMPTOMS = [
    { key: 'fever', label: 'Fever' },
    { key: 'cough', label: 'Cough' },
    { key: 'soreThroat', label: 'Sore throat' },
    { key: 'throatWeirdness', label: 'Throat weirdness' },
    { key: 'fatigue', label: 'Fatigue' },
    { key: 'headache', label: 'Headache' },
    { key: 'congestion', label: 'Congestion' },
    { key: 'bodyAches', label: 'Body aches' },
    { key: 'nausea', label: 'Nausea' },
    { key: 'shortnessOfBreath', label: 'Shortness of breath' },
  ];

  const SEVERITY_LABELS = ['None', 'Mild', 'Moderate', 'Severe'];

  const form = document.getElementById('entryForm');
  const timestampInput = document.getElementById('timestamp');
  const symptomRows = document.getElementById('symptomRows');
  const temperatureInput = document.getElementById('temperature');
  const notesInput = document.getElementById('notes');
  const entryList = document.getElementById('entryList');
  const entryListEmpty = document.getElementById('entryListEmpty');
  const chartEmpty = document.getElementById('chartEmpty');
  const chartCanvas = document.getElementById('chart');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const clearAllBtn = document.getElementById('clearAllBtn');

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function toLocalInputValue(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load entries', e);
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function severitySum(entry) {
    return SYMPTOMS.reduce((sum, s) => sum + (entry.symptoms[s.key] || 0), 0);
  }

  function buildSymptomRows() {
    symptomRows.innerHTML = SYMPTOMS.map((s) => `
      <div class="symptom-row">
        <span class="symptom-label">${s.label}</span>
        <div class="severity-group" data-symptom="${s.key}">
          ${SEVERITY_LABELS.map((label, i) => `
            <label>
              <input type="radio" name="${s.key}" value="${i}" ${i === 0 ? 'checked' : ''}>
              <span>${label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function resetForm() {
    form.reset();
    timestampInput.value = toLocalInputValue(new Date());
    // form.reset() only restores default `checked` state, which is already "None" (index 0)
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function renderList(entries) {
    const sorted = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    entryListEmpty.hidden = sorted.length > 0;

    entryList.innerHTML = sorted.map((entry) => {
      const pills = SYMPTOMS
        .filter((s) => (entry.symptoms[s.key] || 0) > 0)
        .map((s) => `<span class="symptom-pill">${s.label}: ${SEVERITY_LABELS[entry.symptoms[s.key]]}</span>`)
        .join('');

      const metaParts = [];
      if (entry.temperature !== null && entry.temperature !== undefined && entry.temperature !== '') {
        metaParts.push(`${entry.temperature}°F`);
      }
      const meta = metaParts.length ? `<div class="entry-meta">${metaParts.join(' • ')}</div>` : '';
      const notes = entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : '';
      const symptomsHtml = pills ? `<div class="entry-symptoms">${pills}</div>` : `<div class="entry-symptoms hint">No symptoms logged</div>`;

      return `
        <div class="entry-card" data-id="${entry.id}">
          <div class="entry-card-top">
            <span class="entry-date">${formatDate(entry.timestamp)}</span>
            <span class="entry-severity">Total severity: ${severitySum(entry)}</span>
          </div>
          ${symptomsHtml}
          ${meta}
          ${notes}
          <button type="button" class="btn small danger entry-delete" data-id="${entry.id}">Delete</button>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function drawChart(entries) {
    const wrap = chartCanvas.parentElement;
    const cssWidth = wrap.clientWidth || 300;
    const cssHeight = 160;
    const dpr = window.devicePixelRatio || 1;

    chartCanvas.width = cssWidth * dpr;
    chartCanvas.height = cssHeight * dpr;

    const ctx = chartCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    chartEmpty.hidden = entries.length > 0;
    if (entries.length === 0) return;

    const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const values = sorted.map(severitySum);
    const maxPossible = SYMPTOMS.length * 3;
    const maxVal = Math.max(...values, Math.ceil(maxPossible / 3));

    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const w = cssWidth - padding.left - padding.right;
    const h = cssHeight - padding.top - padding.bottom;

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || '#2563eb';
    const border = styles.getPropertyValue('--border').trim() || '#ccc';

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + h);
    ctx.lineTo(padding.left + w, padding.top + h);
    ctx.stroke();

    const times = sorted.map((e) => new Date(e.timestamp).getTime());
    const minT = times[0];
    const maxT = times[times.length - 1];
    const timeRange = maxT - minT;
    const points = values.map((v, i) => {
      const x = padding.left + (timeRange > 0 ? ((times[i] - minT) / timeRange) * w : w / 2);
      const y = padding.top + h - (v / maxVal) * h;
      return [x, y];
    });

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    ctx.fillStyle = accent;
    points.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function render() {
    const entries = loadEntries();
    renderList(entries);
    drawChart(entries);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const symptoms = {};
    SYMPTOMS.forEach((s) => {
      symptoms[s.key] = parseInt(formData.get(s.key), 10) || 0;
    });

    const tempRaw = temperatureInput.value;
    const entry = {
      id: makeId(),
      timestamp: new Date(timestampInput.value).toISOString(),
      symptoms,
      temperature: tempRaw === '' ? null : parseFloat(tempRaw),
      notes: notesInput.value.trim(),
    };

    const entries = loadEntries();
    entries.push(entry);
    saveEntries(entries);

    resetForm();
    render();
  });

  entryList.addEventListener('click', (e) => {
    const btn = e.target.closest('.entry-delete');
    if (!btn) return;
    const id = btn.dataset.id;
    const entries = loadEntries().filter((entry) => entry.id !== id);
    saveEntries(entries);
    render();
  });

  clearAllBtn.addEventListener('click', () => {
    if (!confirm('Delete all logged entries? This cannot be undone.')) return;
    saveEntries([]);
    render();
  });

  exportBtn.addEventListener('click', () => {
    const entries = loadEntries();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `symptom-tracker-export-${dateStamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', () => {
    const file = importFile.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error('Not an array');

        const existing = loadEntries();
        const existingIds = new Set(existing.map((entry) => entry.id));
        const merged = existing.concat(imported.filter((entry) => entry && entry.id && !existingIds.has(entry.id)));

        saveEntries(merged);
        render();
        alert(`Imported ${merged.length - existing.length} new entr${merged.length - existing.length === 1 ? 'y' : 'ies'}.`);
      } catch (err) {
        alert('Could not import that file — make sure it is a JSON export from this app.');
      } finally {
        importFile.value = '';
      }
    };
    reader.readAsText(file);
  });

  window.addEventListener('resize', debounce(() => drawChart(loadEntries()), 150));

  buildSymptomRows();
  resetForm();
  render();
})();

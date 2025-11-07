document.addEventListener('DOMContentLoaded', () => {
  const days = ['mon','tue','wed','thu','fri'];
  const times = [
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:15 - 11:15',
    '11:15 - 12:15',
    '13:00 - 14:00',
    '14:00 - 15:00'
  ];

  const STORAGE_KEY = 'hod_timetable_v1';

  const ttBody = document.getElementById('ttBody');
  let saveBtn = document.getElementById('saveBtn');
  let resetBtn = document.getElementById('resetBtn');
  let clearBtn = document.getElementById('clearBtn');

  // create a simple toast function (uses same styles if page loaded with script.js)
  function getToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }
  function showToast(text, t = 1800) {
    const container = getToastContainer();
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = text;
    container.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 300);
    }, t);
  }

  function defaultData() {
    const obj = {};
    times.forEach(time => {
      obj[time] = {};
      days.forEach(d => obj[time][d] = '');
    });
    // sample defaults (optional, keep simple)
    obj[times[0]].mon = 'Circuit Analysis';
    obj[times[0]].wed = 'Electronics Lab';
    obj[times[2]].fri = 'Signals';
    return obj;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      // ensure structure
      return Object.assign(defaultData(), parsed);
    } catch (e) {
      console.error('load error', e);
      return defaultData();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('Timetable saved');
  }

  function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    showToast('Cleared saved timetable');
  }

  let state = load();

  function render() {
    if (!ttBody) {
      console.error('timetable body element not found (id=ttBody)');
      return;
    }
    ttBody.innerHTML = '';
    times.forEach(time => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = time;
      tr.appendChild(th);
      days.forEach(day => {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.className = 'tt-cell';
        td.setAttribute('data-day', day);
        td.setAttribute('data-time', time);
        td.setAttribute('aria-label', `${day} ${time}`);
        td.textContent = state[time][day] || '';
        // ensure visible text and wrapping
        td.style.color = td.style.color || '#111';
        td.style.whiteSpace = 'pre-wrap';
        // on blur save to state (auto-save)
        td.addEventListener('blur', (e) => {
          state[time][day] = td.textContent.trim();
          save(state);
        });
        // commit on Enter (prevent newline)
        td.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            td.blur();
          }
        });
        tr.appendChild(td);
      });
      ttBody.appendChild(tr);
    });
  }
  // Attach button handlers with fallbacks if elements are missing
  function attachButtons() {
    if (!saveBtn) {
      saveBtn = document.querySelector('.btn-primary#saveBtn') || document.querySelector('button.btn-primary');
    }
    if (!resetBtn) {
      resetBtn = document.getElementById('resetBtn') || document.querySelector('button.btn-secondary');
    }
    if (!clearBtn) {
      clearBtn = document.getElementById('clearBtn') || Array.from(document.querySelectorAll('button.btn-secondary')).pop();
    }

    if (saveBtn) saveBtn.addEventListener('click', () => { try { save(state); } catch (e) { console.error(e); } });
    if (resetBtn) resetBtn.addEventListener('click', () => {
      state = defaultData();
      render();
      try { save(state); } catch (e) { console.error(e); }
      showToast('Reset to default timetable');
    });
    if (clearBtn) clearBtn.addEventListener('click', () => {
      // avoid relying on native confirm if not available; fallback to a simple prompt
      try {
        const ok = typeof confirm === 'function' ? confirm('Clear saved timetable?') : window.prompt('Type YES to clear') === 'YES';
        if (ok) {
          clearStorage();
          state = defaultData();
          render();
        }
      } catch (e) {
        console.error('clear failed', e);
      }
    });
  }

  attachButtons();

  render();
});
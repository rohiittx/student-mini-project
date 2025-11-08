document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'hod_batches_v1';
  const DEFAULT_BATCHES = [
    { id: 'B2024-A', name: 'Batch A', year: '2024', start: '', end: '', active: 'true' },
    { id: 'B2025-B', name: 'Batch B', year: '2025', start: '', end: '', active: 'true' }
  ];

  const listEl = document.getElementById('batchesList');
  const noEl = document.getElementById('noBatches');
  const addBtn = document.getElementById('addBatchBtn');
  const searchInput = document.getElementById('searchBatch');
  const yearFilter = document.getElementById('yearFilter');
  const template = document.getElementById('batchModalTemplate');

  let batches = load();
  let filters = { search: '', year: '' };

  function getToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    return c;
  }
  function showToast(t, time = 1800) { const c = getToastContainer(); const n = document.createElement('div'); n.className = 'toast'; n.textContent = t; c.appendChild(n); requestAnimationFrame(() => n.classList.add('show')); setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, time); }

  function load() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : DEFAULT_BATCHES; } catch (e) { console.error(e); return DEFAULT_BATCHES; } }
  function save(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); // notify other pages
      try { window.dispatchEvent(new Event('batchesUpdated')); } catch (e) { /* ignore */ }
    } catch (e) { console.error(e); showToast('Save failed'); } }

  function filterItems(list) {
    return list.filter(b => {
      const s = filters.search.toLowerCase();
      const matches = !s || b.name.toLowerCase().includes(s) || b.id.toLowerCase().includes(s);
      const matchYear = !filters.year || b.year === filters.year;
      return matches && matchYear;
    });
  }

  function render() {
    const data = filterItems(batches);
    listEl.innerHTML = '';
    if (!data.length) { noEl.style.display = 'block'; document.getElementById('batchesTable').style.display = 'none'; return; }
    noEl.style.display = 'none'; document.getElementById('batchesTable').style.display = 'table';

    data.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.id}</td>
        <td>${b.name}</td>
        <td>${b.year}</td>
        <td>${b.start || '-'}</td>
        <td>${b.end || '-'}</td>
        <td>${b.active === 'true' ? 'Yes' : 'No'}</td>
        <td>
          <button class="btn-icon manage-classes" data-id="${b.id}" title="Manage Classes"><i class="fas fa-layer-group"></i></button>
          <button class="btn-icon edit" data-id="${b.id}" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete" data-id="${b.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      listEl.appendChild(tr);
    });

    listEl.querySelectorAll('.manage-classes').forEach(b => b.addEventListener('click', () => showClassesModal(b.dataset.id)));
    listEl.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => editBatch(b.dataset.id)));
    listEl.querySelectorAll('.delete').forEach(b => b.addEventListener('click', () => deleteBatch(b.dataset.id)));
  }

  function showModal(item = null) {
    const isEdit = !!item;
    const modal = createModal({
      title: isEdit ? 'Edit Batch' : 'Add Batch',
      body: template.innerHTML,
      primaryText: isEdit ? 'Save' : 'Add',
      onShow: (modalEl) => {
        const form = modalEl.querySelector('#batchForm');
        if (isEdit) Object.keys(item).forEach(k => { const inp = form.elements[k]; if (inp) inp.value = item[k]; });

        form.addEventListener('submit', (e) => {
          e.preventDefault(); e.stopPropagation();
          const elems = Array.from(form.elements).filter(el => el.name);
          for (const el of elems) { if (el.required && !el.value.trim()) { showToast('Fill required fields'); return; } }
          const data = Object.fromEntries(new FormData(form));
          if (isEdit) {
            batches = batches.map(b => b.id === item.id ? data : b); showToast('Updated');
          } else {
            if (batches.some(b => b.id === data.id)) { showToast('ID exists'); return; }
            batches.push(data); showToast('Added');
          }
          save(batches); render(); modal.close();
        });
      }
    });
    modal.show();
  }

  function deleteBatch(id) {
    const b = batches.find(x => x.id === id); if (!b) return;
    const modal = createModal({ title: 'Delete Batch', body: `<p>Delete ${b.name} (${b.id})?</p><p class="text-danger">This cannot be undone.</p>`, primaryText: 'Delete', primaryClass: 'btn-danger', primaryAction: () => { batches = batches.filter(x => x.id !== id); save(batches); render(); showToast('Deleted'); modal.close(); } });
    modal.show();
  }

  function editBatch(id) { const b = batches.find(x => x.id === id); if (b) showModal(b); }

  // Manage classes for a batch
  function showClassesModal(batchId) {
    const batch = batches.find(x => x.id === batchId);
    if (!batch) { showToast('Batch not found'); return; }
    batch.classes = batch.classes || [];

    const modal = createModal({
      title: `Classes — ${batch.name}`,
      body: `<div id="classesContainer"></div>`,
      primaryText: 'Close',
      onShow: (modalEl) => {
        const container = modalEl.querySelector('#classesContainer');

        function renderClasses() {
          container.innerHTML = '';
          // Add form to add new class
          const form = document.createElement('form');
          form.className = 'form-grid';
          form.innerHTML = `
            <div class="form-group"><label>Class ID</label><input name="classId" required></div>
            <div class="form-group"><label>Subject</label><input name="subject" required></div>
            <div class="form-group"><label>Instructor</label><input name="instructor"></div>
            <div class="form-group"><label>Schedule</label><input name="schedule" placeholder="Mon 08:00-09:00"></div>
            <div class="form-group"><label></label><button class="btn btn-primary" type="submit">Add Class</button></div>
          `;
          container.appendChild(form);

          const list = document.createElement('div'); list.style.marginTop = '1rem';
          if (!batch.classes.length) list.innerHTML = '<p class="muted">No classes yet.</p>';
          const table = document.createElement('table'); table.className = 'data-table';
          table.style.marginTop = '0.5rem';
          const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>ID</th><th>Subject</th><th>Instructor</th><th>Schedule</th><th>Actions</th></tr>';
          table.appendChild(thead);
          const tbody = document.createElement('tbody');
          batch.classes.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${c.classId}</td><td>${c.subject}</td><td>${c.instructor || '-'}</td><td>${c.schedule || '-'}</td><td><button class="btn-icon edit-class" data-id="${c.classId}"><i class="fas fa-edit"></i></button> <button class="btn-icon del-class" data-id="${c.classId}"><i class="fas fa-trash-alt"></i></button></td>`;
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          if (batch.classes.length) container.appendChild(table);
          container.appendChild(list);

          // form submit -> add class
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const newC = Object.fromEntries(fd);
            if (!newC.classId || !newC.subject) { showToast('Please provide Class ID and Subject'); return; }
            if (batch.classes.some(x => x.classId === newC.classId)) { showToast('Class ID exists', 'error'); return; }
            batch.classes.push(newC);
            save(batches);
            showToast('Class added');
            renderClasses();
          });

          // attach edit/delete
          container.querySelectorAll('.edit-class').forEach(btn => {
            btn.addEventListener('click', () => {
              const id = btn.dataset.id;
              const cls = batch.classes.find(x => x.classId === id);
              if (!cls) return;
              // prompt-based quick edit
              const subject = prompt('Subject', cls.subject) || cls.subject;
              const instructor = prompt('Instructor', cls.instructor || '') || cls.instructor;
              const schedule = prompt('Schedule', cls.schedule || '') || cls.schedule;
              cls.subject = subject; cls.instructor = instructor; cls.schedule = schedule;
              save(batches); renderClasses(); showToast('Class updated');
            });
          });
          container.querySelectorAll('.del-class').forEach(btn => {
            btn.addEventListener('click', () => {
              const id = btn.dataset.id;
              if (!confirm('Delete this class?')) return;
              batch.classes = batch.classes.filter(x => x.classId !== id);
              save(batches); renderClasses(); showToast('Class deleted');
            });
          });
        }

        renderClasses();
      }
    });
    modal.show();
  }

  function createModal({ title = '', body = '', primaryText = 'OK', primaryAction = null, primaryClass = 'btn-primary', secondaryText = 'Cancel', onShow = null }) {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const modal = document.createElement('div'); modal.className = 'modal';
    modal.innerHTML = `<div class="modal-header"><h3>${title}</h3></div><div class="modal-body">${body}</div><div class="modal-actions"><button class="btn btn-secondary" data-action="cancel">${secondaryText}</button><button class="btn ${primaryClass}" data-action="primary">${primaryText}</button></div>`;
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
    modal.querySelector('[data-action="cancel"]').addEventListener('click', close);
    const primaryBtn = modal.querySelector('[data-action="primary"]');
    primaryBtn.addEventListener('click', () => { const form = modal.querySelector('form'); if (form) { const ev = new Event('submit', { cancelable: true }); form.dispatchEvent(ev); } else if (primaryAction) primaryAction(); else close(); });
    overlay.appendChild(modal); document.body.appendChild(overlay); if (onShow) onShow(modal); requestAnimationFrame(() => overlay.classList.add('show'));
    return { close, modal };
  }

  addBtn.addEventListener('click', () => showModal());
  searchInput.addEventListener('input', (e) => { filters.search = e.target.value; render(); });
  yearFilter.addEventListener('change', (e) => { filters.year = e.target.value; render(); });

  render();
});
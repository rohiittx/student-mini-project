document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'hod_subjects_v1';
  const DEFAULT_SUBJECTS = [
    { code: 'EE101', title: 'Circuit Theory', credits: '3', semester: '3', description: '', curriculum: [] },
    { code: 'EE102', title: 'Electromagnetics', credits: '3', semester: '2', description: '', curriculum: [] }
  ];

  const listEl = document.getElementById('subjectsList');
  const noEl = document.getElementById('noSubjects');
  const addBtn = document.getElementById('addSubjectBtn');
  const searchInput = document.getElementById('searchSubject');
  const semFilter = document.getElementById('semesterFilterSub');
  const template = document.getElementById('subjectModalTemplate');

  let subjects = load();
  let filters = { search: '', semester: '' };

  function getToastContainer() { let c = document.querySelector('.toast-container'); if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); } return c; }
  function showToast(t, time = 1800) { const c = getToastContainer(); const n = document.createElement('div'); n.className = 'toast'; n.textContent = t; c.appendChild(n); requestAnimationFrame(() => n.classList.add('show')); setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, time); }

  function load() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : DEFAULT_SUBJECTS; } catch (e) { console.error(e); return DEFAULT_SUBJECTS; } }
  function save(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); // notify other pages
      try { window.dispatchEvent(new Event('subjectsUpdated')); } catch (e) {} } catch (e) { console.error(e); showToast('Save failed'); } }

  function filterItems(list) {
    return list.filter(s => {
      const q = filters.search.toLowerCase();
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const matchSem = !filters.semester || s.semester === filters.semester;
      return matchSearch && matchSem;
    });
  }

  function render() {
    const data = filterItems(subjects);
    listEl.innerHTML = '';
    if (!data.length) { noEl.style.display = 'block'; document.getElementById('subjectsTable').style.display = 'none'; return; }
    noEl.style.display = 'none'; document.getElementById('subjectsTable').style.display = 'table';

    data.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.code}</td>
        <td>${s.title}</td>
        <td>${s.credits}</td>
        <td>Sem ${s.semester}</td>
        <td>
          <button class="btn-icon manage-curr" data-code="${s.code}" title="Manage Curriculum"><i class="fas fa-book-open"></i></button>
          <button class="btn-icon edit" data-code="${s.code}" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete" data-code="${s.code}" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      listEl.appendChild(tr);
    });

    listEl.querySelectorAll('.manage-curr').forEach(b => b.addEventListener('click', () => openCurriculum(b.dataset.code)));
    listEl.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => editSubject(b.dataset.code)));
    listEl.querySelectorAll('.delete').forEach(b => b.addEventListener('click', () => deleteSubject(b.dataset.code)));
  }

  function showModal(item = null) {
    const isEdit = !!item;
    const modal = createModal({ title: isEdit ? 'Edit Subject' : 'Add Subject', body: template.innerHTML, primaryText: isEdit ? 'Save' : 'Add', onShow: (modalEl) => {
        const form = modalEl.querySelector('#subjectForm');
        if (isEdit) Object.keys(item).forEach(k => { const inp = form.elements[k]; if (inp) inp.value = item[k]; });

        form.addEventListener('submit', (e) => {
          e.preventDefault(); e.stopPropagation();
          const elems = Array.from(form.elements).filter(el => el.name);
          for (const el of elems) { if (el.required && !el.value.trim()) { showToast('Complete required fields'); return; } }
          const data = Object.fromEntries(new FormData(form));
          if (isEdit) { subjects = subjects.map(s => s.code === item.code ? Object.assign({}, s, data) : s); showToast('Updated'); }
          else { if (subjects.some(s => s.code === data.code)) { showToast('Code exists'); return; } subjects.push(Object.assign({}, data, { curriculum: [] })); showToast('Added'); }
          save(subjects); render(); modal.close();
        });
    } });
    modal.show();
  }

  function deleteSubject(code) { const s = subjects.find(x => x.code === code); if (!s) return; const modal = createModal({ title: 'Delete Subject', body: `<p>Delete ${s.title} (${s.code})?</p><p class="text-danger">This cannot be undone.</p>`, primaryText: 'Delete', primaryClass: 'btn-danger', primaryAction: () => { subjects = subjects.filter(x => x.code !== code); save(subjects); render(); showToast('Deleted'); modal.close(); } }); modal.show(); }

  function editSubject(code) { const s = subjects.find(x => x.code === code); if (s) showModal(s); }

  function openCurriculum(code) {
    const subject = subjects.find(x => x.code === code);
    if (!subject) { showToast('Subject not found'); return; }
    subject.curriculum = subject.curriculum || [];

    const modal = createModal({ title: `Curriculum — ${subject.title}`, body: `<div id="currContainer"></div>`, primaryText: 'Close', onShow: (modalEl) => {
      const container = modalEl.querySelector('#currContainer');
      function renderCurr() {
        container.innerHTML = '';
        const form = document.createElement('form'); form.className = 'form-grid';
        form.innerHTML = `
          <div class="form-group"><label>Topic ID</label><input name="topicId" required></div>
          <div class="form-group"><label>Topic Title</label><input name="topicTitle" required></div>
          <div class="form-group"><label>Notes</label><input name="notes"></div>
          <div class="form-group"><label></label><button class="btn btn-primary" type="submit">Add Topic</button></div>
        `;
        container.appendChild(form);
        const list = document.createElement('div'); list.style.marginTop = '1rem'; if (!subject.curriculum.length) list.innerHTML = '<p class="muted">No topics yet.</p>';
        const table = document.createElement('table'); table.className = 'data-table'; table.style.marginTop = '0.5rem'; const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>ID</th><th>Topic</th><th>Notes</th><th>Actions</th></tr>'; table.appendChild(thead);
        const tbody = document.createElement('tbody'); subject.curriculum.forEach(t => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${t.topicId}</td><td>${t.topicTitle}</td><td>${t.notes || '-'}</td><td><button class="btn-icon edit-top" data-id="${t.topicId}"><i class="fas fa-edit"></i></button> <button class="btn-icon del-top" data-id="${t.topicId}"><i class="fas fa-trash-alt"></i></button></td>`; tbody.appendChild(tr); }); table.appendChild(tbody); if (subject.curriculum.length) container.appendChild(table); container.appendChild(list);

        form.addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(form); const topic = Object.fromEntries(fd); if (!topic.topicId || !topic.topicTitle) { showToast('Provide Topic ID and Title'); return; } if (subject.curriculum.some(x => x.topicId === topic.topicId)) { showToast('Topic ID exists'); return; } subject.curriculum.push(topic); save(subjects); showToast('Topic added'); renderCurr(); });

        container.querySelectorAll('.edit-top').forEach(btn => btn.addEventListener('click', () => { const id = btn.dataset.id; const t = subject.curriculum.find(x => x.topicId === id); if (!t) return; const title = prompt('Topic title', t.topicTitle) || t.topicTitle; const notes = prompt('Notes', t.notes || '') || t.notes; t.topicTitle = title; t.notes = notes; save(subjects); showToast('Topic updated'); renderCurr(); }));
        container.querySelectorAll('.del-top').forEach(btn => btn.addEventListener('click', () => { const id = btn.dataset.id; if (!confirm('Delete topic?')) return; subject.curriculum = subject.curriculum.filter(x => x.topicId !== id); save(subjects); showToast('Topic deleted'); renderCurr(); }));
      }
      renderCurr();
    } });
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
  semFilter.addEventListener('change', (e) => { filters.semester = e.target.value; render(); });

  render();
});
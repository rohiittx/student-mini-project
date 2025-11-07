document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'hod_faculty_v1';
  const DEFAULT_FACULTY = [
    { id: 'F01', name: 'Dr. A Kumar', department: 'Electrical', designation: 'Professor', email: 'akumar@example.com', phone: '9876500001' },
    { id: 'F02', name: 'Dr. S Rao', department: 'Electronics', designation: 'Assistant Professor', email: 'srao@example.com', phone: '9876500002' }
  ];

  const facultyListEl = document.getElementById('facultyList');
  const noFaculty = document.getElementById('noFaculty');
  const addBtn = document.getElementById('addFacultyBtn');
  const searchInput = document.getElementById('searchFaculty');
  const deptFilter = document.getElementById('deptFilter');
  const desigFilter = document.getElementById('designationFilter');
  const template = document.getElementById('facultyModalTemplate');

  let faculty = load();
  let filters = { search: '', department: '', designation: '' };

  function getToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    return c;
  }
  function showToast(text, t = 2000) {
    const c = getToastContainer();
    const node = document.createElement('div'); node.className = 'toast'; node.textContent = text; c.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 300); }, t);
  }

  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : DEFAULT_FACULTY; } catch (e) { console.error(e); return DEFAULT_FACULTY; }
  }
  function save(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error(e); showToast('Save failed', 2000); } }

  function filterItems(list) {
    return list.filter(f => {
      const matchSearch = !filters.search || f.name.toLowerCase().includes(filters.search.toLowerCase()) || f.id.toLowerCase().includes(filters.search.toLowerCase()) || f.email.toLowerCase().includes(filters.search.toLowerCase());
      const matchDept = !filters.department || f.department === filters.department;
      const matchDesig = !filters.designation || f.designation === filters.designation;
      return matchSearch && matchDept && matchDesig;
    });
  }

  function render() {
    const data = filterItems(faculty);
    facultyListEl.innerHTML = '';
    if (!data.length) { noFaculty.style.display = 'block'; document.getElementById('facultyTable').style.display = 'none'; return; }
    noFaculty.style.display = 'none'; document.getElementById('facultyTable').style.display = 'table';

    data.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${f.id}</td>
        <td>${f.name}</td>
        <td>${f.department}</td>
        <td>${f.designation}</td>
        <td>${f.email}</td>
        <td>${f.phone || '-'}</td>
        <td>
          <button class="btn-icon edit" data-id="${f.id}" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete" data-id="${f.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      facultyListEl.appendChild(tr);
    });

    facultyListEl.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => editFaculty(b.dataset.id)));
    facultyListEl.querySelectorAll('.delete').forEach(b => b.addEventListener('click', () => deleteFaculty(b.dataset.id)));
  }

  function showModal(item = null) {
    const isEdit = !!item;
    const modal = createModal({
      title: isEdit ? 'Edit Faculty' : 'Add Faculty',
      body: template.innerHTML,
      primaryText: isEdit ? 'Save Changes' : 'Add Faculty',
      onShow: (modalEl) => {
        const form = modalEl.querySelector('#facultyForm');
        // set id attributes inside because template uses generic ids
        // there is no id conflict as it's inside modal
        if (isEdit) Object.keys(item).forEach(k => { const inp = form.elements[k]; if (inp) inp.value = item[k]; });

        form.addEventListener('submit', (e) => {
          e.preventDefault(); e.stopPropagation();
          // simple validation
          const elems = Array.from(form.elements).filter(el => el.name);
          for (const el of elems) { if (el.required && !el.value.trim()) { showToast('Please fill required fields'); return; } }

          const fd = new FormData(form); const data = Object.fromEntries(fd);

          if (isEdit) {
            faculty = faculty.map(f => f.id === item.id ? data : f);
            showToast('Faculty updated');
          } else {
            if (faculty.some(f => f.id === data.id)) { showToast('ID already exists'); return; }
            faculty.push(data); showToast('Faculty added');
          }
          save(faculty); render(); modal.close();
        });
      }
    });
    modal.show();
  }

  function deleteFaculty(id) {
    const f = faculty.find(x => x.id === id); if (!f) return;
    const modal = createModal({ title: 'Delete Faculty', body: `<p>Delete ${f.name} (${f.id})?</p><p class="text-danger">This cannot be undone.</p>`, primaryText: 'Delete', primaryClass: 'btn-danger', primaryAction: () => { faculty = faculty.filter(x => x.id !== id); save(faculty); render(); showToast('Deleted'); modal.close(); } });
    modal.show();
  }

  function editFaculty(id) { const f = faculty.find(x => x.id === id); if (f) showModal(f); }

  function createModal({ title = '', body = '', primaryText = 'OK', primaryAction = null, primaryClass = 'btn-primary', secondaryText = 'Cancel', onShow = null }) {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const modal = document.createElement('div'); modal.className = 'modal';
    modal.innerHTML = `<div class="modal-header"><h3>${title}</h3></div><div class="modal-body">${body}</div><div class="modal-actions"><button class="btn btn-secondary" data-action="cancel">${secondaryText}</button><button class="btn ${primaryClass}" data-action="primary">${primaryText}</button></div>`;
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
    modal.querySelector('[data-action="cancel"]').addEventListener('click', close);
    const primaryBtn = modal.querySelector('[data-action="primary"]');
    primaryBtn.addEventListener('click', () => {
      const form = modal.querySelector('form');
      if (form) { const ev = new Event('submit', { cancelable: true }); form.dispatchEvent(ev); }
      else if (primaryAction) primaryAction(); else close();
    });
    overlay.appendChild(modal); document.body.appendChild(overlay);
    if (onShow) onShow(modal);
    requestAnimationFrame(() => overlay.classList.add('show'));
    return { close, modal };
  }

  // attach events
  addBtn.addEventListener('click', () => showModal());
  searchInput.addEventListener('input', (e) => { filters.search = e.target.value; render(); });
  deptFilter.addEventListener('change', (e) => { filters.department = e.target.value; render(); });
  desigFilter.addEventListener('change', (e) => { filters.designation = e.target.value; render(); });

  // initial render
  render();
});
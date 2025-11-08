document.addEventListener('DOMContentLoaded', () => {
    // Constants
    const STORAGE_KEY = 'hod_students_v1';
    const DEFAULT_STUDENTS = [
        { rollNo: '101', name: 'John Doe', batch: '2024', semester: '5', email: 'john@example.com', phone: '9876543210' },
        { rollNo: '102', name: 'Jane Smith', batch: '2024', semester: '5', email: 'jane@example.com', phone: '9876543211' }
    ];

    // Cache DOM elements
    const studentsTable = document.getElementById('studentsTable');
    const studentsList = document.getElementById('studentsList');
    const noStudents = document.getElementById('noStudents');
    const addStudentBtn = document.getElementById('addStudentBtn');
    const searchInput = document.getElementById('searchStudent');
    const batchFilter = document.getElementById('batchFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    const studentModalTemplate = document.getElementById('studentModalTemplate');

    // State management
    let students = loadStudents();
    let filters = {
        search: '',
        batch: '',
        semester: ''
    };

    // Populate batch filter from batches storage
    function populateBatchFilter() {
        try {
            const raw = localStorage.getItem('hod_batches_v1');
            const batches = raw ? JSON.parse(raw) : [];
            // clear existing
            if (batchFilter) {
                batchFilter.innerHTML = '<option value="">All Batches</option>';
                if (batches.length) {
                    const years = new Set();
                    batches.forEach(b => {
                        years.add(b.year || b.id || b.name);
                    });
                    Array.from(years).sort().forEach(y => {
                        const opt = document.createElement('option'); opt.value = y; opt.textContent = y; batchFilter.appendChild(opt);
                    });
                } else {
                    ['2025','2024','2023'].forEach(y => {
                        const opt = document.createElement('option'); opt.value = y; opt.textContent = y; batchFilter.appendChild(opt);
                    });
                }
            }
        } catch (e) { console.error('populateBatchFilter failed', e); }
    }

    // Listen for updates from batches page
    window.addEventListener('batchesUpdated', () => {
        populateBatchFilter();
        showToast('Batch list updated');
    });

    // Initialize toast container (reuse from main dashboard if exists)
    function getToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, type = 'info') {
        const container = getToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Load students from localStorage
    function loadStudents() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_STUDENTS;
        } catch (e) {
            console.error('Failed to load students:', e);
            return DEFAULT_STUDENTS;
        }
    }

    // Save students to localStorage
    function saveStudents(students) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
        } catch (e) {
            console.error('Failed to save students:', e);
            showToast('Failed to save changes', 'error');
        }
    }

    // Filter students based on current filters
    function filterStudents(students) {
        return students.filter(student => {
            const matchesSearch = !filters.search || 
                student.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                student.rollNo.includes(filters.search) ||
                student.email.toLowerCase().includes(filters.search.toLowerCase());
            
            const matchesBatch = !filters.batch || student.batch === filters.batch;
            const matchesSemester = !filters.semester || student.semester === filters.semester;

            return matchesSearch && matchesBatch && matchesSemester;
        });
    }

    // Render students table
    function renderStudents() {
        const filtered = filterStudents(students);
        studentsList.innerHTML = '';

        if (filtered.length === 0) {
            noStudents.style.display = 'block';
            studentsTable.style.display = 'none';
            return;
        }

        noStudents.style.display = 'none';
        studentsTable.style.display = 'table';

        filtered.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.rollNo}</td>
                <td>${student.name}</td>
                <td>${student.batch}</td>
                <td>Semester ${student.semester}</td>
                <td>${student.email}</td>
                <td>${student.phone || '-'}</td>
                <td>
                    <button class="btn-icon edit" title="Edit" data-roll="${student.rollNo}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" title="Delete" data-roll="${student.rollNo}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            studentsList.appendChild(row);
        });

        // Attach event listeners to new buttons
        studentsList.querySelectorAll('.edit').forEach(btn => {
            btn.addEventListener('click', () => editStudent(btn.dataset.roll));
        });
        studentsList.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', () => deleteStudent(btn.dataset.roll));
        });
    }

    // Create/Edit student modal
    function showStudentModal(student = null) {
        const isEdit = !!student;
        const modal = createModal({
            title: isEdit ? 'Edit Student' : 'Add New Student',
            body: studentModalTemplate.innerHTML,
            primaryText: isEdit ? 'Save Changes' : 'Add Student',
            onShow: (modalEl) => {
                // Get and enhance form
                const form = modalEl.querySelector('#studentForm');
                // Populate batch dropdown dynamically from batches storage
                try {
                    const batchSelect = form.elements['batch'];
                    if (batchSelect) {
                        // clear existing options
                        batchSelect.innerHTML = '<option value="">Select Batch</option>';
                        const raw = localStorage.getItem('hod_batches_v1');
                        const batches = raw ? JSON.parse(raw) : [];
                        // if no batches, provide years fallback
                        if (!batches.length) {
                            ['2025','2024','2023'].forEach(y => {
                                const opt = document.createElement('option'); opt.value = y; opt.textContent = y; batchSelect.appendChild(opt);
                            });
                        } else {
                            batches.forEach(b => {
                                const opt = document.createElement('option');
                                // value: batch id, label: Name (Year)
                                opt.value = b.id || b.year || b.name;
                                opt.textContent = `${b.name || b.id} (${b.year || ''})`;
                                batchSelect.appendChild(opt);
                            });
                        }
                    }
                } catch (err) {
                    console.error('Failed to populate batch list', err);
                }
                // Set form attributes for proper submission
                form.setAttribute('novalidate', 'true'); // We'll handle validation in JS
                if (isEdit) {
                    // Fill form with student data
                    Object.keys(student).forEach(key => {
                        const input = form.elements[key];
                        if (input) input.value = student[key];
                    });
                }

                // Form submission
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling

                    // Check form validity
                    const isValid = Array.from(form.elements).every(element => {
                        if (element.hasAttribute('required') && !element.value.trim()) {
                            element.classList.add('invalid');
                            return false;
                        }
                        return true;
                    });

                    if (!isValid) {
                        showToast('Please fill in all required fields', 'error');
                        return;
                    }

                    const formData = new FormData(form);
                    const studentData = Object.fromEntries(formData);

                    if (isEdit) {
                        // Update existing student
                        students = students.map(s => 
                            s.rollNo === student.rollNo ? studentData : s
                        );
                        showToast('Student updated successfully');
                    } else {
                        // Check if roll number exists
                        if (students.some(s => s.rollNo === studentData.rollNo)) {
                            showToast('Roll number already exists', 'error');
                            return;
                        }
                        // Add new student
                        students.push(studentData);
                        showToast('New student added successfully');
                    }

                    saveStudents(students);
                    renderStudents();
                    modal.close();
                });
            }
        });
        modal.show();
    }

    // Delete student
    function deleteStudent(rollNo) {
        const student = students.find(s => s.rollNo === rollNo);
        if (!student) return;

        const modal = createModal({
            title: 'Delete Student',
            body: `<p>Are you sure you want to delete ${student.name} (Roll No: ${student.rollNo})?</p>
                   <p class="text-danger">This action cannot be undone.</p>`,
            primaryText: 'Delete',
            primaryClass: 'btn-danger',
            primaryAction: () => {
                students = students.filter(s => s.rollNo !== rollNo);
                saveStudents(students);
                renderStudents();
                showToast('Student deleted successfully');
                modal.close();
            }
        });
        modal.show();
    }

    // Edit student
    function editStudent(rollNo) {
        const student = students.find(s => s.rollNo === rollNo);
        if (student) showStudentModal(student);
    }

    // Modal factory (simplified version of dashboard's modal)
    function createModal({ title, body, primaryText, primaryAction = null, primaryClass = 'btn-primary', secondaryText = 'Cancel', onShow = null }) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
            </div>
            <div class="modal-body">${body}</div>
            <div class="modal-actions">
                <button class="btn btn-secondary" data-action="cancel">${secondaryText}</button>
                <button class="btn ${primaryClass}" data-action="primary">${primaryText}</button>
            </div>
        `;

        const close = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 200);
        };

        // Event listeners
        modal.querySelector('[data-action="cancel"]').addEventListener('click', close);
        const primaryBtn = modal.querySelector('[data-action="primary"]');
        primaryBtn.addEventListener('click', (e) => {
            const form = modal.querySelector('#studentForm');
            if (form) {
                // Trigger form submission which will handle the data
                const submitEvent = new Event('submit', { cancelable: true });
                form.dispatchEvent(submitEvent);
            } else if (primaryAction) {
                primaryAction();
            } else {
                close();
            }
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        if (onShow) onShow(modal);
        
        // Show with animation
        requestAnimationFrame(() => overlay.classList.add('show'));

        return { close, modal };
    }

    // Event listeners
    addStudentBtn.addEventListener('click', () => showStudentModal());

    searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value;
        renderStudents();
    });

    batchFilter.addEventListener('change', (e) => {
        filters.batch = e.target.value;
        renderStudents();
    });

    semesterFilter.addEventListener('change', (e) => {
        filters.semester = e.target.value;
        renderStudents();
    });

    // Initial render
    populateBatchFilter();
    renderStudents();
});
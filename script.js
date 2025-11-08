/* Pure JS enhancements: accessible modals, toast, keyboard support, and animated stats */
document.addEventListener('DOMContentLoaded', () => {
    const managementCards = document.querySelectorAll('.management-card');

    // enhance cards for keyboard & accessibility
    managementCards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', 'false');
        card.addEventListener('click', () => openSection(card));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openSection(card);
            }
        });
    });

    const logoutBtn = document.querySelector('.logout-btn');
    logoutBtn.addEventListener('click', () => {
        showConfirm('Logout', 'Are you sure you want to logout?', () => {
            showToast('Logged out');
            // simulate logout action - in real app redirect or clear session
        });
    });

    // stats counter animation when visible
    const statEls = document.querySelectorAll('.stat-number');
    const statObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, {threshold: 0.3});

    statEls.forEach(el => {
        el.style.opacity = 0;
        el.style.transform = 'translateY(10px)';
        el.style.transition = 'opacity 400ms ease, transform 400ms ease';
        statObserver.observe(el);
    });

    // create toast container
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    // helper: open section modal
    function openSection(card) {
        const sectionKey = card.getAttribute('data-section') || '';
        // Direct navigation for managed pages
        if (sectionKey.toLowerCase() === 'timetable') {
            try {
                window.location.assign('./timetable.html');
            } catch (e) {
                window.location.href = 'timetable.html';
            }
            return;
        }
        if (sectionKey.toLowerCase() === 'students') {
            try {
                window.location.assign('./students.html');
            } catch (e) {
                window.location.href = 'students.html';
            }
            return;
        }
        if (sectionKey.toLowerCase() === 'faculty') {
            try {
                window.location.assign('./faculty.html');
            } catch (e) {
                window.location.href = 'faculty.html';
            }
            return;
        }
        if (sectionKey.toLowerCase() === 'batches' || sectionKey.toLowerCase() === 'batch' ) {
            try {
                window.location.assign('./batches.html');
            } catch (e) {
                window.location.href = 'batches.html';
            }
            return;
        }
        if (sectionKey.toLowerCase() === 'subjects' || sectionKey.toLowerCase() === 'subject') {
            try {
                window.location.assign('./subjects.html');
            } catch (e) {
                window.location.href = 'subjects.html';
            }
            return;
        }

        const title = card.querySelector('h3')?.innerText || 'Section';
        const desc = card.querySelector('p')?.innerText || '';
        const modal = createModal({
            title: title,
            body: `<p>${desc}</p>`,
            primaryText: 'Open',
            primaryAction: () => {
                modal.close();
                showToast(`${title} opened`);
            }
        });
        modal.show();
    }

    // create a confirm modal
    function showConfirm(title, message, onConfirm) {
        const modal = createModal({
            title: title,
            body: `<p>${message}</p>`,
            primaryText: 'Yes',
            primaryAction: () => { modal.close(); if (typeof onConfirm === 'function') onConfirm(); },
            secondaryText: 'No'
        });
        modal.show();
    }

    // toast helper
    function showToast(text, timeout = 2200) {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = text;
        toastContainer.appendChild(t);
        // trigger show
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 300);
        }, timeout);
    }

    // animate count from 0 to target
    function animateCount(el) {
        const raw = el.innerText.trim();
        const target = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
        const duration = 900;
        const start = performance.now();
        const startValue = 0;

        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const value = Math.floor(startValue + (target - startValue) * easeOutCubic(progress));
            el.textContent = value;
            el.style.opacity = 1;
            el.style.transform = 'translateY(0)';
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target;
        }
        requestAnimationFrame(step);
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    // Modal factory
    function createModal({title = '', body = '', primaryText = 'OK', primaryAction = null, secondaryText = 'Close'}) {
        let previouslyFocused = document.activeElement;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.tabIndex = -1;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        const header = document.createElement('div');
        header.className = 'modal-header';
        const h = document.createElement('h3');
        h.id = `modal-title-${Date.now()}`;
        h.innerText = title;
        header.appendChild(h);

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'modal-body';
        bodyDiv.id = `modal-body-${Date.now()}`;
        bodyDiv.innerHTML = body;

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const btnSecondary = document.createElement('button');
        btnSecondary.className = 'btn btn-secondary';
        btnSecondary.innerText = secondaryText;
        btnSecondary.addEventListener('click', close);

        const btnPrimary = document.createElement('button');
        btnPrimary.className = 'btn btn-primary';
        btnPrimary.innerText = primaryText;
        btnPrimary.addEventListener('click', () => {
            if (typeof primaryAction === 'function') primaryAction();
            else close();
        });

        actions.appendChild(btnSecondary);
        actions.appendChild(btnPrimary);

        modal.appendChild(header);
        modal.appendChild(bodyDiv);
        modal.appendChild(actions);
        overlay.appendChild(modal);

        function show() {
            document.body.appendChild(overlay);
            // allow CSS transition
            requestAnimationFrame(() => overlay.classList.add('show'));
            // focus management
            btnPrimary.focus();
            document.addEventListener('keydown', onKeyDown);
            overlay.addEventListener('click', onOverlayClick);
        }

        function close() {
            overlay.classList.remove('show');
            // remove after transition
            setTimeout(() => overlay.remove(), 220);
            document.removeEventListener('keydown', onKeyDown);
            overlay.removeEventListener('click', onOverlayClick);
            if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        }

        function onKeyDown(e) {
            if (e.key === 'Escape') close();
        }

        function onOverlayClick(e) {
            if (e.target === overlay) close();
        }

        return { show, close };
    }
});

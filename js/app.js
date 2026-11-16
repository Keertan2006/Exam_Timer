/**
 * app.js
 * Main UI Controller, View Router, Event Handling, and Notifications.
 */

class ExamTimerApp {
  constructor() {
    this.storage = window.storageService;
    this.timetable = window.timetableService;
    this.timer = window.examTimerEngine;

    this.currentView = 'setup';
    this.settings = this.storage.loadSettings();
    this.audioContext = null;

    this.initElements();
    this.bindEvents();
    this.initNotifications();
    this.startLiveClock();
    this.bootstrap();
  }

  /* --------------------------------------------------------------------------
     Initialization
     -------------------------------------------------------------------------- */
  initElements() {
    // Views
    this.viewSetup = document.getElementById('view-setup');
    this.viewDashboard = document.getElementById('view-dashboard');
    this.viewPomodoro = document.getElementById('view-pomodoro');

    // Header elements
    this.brandLogo = document.getElementById('brand-logo');
    this.liveClockText = document.getElementById('live-clock-text');
    this.btnToggleNotifications = document.getElementById('btn-toggle-notifications');
    this.notificationBtnLabel = document.getElementById('notification-btn-label');
    this.btnHeaderPomodoro = document.getElementById('btn-header-pomodoro');
    this.btnHeaderReset = document.getElementById('btn-header-reset');

    // Setup view elements
    this.btnSetupBack = document.getElementById('btn-setup-back');
    this.btnFillSample = document.getElementById('btn-fill-sample');
    this.customSubjectCountInput = document.getElementById('custom-subject-count');
    this.countPillsContainer = document.querySelector('.count-pills');
    this.subjectsFormContainer = document.getElementById('subjects-form-container');
    this.btnAddSubjectRow = document.getElementById('btn-add-subject-row');
    this.btnSetupCancel = document.getElementById('btn-setup-cancel');
    this.timetableSetupForm = document.getElementById('timetable-setup-form');
    this.setupErrorsBox = document.getElementById('setup-errors-box');
    this.setupErrorsList = document.getElementById('setup-errors-list');

    // Dashboard Countdown Elements
    this.heroCountdownCard = document.getElementById('hero-countdown-card');
    this.heroStatusBadge = document.getElementById('hero-status-badge');
    this.heroStatusText = document.getElementById('hero-status-text');
    this.heroSubjectIndex = document.getElementById('hero-subject-index');
    this.heroSubjectName = document.getElementById('hero-subject-name');
    this.heroExamDate = document.getElementById('hero-exam-date');
    this.heroExamTime = document.getElementById('hero-exam-time');
    this.heroExamDuration = document.getElementById('hero-exam-duration');
    this.timerDaysBlock = document.getElementById('timer-days-block');
    this.timerDaysColon = document.getElementById('timer-days-colon');
    this.timerDays = document.getElementById('timer-days');
    this.timerHours = document.getElementById('timer-hours');
    this.timerMinutes = document.getElementById('timer-minutes');
    this.timerSeconds = document.getElementById('timer-seconds');
    this.heroCountdownSubtext = document.getElementById('hero-countdown-subtext');

    // All Completed Hero
    this.heroAllCompletedCard = document.getElementById('hero-all-completed-card');
    this.btnCompletedNewTimetable = document.getElementById('btn-completed-new-timetable');

    // Progress bar
    this.progressStatsText = document.getElementById('progress-stats-text');
    this.progressFillBar = document.getElementById('progress-fill-bar');

    // Next Exam Preview
    this.nextExamPreviewBox = document.getElementById('next-exam-preview-box');
    this.nextExamName = document.getElementById('next-exam-name');
    this.nextExamTime = document.getElementById('next-exam-time');
    this.noNextExamMessage = document.getElementById('no-next-exam-message');

    // Metrics
    this.metricRemaining = document.getElementById('metric-remaining');
    this.metricCompleted = document.getElementById('metric-completed');
    this.metricTotal = document.getElementById('metric-total');

    // Timetable List
    this.dashboardTimetableList = document.getElementById('dashboard-timetable-list');
    this.btnDashboardAddSubject = document.getElementById('btn-dashboard-add-subject');
    this.btnDashboardEditAll = document.getElementById('btn-dashboard-edit-all');

    // Modals
    this.modalEditSubject = document.getElementById('modal-edit-subject');
    this.editSubjectForm = document.getElementById('edit-subject-form');
    this.editSubjectId = document.getElementById('edit-subject-id');
    this.editSubjectName = document.getElementById('edit-subject-name');
    this.editSubjectDate = document.getElementById('edit-subject-date');
    this.editSubjectStart = document.getElementById('edit-subject-start');
    this.editSubjectEnd = document.getElementById('edit-subject-end');
    this.modalEditErrors = document.getElementById('modal-edit-errors');
    this.modalEditErrorsList = document.getElementById('modal-edit-errors-list');
    this.btnCloseEditModal = document.getElementById('btn-close-edit-modal');
    this.btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');

    this.modalAddSubject = document.getElementById('modal-add-subject');
    this.addSubjectForm = document.getElementById('add-subject-form');
    this.addModalName = document.getElementById('add-modal-name');
    this.addModalDate = document.getElementById('add-modal-date');
    this.addModalStart = document.getElementById('add-modal-start');
    this.addModalEnd = document.getElementById('add-modal-end');
    this.modalAddErrors = document.getElementById('modal-add-errors');
    this.modalAddErrorsList = document.getElementById('modal-add-errors-list');
    this.btnCloseAddModal = document.getElementById('btn-close-add-modal');
    this.btnCancelAddModal = document.getElementById('btn-cancel-add-modal');

    this.modalResetConfirm = document.getElementById('modal-reset-confirm');
    this.btnCloseResetModal = document.getElementById('btn-close-reset-modal');
    this.btnCancelResetModal = document.getElementById('btn-cancel-reset-modal');
    this.btnConfirmResetModal = document.getElementById('btn-confirm-reset-modal');

    // Pomodoro page back button
    this.btnPomodoroBack = document.getElementById('btn-pomodoro-back');

    // Toast Container
    this.toastContainer = document.getElementById('toast-container');
  }

  bootstrap() {
    // 1. Subscribe timer ticks and state transitions FIRST
    this.timer.subscribe((state) => this.renderDashboard(state));
    this.timer.onTransition((event) => this.handleStateTransition(event));

    // 2. Load timetable from storage
    const storedSubjects = this.storage.loadTimetable();
    if (storedSubjects && storedSubjects.length > 0) {
      this.timetable.init(storedSubjects);
      const validSubjects = this.timetable.getSubjects();
      if (validSubjects.length > 0) {
        this.timer.setSubjects(validSubjects);
        this.timer.start();
        this.switchView('dashboard');
        return;
      }
    }

    // 3. Fallback to setup view if no subjects exist
    this.renderSetupForm(3);
    this.switchView('setup');
  }

  bindEvents() {
    // Brand navigation
    this.brandLogo.addEventListener('click', () => {
      const subjects = this.timetable.getSubjects();
      if (subjects.length > 0) {
        this.switchView('dashboard');
      } else {
        this.switchView('setup');
      }
    });

    // Setup view actions
    this.btnSetupBack.addEventListener('click', () => {
      const subjects = this.timetable.getSubjects();
      if (subjects.length > 0) {
        this.switchView('dashboard');
      }
    });

    this.btnSetupCancel.addEventListener('click', () => {
      const subjects = this.timetable.getSubjects();
      if (subjects.length > 0) {
        this.switchView('dashboard');
      }
    });

    this.btnFillSample.addEventListener('click', () => {
      this.fillSampleIntoSetupForm();
    });

    // Subject count buttons
    this.countPillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.count-pill');
      if (pill) {
        const count = parseInt(pill.dataset.count, 10);
        this.updateActiveCountPill(count);
        this.resizeSetupForm(count);
      }
    });

    this.customSubjectCountInput.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 25) val = 25;
      e.target.value = val;
      this.updateActiveCountPill(null);
      this.resizeSetupForm(val);
    });

    this.btnAddSubjectRow.addEventListener('click', () => {
      this.addSubjectRowToSetupForm();
    });

    this.timetableSetupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSetupFormSubmit();
    });

    // Dashboard actions
    this.btnDashboardAddSubject.addEventListener('click', () => {
      this.openAddModal();
    });

    this.btnDashboardEditAll.addEventListener('click', () => {
      this.populateSetupWithCurrentTimetable();
      this.switchView('setup');
    });

    this.btnCompletedNewTimetable.addEventListener('click', () => {
      this.openResetModal();
    });

    this.btnHeaderReset.addEventListener('click', () => {
      this.openResetModal();
    });

    // Modals
    this.editSubjectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditSubjectSubmit();
    });

    this.btnCloseEditModal.addEventListener('click', () => this.closeModal(this.modalEditSubject));
    this.btnCancelEditModal.addEventListener('click', () => this.closeModal(this.modalEditSubject));

    this.addSubjectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddSubjectSubmit();
    });

    this.btnCloseAddModal.addEventListener('click', () => this.closeModal(this.modalAddSubject));
    this.btnCancelAddModal.addEventListener('click', () => this.closeModal(this.modalAddSubject));

    this.btnCloseResetModal.addEventListener('click', () => this.closeModal(this.modalResetConfirm));
    this.btnCancelResetModal.addEventListener('click', () => this.closeModal(this.modalResetConfirm));
    this.btnConfirmResetModal.addEventListener('click', () => this.handleConfirmReset());

    // Pomodoro navigation
    if (this.btnHeaderPomodoro) {
      this.btnHeaderPomodoro.addEventListener('click', () => {
        if (this.currentView === 'pomodoro') {
          const subjects = this.timetable.getSubjects();
          this.switchView(subjects.length > 0 ? 'dashboard' : 'setup');
        } else {
          this.switchView('pomodoro');
        }
      });
    }

    if (this.btnPomodoroBack) {
      this.btnPomodoroBack.addEventListener('click', () => {
        const subjects = this.timetable.getSubjects();
        this.switchView(subjects.length > 0 ? 'dashboard' : 'setup');
      });
    }

    // Notifications toggle
    this.btnToggleNotifications.addEventListener('click', () => {
      this.toggleNotifications();
    });

    // Copy Timetable to Clipboard
    const copyBtn = document.getElementById('btn-copy-timetable');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const subjects = this.timetable.getSubjects();
        if (subjects.length === 0) return;
        let text = 'EXAMINATION TIMETABLE\n\n';
        subjects.forEach((s, idx) => {
          text += `${idx + 1}. ${s.name}\n   Date: ${this.timetable.formatDate(s.date)}\n   Time: ${this.timetable.formatTime(s.startTime)} – ${this.timetable.formatTime(s.endTime)} (${this.timetable.formatDuration(s.startMs, s.endMs)})\n\n`;
        });
        navigator.clipboard.writeText(text.trim()).then(() => {
          this.showToast('Timetable copied to clipboard.');
        }).catch(() => {
          this.showToast('Unable to copy to clipboard.');
        });
      });
    }

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal-backdrop.active');
        activeModals.forEach(m => this.closeModal(m));
      }
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     View Routing
     -------------------------------------------------------------------------- */
  switchView(viewName) {
    const subjects = this.timetable.getSubjects();

    // Prevent displaying empty dashboard if no subjects exist
    if (viewName === 'dashboard' && subjects.length === 0) {
      viewName = 'setup';
    }

    this.currentView = viewName;
    const views = [this.viewSetup, this.viewDashboard, this.viewPomodoro].filter(Boolean);
    views.forEach(v => v.classList.remove('active'));

    // Highlight Pomodoro button in header when on Pomodoro page
    if (this.btnHeaderPomodoro) {
      if (viewName === 'pomodoro') {
        this.btnHeaderPomodoro.classList.remove('btn-secondary');
        this.btnHeaderPomodoro.classList.add('btn-primary');
      } else {
        this.btnHeaderPomodoro.classList.remove('btn-primary');
        this.btnHeaderPomodoro.classList.add('btn-secondary');
      }
    }

    if (viewName === 'setup') {
      this.viewSetup.classList.add('active');
      this.btnHeaderReset.classList.add('hidden');

      // If timetable already exists, allow going back or cancelling to dashboard
      if (subjects.length > 0) {
        this.btnSetupBack.classList.remove('hidden');
        this.btnSetupCancel.classList.remove('hidden');
      } else {
        this.btnSetupBack.classList.add('hidden');
        this.btnSetupCancel.classList.add('hidden');
      }
    } else if (viewName === 'dashboard') {
      this.viewDashboard.classList.add('active');
      this.btnHeaderReset.classList.remove('hidden');
      // Trigger instant evaluation & render
      this.timer.evaluate();
    } else if (viewName === 'pomodoro') {
      if (this.viewPomodoro) {
        this.viewPomodoro.classList.add('active');
      }
      this.btnHeaderReset.classList.add('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* --------------------------------------------------------------------------
     Live Clock
     -------------------------------------------------------------------------- */
  startLiveClock() {
    const update = () => {
      const now = new Date();
      const options = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      };
      const datePart = now.toLocaleDateString(undefined, options);
      const timePart = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      this.liveClockText.textContent = `${datePart} · ${timePart}`;
    };
    update();
    setInterval(update, 1000);
  }

  /* --------------------------------------------------------------------------
     Setup Form Dynamic Generation
     -------------------------------------------------------------------------- */
  split12h(timeStr) {
    if (!timeStr) return { time: '10:30', period: 'AM' };
    const formatted = this.timetable.formatTime(timeStr);
    const parts = formatted.split(' ');
    return {
      time: parts[0] || '10:30',
      period: (parts[1] || 'AM').toUpperCase()
    };
  }

  renderSetupForm(count = 3, initialData = null) {
    this.subjectsFormContainer.innerHTML = '';
    this.hideSetupErrors();

    const currentCount = Math.max(1, count);
    this.updateActiveCountPill(currentCount);

    for (let i = 0; i < currentCount; i++) {
      const defaultData = (initialData && initialData[i]) || {
        name: '',
        date: '',
        startTime: '10:30 AM',
        endTime: '12:30 PM'
      };
      this.appendSubjectCard(i + 1, defaultData);
    }
  }

  appendSubjectCard(index, data = { name: '', date: '', startTime: '10:30 AM', endTime: '12:30 PM' }) {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.dataset.index = index;

    const startObj = this.split12h(data.startTime || '10:30 AM');
    const endObj = this.split12h(data.endTime || '12:30 PM');

    card.innerHTML = `
      <div class="subject-card-header">
        <span class="subject-card-badge">SUBJECT ${String(index).padStart(2, '0')}</span>
        <button type="button" class="btn btn-ghost btn-sm btn-remove-subject" title="Remove Subject">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Remove
        </button>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Subject Name</label>
          <input type="text" class="form-input input-subject-name" required placeholder="e.g. Computational Theory" value="${this.escapeHtml(data.name || '')}">
        </div>

        <div class="form-group">
          <label class="form-label">Exam Date</label>
          <input type="date" class="form-input input-subject-date" required value="${data.date || ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Start Time</label>
          <div class="time-picker-12h">
            <input type="text" class="form-input input-time-val input-subject-start-val" required placeholder="10:30" maxlength="5" value="${startObj.time}">
            <select class="form-select input-subject-start-period" aria-label="Start time AM or PM">
              <option value="AM" ${startObj.period === 'AM' ? 'selected' : ''}>AM</option>
              <option value="PM" ${startObj.period === 'PM' ? 'selected' : ''}>PM</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">End Time</label>
          <div class="time-picker-12h">
            <input type="text" class="form-input input-time-val input-subject-end-val" required placeholder="12:30" maxlength="5" value="${endObj.time}">
            <select class="form-select input-subject-end-period" aria-label="End time AM or PM">
              <option value="AM" ${endObj.period === 'AM' ? 'selected' : ''}>AM</option>
              <option value="PM" ${endObj.period === 'PM' ? 'selected' : ''}>PM</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Hook remove button
    const removeBtn = card.querySelector('.btn-remove-subject');
    removeBtn.addEventListener('click', () => {
      const allCards = this.subjectsFormContainer.querySelectorAll('.subject-card');
      if (allCards.length <= 1) {
        this.showToast('You must have at least one examination subject.');
        return;
      }
      card.remove();
      this.reindexSubjectCards();
    });

    this.subjectsFormContainer.appendChild(card);
  }

  reindexSubjectCards() {
    const cards = this.subjectsFormContainer.querySelectorAll('.subject-card');
    cards.forEach((card, idx) => {
      const num = idx + 1;
      card.dataset.index = num;
      const badge = card.querySelector('.subject-card-badge');
      if (badge) badge.textContent = `SUBJECT ${String(num).padStart(2, '0')}`;
    });
    this.updateActiveCountPill(cards.length);
  }

  addSubjectRowToSetupForm() {
    const cards = this.subjectsFormContainer.querySelectorAll('.subject-card');
    const newIndex = cards.length + 1;

    // Default date to next day of previous or today
    let nextDate = '';
    if (cards.length > 0) {
      const lastDateVal = cards[cards.length - 1].querySelector('.input-subject-date').value;
      if (lastDateVal) {
        const d = new Date(lastDateVal);
        d.setDate(d.getDate() + 2); // 2 days later
        nextDate = d.toISOString().split('T')[0];
      }
    }
    if (!nextDate) {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      nextDate = today.toISOString().split('T')[0];
    }

    this.appendSubjectCard(newIndex, {
      name: '',
      date: nextDate,
      startTime: '10:30 AM',
      endTime: '12:30 PM'
    });
    this.updateActiveCountPill(newIndex);
  }

  resizeSetupForm(targetCount) {
    const currentCards = Array.from(this.subjectsFormContainer.querySelectorAll('.subject-card'));
    const existingData = currentCards.map(card => {
      const startVal = card.querySelector('.input-subject-start-val')?.value.trim() || '';
      const startPeriod = card.querySelector('.input-subject-start-period')?.value || 'AM';
      const endVal = card.querySelector('.input-subject-end-val')?.value.trim() || '';
      const endPeriod = card.querySelector('.input-subject-end-period')?.value || 'PM';
      return {
        name: card.querySelector('.input-subject-name')?.value || '',
        date: card.querySelector('.input-subject-date')?.value || '',
        startTime: startVal ? `${startVal} ${startPeriod}` : '10:30 AM',
        endTime: endVal ? `${endVal} ${endPeriod}` : '12:30 PM'
      };
    });

    this.renderSetupForm(targetCount, existingData);
  }

  updateActiveCountPill(count) {
    const pills = this.countPillsContainer.querySelectorAll('.count-pill');
    pills.forEach(p => {
      if (count !== null && parseInt(p.dataset.count, 10) === count) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    if (count !== null && count > 6) {
      this.customSubjectCountInput.value = count;
    }
  }

  fillSampleIntoSetupForm() {
    const sample = this.getStandardPresetData();
    this.renderSetupForm(sample.length, sample);
    this.showToast('Sample university timetable filled.');
  }

  populateSetupWithCurrentTimetable() {
    const subjects = this.timetable.getSubjects();
    if (subjects.length > 0) {
      this.renderSetupForm(subjects.length, subjects);
    } else {
      this.renderSetupForm(3);
    }
  }

  handleSetupFormSubmit() {
    this.hideSetupErrors();

    const cards = this.subjectsFormContainer.querySelectorAll('.subject-card');
    const subjects = [];

    cards.forEach((card, idx) => {
      const name = card.querySelector('.input-subject-name').value;
      const date = card.querySelector('.input-subject-date').value;
      const startVal = (card.querySelector('.input-subject-start-val')?.value || '').trim();
      const startPeriod = card.querySelector('.input-subject-start-period')?.value || 'AM';
      const endVal = (card.querySelector('.input-subject-end-val')?.value || '').trim();
      const endPeriod = card.querySelector('.input-subject-end-period')?.value || 'PM';

      const startTime = startVal ? `${startVal} ${startPeriod}` : '';
      const endTime = endVal ? `${endVal} ${endPeriod}` : '';

      subjects.push({
        name,
        date,
        startTime,
        endTime
      });
    });

    const validation = this.timetable.validateTimetable(subjects);
    if (!validation.valid) {
      this.showSetupErrors(validation.errors);
      return;
    }

    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(w => this.showToast(w));
    }

    // Save and sort
    this.timetable.init(subjects);
    const sorted = this.timetable.getSubjects();
    this.storage.saveTimetable(sorted);

    // Start timer engine
    this.timer.setSubjects(sorted);
    this.timer.start();

    this.showToast('Timetable saved successfully! Live countdown active.');
    this.switchView('dashboard');
  }

  showSetupErrors(errors) {
    this.setupErrorsList.innerHTML = '';
    errors.forEach(err => {
      const li = document.createElement('li');
      li.textContent = err;
      this.setupErrorsList.appendChild(li);
    });
    this.setupErrorsBox.classList.add('visible');
    this.setupErrorsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  hideSetupErrors() {
    this.setupErrorsBox.classList.remove('visible');
    this.setupErrorsList.innerHTML = '';
  }

  /* --------------------------------------------------------------------------
     Dashboard Rendering Engine
     -------------------------------------------------------------------------- */
  renderDashboard(state) {
    if (this.currentView !== 'dashboard') return;

    if (!state || state.totalExams === 0) {
      this.renderSetupForm(3);
      this.switchView('setup');
      return;
    }

    // Check if ALL COMPLETED
    if (state.isCompleted) {
      this.heroCountdownCard.classList.add('hidden');
      this.heroAllCompletedCard.classList.remove('hidden');
      const completedDesc = document.getElementById('completed-desc-text');
      if (completedDesc) {
        completedDesc.textContent = `Your examination schedule is finished. All ${state.completedExams} of ${state.totalExams} scheduled examinations have concluded.`;
      }
    } else {
      this.heroCountdownCard.classList.remove('hidden');
      this.heroAllCompletedCard.classList.add('hidden');

      // Update Status Badge
      this.heroStatusText.textContent = state.state;
      if (state.state === EXAM_STATES.IN_PROGRESS) {
        this.heroStatusBadge.className = 'status-badge in-progress';
      } else {
        this.heroStatusBadge.className = 'status-badge';
      }

      // Subject Index & Active Details
      if (state.activeExam) {
        const totalPadded = String(state.totalExams).padStart(2, '0');
        const numPadded = String(state.subjectNumber).padStart(2, '0');
        this.heroSubjectIndex.textContent = `SUBJECT ${numPadded} / ${totalPadded}`;
        this.heroSubjectName.textContent = state.activeExam.name;

        // Schedule format: highlight scheduled end time when in progress
        this.heroExamDate.textContent = this.timetable.formatDate(state.activeExam.date);
        if (state.state === EXAM_STATES.IN_PROGRESS) {
          this.heroExamTime.textContent = `Ends at ${this.timetable.formatTime(state.activeExam.endTime)}`;
        } else {
          this.heroExamTime.textContent = `${this.timetable.formatTime(state.activeExam.startTime)} – ${this.timetable.formatTime(state.activeExam.endTime)}`;
        }
        this.heroExamDuration.textContent = this.timetable.formatDuration(state.activeExam.startMs, state.activeExam.endMs);
      }

      // Digits
      this.timerDays.textContent = state.countdown.days;
      this.timerHours.textContent = state.countdown.hours;
      this.timerMinutes.textContent = state.countdown.minutes;
      this.timerSeconds.textContent = state.countdown.seconds;

      // Smart DAYS unit visibility:
      // When days is 0 (or during exam in progress), hide DAYS block to show HOURS : MINUTES : SECONDS
      if (state.countdown.days === '00' || state.state === EXAM_STATES.IN_PROGRESS) {
        if (this.timerDaysBlock) this.timerDaysBlock.classList.add('hidden');
        if (this.timerDaysColon) this.timerDaysColon.classList.add('hidden');
      } else {
        if (this.timerDaysBlock) this.timerDaysBlock.classList.remove('hidden');
        if (this.timerDaysColon) this.timerDaysColon.classList.remove('hidden');
      }

      // Update browser tab document title with live countdown
      if (state.activeExam) {
        const timeStr = (state.countdown.days !== '00' && state.state !== EXAM_STATES.IN_PROGRESS)
          ? `${state.countdown.days}d ${state.countdown.hours}:${state.countdown.minutes}:${state.countdown.seconds}`
          : `${state.countdown.hours}:${state.countdown.minutes}:${state.countdown.seconds}`;
        document.title = `(${timeStr}) ${state.activeExam.name} — EXAM TIMER`;
      } else if (state.isCompleted) {
        document.title = `✓ All Exams Completed — EXAM TIMER`;
      }

      // Subtext
      if (this.heroCountdownSubtext) {
        this.heroCountdownSubtext.textContent = state.countdownLabel;
      }
    }

    // Progress Bar
    this.progressStatsText.textContent = `${state.completedExams} of ${state.totalExams} completed (${state.progressPercent}%)`;
    this.progressFillBar.style.width = `${state.progressPercent}%`;

    // Metrics Overview
    this.metricRemaining.textContent = state.remainingExams;
    this.metricCompleted.textContent = state.completedExams;
    this.metricTotal.textContent = state.totalExams;

    // Next Exam Preview
    if (state.nextExam) {
      this.nextExamPreviewBox.classList.remove('hidden');
      this.noNextExamMessage.classList.add('hidden');
      this.nextExamName.textContent = state.nextExam.name;
      this.nextExamTime.textContent = `${this.timetable.formatDate(state.nextExam.date)} · ${this.timetable.formatTime(state.nextExam.startTime)}`;
    } else {
      this.nextExamPreviewBox.classList.add('hidden');
      this.noNextExamMessage.classList.remove('hidden');
    }

    // Timetable List Rendering
    this.renderTimetableList(state);
  }

  renderTimetableList(state) {
    const subjects = this.timetable.getSubjects();
    this.dashboardTimetableList.innerHTML = '';

    subjects.forEach((subj, idx) => {
      const item = document.createElement('div');
      item.className = 'timetable-item';

      const status = state.subjectStatuses[subj.id] || 'UPCOMING';
      const isActive = state.activeExam && state.activeExam.id === subj.id;

      if (isActive) item.classList.add('active-item');
      if (status === 'COMPLETED') item.classList.add('completed-item');

      let pillClass = 'pill-status';
      let statusLabel = 'Upcoming';
      if (status === 'IN_PROGRESS') {
        pillClass += ' status-in-progress';
        statusLabel = 'In Progress';
      } else if (status === 'COMPLETED') {
        pillClass += ' status-completed';
        statusLabel = 'Completed';
      } else {
        pillClass += ' status-upcoming';
        statusLabel = 'Upcoming';
      }

      const formattedDate = this.timetable.formatDate(subj.date);
      const formattedTimes = `${this.timetable.formatTime(subj.startTime)} – ${this.timetable.formatTime(subj.endTime)}`;
      const duration = this.timetable.formatDuration(subj.startMs, subj.endMs);

      item.innerHTML = `
        <div class="timetable-item-left">
          <span class="timetable-item-index">${String(idx + 1).padStart(2, '0')}</span>
          <div class="timetable-item-info">
            <span class="timetable-item-name">${this.escapeHtml(subj.name)}</span>
            <div class="timetable-item-timing">
              <span>${formattedDate}</span>
              <span>·</span>
              <span>${formattedTimes}</span>
              <span>·</span>
              <span>${duration}</span>
            </div>
          </div>
        </div>

        <div class="timetable-item-right">
          <span class="${pillClass}">${statusLabel}</span>
          <button type="button" class="btn btn-ghost btn-sm btn-item-edit" title="Edit this exam">
            Edit
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-item-delete" title="Delete this exam">
            Delete
          </button>
        </div>
      `;

      // Item Actions
      const editBtn = item.querySelector('.btn-item-edit');
      editBtn.addEventListener('click', () => {
        this.openEditModal(subj);
      });

      const deleteBtn = item.querySelector('.btn-item-delete');
      deleteBtn.addEventListener('click', () => {
        this.handleDeleteSubject(subj.id, subj.name);
      });

      this.dashboardTimetableList.appendChild(item);
    });
  }

  /* --------------------------------------------------------------------------
     Edit / Add / Delete Operations
     -------------------------------------------------------------------------- */
  openEditModal(subject) {
    this.editSubjectId.value = subject.id;
    this.editSubjectName.value = subject.name;
    this.editSubjectDate.value = subject.date;

    const startObj = this.split12h(subject.startTime);
    const endObj = this.split12h(subject.endTime);

    this.editSubjectStart.value = startObj.time;
    const startPeriodSelect = document.getElementById('edit-subject-start-period');
    if (startPeriodSelect) startPeriodSelect.value = startObj.period;

    this.editSubjectEnd.value = endObj.time;
    const endPeriodSelect = document.getElementById('edit-subject-end-period');
    if (endPeriodSelect) endPeriodSelect.value = endObj.period;

    this.modalEditErrors.classList.remove('visible');
    this.openModal(this.modalEditSubject);
  }

  handleEditSubjectSubmit() {
    const id = this.editSubjectId.value;
    const name = this.editSubjectName.value;
    const date = this.editSubjectDate.value;
    const startVal = this.editSubjectStart.value.trim();
    const startPeriod = document.getElementById('edit-subject-start-period')?.value || 'AM';
    const endVal = this.editSubjectEnd.value.trim();
    const endPeriod = document.getElementById('edit-subject-end-period')?.value || 'PM';

    const startTime = startVal ? `${startVal} ${startPeriod}` : '';
    const endTime = endVal ? `${endVal} ${endPeriod}` : '';

    const result = this.timetable.updateSubject(id, { name, date, startTime, endTime });
    if (!result.success) {
      this.modalEditErrorsList.innerHTML = '';
      result.errors.forEach(e => {
        const li = document.createElement('li');
        li.textContent = e;
        this.modalEditErrorsList.appendChild(li);
      });
      this.modalEditErrors.classList.add('visible');
      return;
    }

    // Persist & Refresh
    this.storage.saveTimetable(this.timetable.getSubjects());
    this.timer.setSubjects(this.timetable.getSubjects());
    this.closeModal(this.modalEditSubject);
    this.showToast('Examination updated successfully.');
  }

  openAddModal() {
    this.addModalName.value = '';
    const today = new Date();
    today.setDate(today.getDate() + 1);
    this.addModalDate.value = today.toISOString().split('T')[0];
    this.addModalStart.value = '10:30';
    const startPeriodSelect = document.getElementById('add-modal-start-period');
    if (startPeriodSelect) startPeriodSelect.value = 'AM';
    this.addModalEnd.value = '12:30';
    const endPeriodSelect = document.getElementById('add-modal-end-period');
    if (endPeriodSelect) endPeriodSelect.value = 'PM';
    this.modalAddErrors.classList.remove('visible');

    this.openModal(this.modalAddSubject);
  }

  handleAddSubjectSubmit() {
    const name = this.addModalName.value;
    const date = this.addModalDate.value;
    const startVal = this.addModalStart.value.trim();
    const startPeriod = document.getElementById('add-modal-start-period')?.value || 'AM';
    const endVal = this.addModalEnd.value.trim();
    const endPeriod = document.getElementById('add-modal-end-period')?.value || 'PM';

    const startTime = startVal ? `${startVal} ${startPeriod}` : '';
    const endTime = endVal ? `${endVal} ${endPeriod}` : '';

    const result = this.timetable.addSubject({ name, date, startTime, endTime });
    if (!result.success) {
      this.modalAddErrorsList.innerHTML = '';
      result.errors.forEach(e => {
        const li = document.createElement('li');
        li.textContent = e;
        this.modalAddErrorsList.appendChild(li);
      });
      this.modalAddErrors.classList.add('visible');
      return;
    }

    this.storage.saveTimetable(this.timetable.getSubjects());
    this.timer.setSubjects(this.timetable.getSubjects());
    this.closeModal(this.modalAddSubject);
    this.showToast('New examination added to timetable.');
  }

  handleDeleteSubject(id, name) {
    const current = this.timetable.getSubjects();
    if (current.length <= 1) {
      if (confirm(`"${name}" is your only examination. Deleting it will clear your timetable. Proceed?`)) {
        this.handleConfirmReset();
      }
      return;
    }

    if (confirm(`Are you sure you want to delete "${name}" from your timetable?`)) {
      this.timetable.deleteSubject(id);
      this.storage.saveTimetable(this.timetable.getSubjects());
      this.timer.setSubjects(this.timetable.getSubjects());
      this.showToast(`Deleted "${name}".`);
    }
  }

  openResetModal() {
    this.openModal(this.modalResetConfirm);
  }

  handleConfirmReset() {
    this.closeModal(this.modalResetConfirm);
    this.timetable.init([]);
    this.storage.clearTimetable();
    this.timer.setSubjects([]);
    this.timer.stop();
    this.showToast('Examination timetable has been reset.');
    this.renderSetupForm(3);
    this.switchView('setup');
  }

  /* --------------------------------------------------------------------------
     Preset Timetable Loaders
     -------------------------------------------------------------------------- */
  loadPreset(type) {
    let presetSubjects = [];

    if (type === 'rapid') {
      // Live switching simulation:
      // Exam 1: Ends in 15 seconds! (IN PROGRESS)
      // Exam 2: Starts in 18 seconds, ends in 35 seconds! (UPCOMING -> NEXT)
      // Exam 3: Starts in 40 seconds, ends in 60 seconds! (UPCOMING)
      const now = new Date();
      
      const formatTimeStr = (d) => {
        let hh = d.getHours();
        const mm = String(d.getMinutes()).padStart(2, '0');
        const period = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12;
        if (hh === 0) hh = 12;
        return `${String(hh).padStart(2, '0')}:${mm} ${period}`;
      };
      const formatDateStr = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const dateStr = formatDateStr(now);

      // Create timestamps
      const nowMs = now.getTime();
      const s1Start = new Date(nowMs - 60 * 1000); // 1 minute ago
      const s1End = new Date(nowMs + 15 * 1000);   // 15 seconds from now

      const s2Start = new Date(nowMs + 18 * 1000); // 18 seconds from now
      const s2End = new Date(nowMs + 38 * 1000);   // 38 seconds from now

      const s3Start = new Date(nowMs + 42 * 1000); // 42 seconds from now
      const s3End = new Date(nowMs + 65 * 1000);   // 65 seconds from now

      presetSubjects = [
        {
          name: 'Subject 1: Rapid Demonstration',
          date: dateStr,
          startTime: formatTimeStr(s1Start),
          endTime: formatTimeStr(s1End),
          startMs: s1Start.getTime(),
          endMs: s1End.getTime(),
          isSimulation: true
        },
        {
          name: 'Subject 2: Automatic Switch Target',
          date: dateStr,
          startTime: formatTimeStr(s2Start),
          endTime: formatTimeStr(s2End),
          startMs: s2Start.getTime(),
          endMs: s2End.getTime(),
          isSimulation: true
        },
        {
          name: 'Subject 3: Final Scheduled Paper',
          date: dateStr,
          startTime: formatTimeStr(s3Start),
          endTime: formatTimeStr(s3End),
          startMs: s3Start.getTime(),
          endMs: s3End.getTime(),
          isSimulation: true
        }
      ];

      this.showToast('Loaded Rapid Simulation! Watch Subject 1 complete in 15 seconds.');
    } else if (type === 'standard') {
      presetSubjects = this.getStandardPresetData();
      this.showToast('Loaded standard university exam schedule.');
    } else if (type === 'completed') {
      // 3 exams in the past
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 3);
      const date1 = yesterday.toISOString().split('T')[0];

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const date2 = twoDaysAgo.toISOString().split('T')[0];

      presetSubjects = [
        {
          name: 'Calculus & Linear Algebra',
          date: date1,
          startTime: '09:00 AM',
          endTime: '12:00 PM'
        },
        {
          name: 'Digital Logic & Computer Design',
          date: date2,
          startTime: '02:00 PM',
          endTime: '05:00 PM'
        }
      ];
      this.showToast('Loaded completed timetable.');
    }

    this.timetable.init(presetSubjects);
    const sorted = this.timetable.getSubjects();
    this.storage.saveTimetable(sorted);
    this.timer.setSubjects(sorted);
    this.timer.start();
    this.switchView('dashboard');
  }

  getStandardPresetData() {
    const today = new Date();

    const d1 = new Date(today);
    d1.setDate(today.getDate() + 2);

    const d2 = new Date(today);
    d2.setDate(today.getDate() + 4);

    const d3 = new Date(today);
    d3.setDate(today.getDate() + 7);

    return [
      {
        name: 'Computational Theory',
        date: d1.toISOString().split('T')[0],
        startTime: '10:30 AM',
        endTime: '12:30 PM'
      },
      {
        name: 'Database Management Systems',
        date: d2.toISOString().split('T')[0],
        startTime: '10:30 AM',
        endTime: '12:30 PM'
      },
      {
        name: 'Operating Systems',
        date: d3.toISOString().split('T')[0],
        startTime: '10:30 AM',
        endTime: '12:30 PM'
      }
    ];
  }

  /* --------------------------------------------------------------------------
     Modal Helpers
     -------------------------------------------------------------------------- */
  openModal(modalElem) {
    modalElem.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModal(modalElem) {
    modalElem.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* --------------------------------------------------------------------------
     Toast Notifications
     -------------------------------------------------------------------------- */
  showToast(message, duration = 3500) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* --------------------------------------------------------------------------
     Browser Web Notifications & Audio Chime
     -------------------------------------------------------------------------- */
  initNotifications() {
    if (!('Notification' in window)) {
      this.notificationBtnLabel.textContent = 'Alerts N/A';
      this.btnToggleNotifications.disabled = true;
      return;
    }

    if (Notification.permission === 'granted' && this.settings.notificationsEnabled) {
      this.notificationBtnLabel.textContent = 'Alerts On';
      this.btnToggleNotifications.classList.remove('btn-secondary');
      this.btnToggleNotifications.classList.add('btn-primary');
    } else {
      this.notificationBtnLabel.textContent = 'Alerts Off';
    }
  }

  toggleNotifications() {
    if (!('Notification' in window)) {
      this.showToast('Browser notifications are not supported on this device.');
      return;
    }

    if (Notification.permission === 'granted') {
      this.settings.notificationsEnabled = !this.settings.notificationsEnabled;
      this.storage.saveSettings({ notificationsEnabled: this.settings.notificationsEnabled });

      if (this.settings.notificationsEnabled) {
        this.notificationBtnLabel.textContent = 'Alerts On';
        this.btnToggleNotifications.classList.remove('btn-secondary');
        this.btnToggleNotifications.classList.add('btn-primary');
        this.showToast('Notifications enabled.');
      } else {
        this.notificationBtnLabel.textContent = 'Alerts Off';
        this.btnToggleNotifications.classList.remove('btn-primary');
        this.btnToggleNotifications.classList.add('btn-secondary');
        this.showToast('Notifications disabled.');
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this.settings.notificationsEnabled = true;
          this.storage.saveSettings({ notificationsEnabled: true });
          this.notificationBtnLabel.textContent = 'Alerts On';
          this.btnToggleNotifications.classList.remove('btn-secondary');
          this.btnToggleNotifications.classList.add('btn-primary');
          this.showToast('Notifications granted and enabled.');
          this.sendWebNotification('Exam Timer Notifications Active', 'You will receive reminders when exams begin and end.');
        } else {
          this.showToast('Notification permission was dismissed or denied.');
        }
      });
    } else {
      this.showToast('Notifications are blocked in your browser settings.');
    }
  }

  handleStateTransition(event) {
    // Play subtle audio tone
    this.playAudioAlert();

    // Trigger visual toast
    this.showToast(event.message, 5000);

    // Trigger Web Notification
    if (this.settings.notificationsEnabled && Notification.permission === 'granted') {
      this.sendWebNotification('EXAM TIMER', event.message);
    }
  }

  sendWebNotification(title, body) {
    try {
      new Notification(title, {
        body,
        icon: 'assets/icon.png',
        badge: 'assets/icon.png'
      });
    } catch (e) {
      console.warn('Failed to dispatch notification:', e);
    }
  }

  playAudioAlert() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioContext.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.35);
    } catch (e) {
      // Audio playback blocked or unsupported, fail silently
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.examTimerApp = new ExamTimerApp();
});


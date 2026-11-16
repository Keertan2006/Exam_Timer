/**
 * pomodoro.js
 * Self-contained Pomodoro Timer with presets: 10:2 · 30:10 · 45:15 · 60:20
 * Strict minimalist black & white productivity interface.
 */

(function () {
  /* -------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------- */
  const CIRCUMFERENCE = 2 * Math.PI * 88; // 552.92 for r="88" in SVG

  const state = {
    workMins: 30,
    breakMins: 10,
    phase: 'focus',         // 'focus' | 'break'
    running: false,
    totalSecs: 30 * 60,
    remainingSecs: 30 * 60,
    intervalId: null,
    cycleCount: 1,
    sessionLog: []
  };

  /* -------------------------------------------------------------------------
     Element references
     ------------------------------------------------------------------------- */
  let elTimeDisplay;
  let elPhaseLabel;
  let elPhaseBadge;
  let elStatusBadge;
  let elCycleCount;
  let elRingFill;
  let elBtnStart;
  let elBtnReset;
  let elBtnSkip;
  let elBtnLabel;
  let elPlayIcon;
  let elPauseIcon;
  let elSessionLog;

  function initDOMElements() {
    elTimeDisplay   = document.getElementById('pomo-time-display');
    elPhaseLabel    = document.getElementById('pomo-phase-label');
    elPhaseBadge    = document.getElementById('pomo-phase-badge');
    elStatusBadge   = document.getElementById('pomo-status-badge');
    elCycleCount    = document.getElementById('pomo-cycle-count');
    elRingFill      = document.getElementById('pomo-ring-fill');
    elBtnStart      = document.getElementById('pomo-btn-start');
    elBtnReset      = document.getElementById('pomo-btn-reset');
    elBtnSkip       = document.getElementById('pomo-btn-skip');
    elBtnLabel      = document.getElementById('pomo-btn-label');
    elPlayIcon      = document.getElementById('pomo-play-icon');
    elPauseIcon     = document.getElementById('pomo-pause-icon');
    elSessionLog    = document.getElementById('pomo-session-log');
  }

  /* -------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------- */
  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateRing() {
    if (!elRingFill) return;
    const fraction = state.remainingSecs / state.totalSecs;
    const offset = CIRCUMFERENCE * (1 - fraction);
    elRingFill.style.strokeDashoffset = offset;
  }

  function updateUI() {
    // Time display
    if (elTimeDisplay) {
      elTimeDisplay.textContent = formatTime(state.remainingSecs);
    }

    // Ring
    updateRing();

    // Phase badge & label & ring colour
    const isFocus = state.phase === 'focus';
    if (elPhaseBadge) {
      elPhaseBadge.textContent = isFocus ? 'FOCUS' : 'BREAK';
    }
    if (elStatusBadge) {
      elStatusBadge.className = isFocus ? 'status-badge in-progress' : 'status-badge';
    }
    if (elPhaseLabel) {
      elPhaseLabel.textContent = isFocus ? 'Focus Time' : 'Break Time';
    }
    if (elRingFill) {
      elRingFill.classList.toggle('break-mode', !isFocus);
    }

    // Cycle label
    if (elCycleCount) {
      elCycleCount.textContent = `Cycle ${state.cycleCount}`;
    }

    // Start/pause button
    if (elBtnLabel) {
      if (state.running) {
        if (elPlayIcon) elPlayIcon.style.display = 'none';
        if (elPauseIcon) elPauseIcon.style.display = '';
        elBtnLabel.textContent = 'Pause';
      } else {
        if (elPlayIcon) elPlayIcon.style.display = '';
        if (elPauseIcon) elPauseIcon.style.display = 'none';
        elBtnLabel.textContent = isFocus ? 'Start Focus' : 'Start Break';
      }
    }

    // Document title
    if (window.examTimerApp && window.examTimerApp.currentView === 'pomodoro') {
      const timeStr = formatTime(state.remainingSecs);
      const phaseStr = isFocus ? 'Focus' : 'Break';
      document.title = state.running
        ? `(${timeStr}) ${phaseStr} — Pomodoro`
        : `Pomodoro Timer — EXAM TIMER`;
    }

    // Session dots
    renderSessionLog();
  }

  function renderSessionLog() {
    if (!elSessionLog) return;
    elSessionLog.innerHTML = '';
    state.sessionLog.forEach(type => {
      const dot = document.createElement('span');
      dot.className = `pomo-log-dot ${type === 'focus' ? 'focus-done' : 'break-done'}`;
      dot.title = type === 'focus' ? 'Focus session completed' : 'Break completed';
      elSessionLog.appendChild(dot);
    });
  }

  function playChime(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const freqs = type === 'focus' ? [523, 659, 784] : [784, 659, 523]; // C5 E5 G5
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.4);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.4);
      });
    } catch (_) { /* audio unsupported or blocked */ }
  }

  function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  /* -------------------------------------------------------------------------
     Timer Logic
     ------------------------------------------------------------------------- */
  function tick() {
    if (state.remainingSecs <= 0) {
      phaseComplete();
      return;
    }
    state.remainingSecs--;
    updateUI();
  }

  function phaseComplete() {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.running = false;

    // Log completed phase
    state.sessionLog.push(state.phase);

    if (state.phase === 'focus') {
      // Switch to break
      playChime('break');
      sendNotification('Focus session complete! 🎉', `Take a ${state.breakMins}-minute break.`);
      state.phase = 'break';
      state.totalSecs = state.breakMins * 60;
      state.remainingSecs = state.breakMins * 60;
    } else {
      // Break over → start next focus cycle
      state.cycleCount++;
      playChime('focus');
      sendNotification('Break over! 💪', `Starting focus cycle ${state.cycleCount}.`);
      state.phase = 'focus';
      state.totalSecs = state.workMins * 60;
      state.remainingSecs = state.workMins * 60;
    }

    updateUI();
  }

  function startTimer() {
    if (state.running) return;
    state.running = true;
    state.intervalId = setInterval(tick, 1000);
    updateUI();
  }

  function pauseTimer() {
    if (!state.running) return;
    state.running = false;
    clearInterval(state.intervalId);
    state.intervalId = null;
    updateUI();
  }

  function resetTimer() {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.running = false;
    state.phase = 'focus';
    state.cycleCount = 1;
    state.sessionLog = [];
    state.totalSecs = state.workMins * 60;
    state.remainingSecs = state.workMins * 60;
    updateUI();
  }

  function skipPhase() {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.running = false;
    if (state.phase === 'focus') {
      state.phase = 'break';
      state.totalSecs = state.breakMins * 60;
      state.remainingSecs = state.breakMins * 60;
    } else {
      state.cycleCount++;
      state.phase = 'focus';
      state.totalSecs = state.workMins * 60;
      state.remainingSecs = state.workMins * 60;
    }
    updateUI();
  }

  function applyPreset(workMins, breakMins) {
    document.querySelectorAll('.pomo-preset-btn').forEach(btn => {
      btn.classList.toggle(
        'active',
        parseInt(btn.dataset.work, 10) === workMins && parseInt(btn.dataset.break, 10) === breakMins
      );
    });

    state.workMins = workMins;
    state.breakMins = breakMins;
    resetTimer();
  }

  /* -------------------------------------------------------------------------
     Event Bindings & Initialization
     ------------------------------------------------------------------------- */
  function setup() {
    initDOMElements();

    if (elBtnStart) {
      elBtnStart.addEventListener('click', () => {
        if (state.running) {
          pauseTimer();
        } else {
          startTimer();
        }
      });
    }

    if (elBtnReset) elBtnReset.addEventListener('click', resetTimer);
    if (elBtnSkip) elBtnSkip.addEventListener('click', skipPhase);

    document.querySelectorAll('.pomo-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const work = parseInt(btn.dataset.work, 10);
        const brk  = parseInt(btn.dataset.break, 10);
        applyPreset(work, brk);
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && state.running) {
        state._hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && state.running && state._hiddenAt) {
        const elapsed = Math.floor((Date.now() - state._hiddenAt) / 1000);
        state._hiddenAt = null;
        state.remainingSecs = Math.max(0, state.remainingSecs - elapsed);
        if (state.remainingSecs === 0) {
          phaseComplete();
        } else {
          updateUI();
        }
      }
    });

    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

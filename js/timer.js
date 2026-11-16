/**
 * timer.js
 * Core state engine for automatic digital countdown and examination progression.
 * Calculates state strictly from real date-time timestamps.
 */

const EXAM_STATES = {
  UPCOMING: 'UPCOMING EXAM',
  IN_PROGRESS: 'EXAM IN PROGRESS',
  NEXT_EXAM: 'NEXT EXAM',
  ALL_COMPLETED: 'ALL EXAMS COMPLETED',
  EMPTY: 'NO EXAMS SCHEDULED'
};

class ExamTimerEngine {
  constructor() {
    this.intervalId = null;
    this.listeners = new Set();
    this.transitionListeners = new Set();
    this.lastEvaluatedState = null;
    this.subjects = [];
  }

  /**
   * Set subjects and immediately evaluate
   * @param {Array} subjects 
   */
  setSubjects(subjects) {
    this.subjects = Array.isArray(subjects) ? subjects : [];
    this.evaluate();
  }

  /**
   * Register listener for every second tick
   * @param {Function} callback 
   */
  subscribe(callback) {
    this.listeners.add(callback);
    if (this.lastEvaluatedState) {
      callback(this.lastEvaluatedState);
    }
    return () => this.listeners.delete(callback);
  }

  /**
   * Register listener for state transitions (e.g. exam started, exam completed)
   * @param {Function} callback 
   */
  onTransition(callback) {
    this.transitionListeners.add(callback);
    return () => this.transitionListeners.delete(callback);
  }

  /**
   * Start 1-second interval loop with visibility awareness
   */
  start() {
    this.stop();
    this.evaluate();

    this.intervalId = setInterval(() => {
      this.evaluate();
    }, 1000);

    // Re-evaluate immediately when tab regains focus or visibility
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.evaluate();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('focus', this.visibilityHandler);
  }

  /**
   * Stop interval loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      window.removeEventListener('focus', this.visibilityHandler);
    }
  }

  /**
   * Core calculation: determines exact status of timetable at current millisecond
   * @param {number} nowMs - Optional custom timestamp (useful for testing)
   */
  evaluate(nowMs = Date.now()) {
    if (!this.subjects || this.subjects.length === 0) {
      const emptyState = {
        state: EXAM_STATES.EMPTY,
        activeExam: null,
        activeExamIndex: -1,
        nextExam: null,
        totalExams: 0,
        completedExams: 0,
        remainingExams: 0,
        progressPercent: 0,
        countdown: { days: '00', hours: '00', minutes: '00', seconds: '00', totalSeconds: 0 },
        subjectStatuses: {},
        isCompleted: false
      };
      this.lastEvaluatedState = emptyState;
      this._notify(emptyState);
      return emptyState;
    }

    // Classify all subjects based on current time
    const subjectStatuses = {};
    let activeExam = null;
    let activeExamIndex = -1;
    let nextExam = null;

    let inProgressExam = null;
    let inProgressIndex = -1;

    let upcomingExams = [];

    let completedCount = 0;

    for (let i = 0; i < this.subjects.length; i++) {
      const s = this.subjects[i];
      if (nowMs < s.startMs) {
        subjectStatuses[s.id] = 'UPCOMING';
        upcomingExams.push({ exam: s, index: i });
      } else if (nowMs >= s.startMs && nowMs < s.endMs) {
        subjectStatuses[s.id] = 'IN_PROGRESS';
        if (!inProgressExam) {
          inProgressExam = s;
          inProgressIndex = i;
        }
      } else {
        subjectStatuses[s.id] = 'COMPLETED';
        completedCount++;
      }
    }

    const totalExams = this.subjects.length;
    let state = EXAM_STATES.UPCOMING;
    let targetTimestamp = 0;
    let countdownLabel = 'Time remaining until your examination.';

    // Determine active exam and state
    if (inProgressExam) {
      state = EXAM_STATES.IN_PROGRESS;
      activeExam = inProgressExam;
      activeExamIndex = inProgressIndex;
      targetTimestamp = inProgressExam.endMs;
      countdownLabel = 'Time remaining in examination.';

      // Next exam is the first upcoming exam
      if (upcomingExams.length > 0) {
        nextExam = upcomingExams[0].exam;
      }
    } else if (upcomingExams.length > 0) {
      // If at least one exam completed and next is coming up, show NEXT EXAM or UPCOMING EXAM
      state = completedCount > 0 ? EXAM_STATES.NEXT_EXAM : EXAM_STATES.UPCOMING;
      activeExam = upcomingExams[0].exam;
      activeExamIndex = upcomingExams[0].index;
      targetTimestamp = activeExam.startMs;
      countdownLabel = 'Time remaining until your examination.';

      // Subsequent exam is next
      if (upcomingExams.length > 1) {
        nextExam = upcomingExams[1].exam;
      }
    } else {
      // All exams have finished
      state = EXAM_STATES.ALL_COMPLETED;
      activeExam = null;
      activeExamIndex = -1;
      nextExam = null;
      targetTimestamp = nowMs;
      countdownLabel = 'Your examination schedule is finished.';
    }

    // Calculate countdown
    const diffMs = Math.max(0, targetTimestamp - nowMs);
    const countdown = this._calculateTimeUnits(diffMs);

    const remainingExams = totalExams - completedCount;
    const progressPercent = totalExams > 0 ? Math.round((completedCount / totalExams) * 100) : 0;

    const snapshot = {
      state,
      activeExam,
      activeExamIndex, // 0-based index
      subjectNumber: activeExamIndex >= 0 ? activeExamIndex + 1 : 0,
      nextExam,
      totalExams,
      completedExams: completedCount,
      remainingExams,
      progressPercent,
      targetTimestamp,
      countdown,
      countdownLabel,
      subjectStatuses,
      isCompleted: state === EXAM_STATES.ALL_COMPLETED,
      timestamp: nowMs
    };

    // Detect transitions and trigger events
    this._detectTransitions(snapshot);

    this.lastEvaluatedState = snapshot;
    this._notify(snapshot);
    return snapshot;
  }

  /**
   * Break down millisecond difference into zero-padded units
   * @param {number} diffMs 
   */
  _calculateTimeUnits(diffMs) {
    if (diffMs <= 0) {
      return {
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00',
        totalSeconds: 0
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');

    return {
      days: pad(days),
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
      totalSeconds
    };
  }

  /**
   * Check for state changes between previous evaluation and current evaluation
   */
  _detectTransitions(currentState) {
    const prevState = this.lastEvaluatedState;
    if (!prevState) return;

    // Check if an exam just started
    if (
      prevState.state !== EXAM_STATES.IN_PROGRESS &&
      currentState.state === EXAM_STATES.IN_PROGRESS &&
      currentState.activeExam
    ) {
      this._emitTransition({
        type: 'EXAM_STARTED',
        exam: currentState.activeExam,
        message: `Examination started: ${currentState.activeExam.name}`
      });
    }

    // Check if an exam just finished
    if (
      prevState.state === EXAM_STATES.IN_PROGRESS &&
      currentState.state !== EXAM_STATES.IN_PROGRESS &&
      prevState.activeExam
    ) {
      this._emitTransition({
        type: 'EXAM_COMPLETED',
        exam: prevState.activeExam,
        nextExam: currentState.activeExam,
        message: `Examination finished: ${prevState.activeExam.name}`
      });
    }

    // Check if all exams just finished
    if (
      prevState.state !== EXAM_STATES.ALL_COMPLETED &&
      currentState.state === EXAM_STATES.ALL_COMPLETED
    ) {
      this._emitTransition({
        type: 'ALL_EXAMS_COMPLETED',
        message: 'All examinations have concluded. Great job!'
      });
    }

    // Check if active subject switched to a new upcoming exam
    if (
      prevState.activeExam &&
      currentState.activeExam &&
      prevState.activeExam.id !== currentState.activeExam.id
    ) {
      this._emitTransition({
        type: 'ACTIVE_EXAM_SWITCHED',
        previousExam: prevState.activeExam,
        activeExam: currentState.activeExam,
        message: `Now tracking countdown for: ${currentState.activeExam.name}`
      });
    }
  }

  _notify(state) {
    this.listeners.forEach((callback) => {
      try {
        callback(state);
      } catch (err) {
        console.error('Error in timer listener callback:', err);
      }
    });
  }

  _emitTransition(event) {
    this.transitionListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('Error in timer transition callback:', err);
      }
    });
  }
}

// Export singleton
window.examTimerEngine = new ExamTimerEngine();
window.EXAM_STATES = EXAM_STATES;


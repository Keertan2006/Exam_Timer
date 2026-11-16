/**
 * timetable.js
 * Timetable data model, validation, conflict detection, and chronological sorting.
 */

class TimetableService {
  constructor() {
    this.subjects = [];
  }

  /**
   * Initialize with stored or provided subjects
   * @param {Array} subjects 
   */
  init(subjects = []) {
    this.subjects = this.sanitizeAndSort(subjects);
    return this.subjects;
  }

  /**
   * Generates a unique ID
   */
  generateId() {
    return 'subj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Converts date string (YYYY-MM-DD) and time string (HH:MM) to millisecond timestamp in local timezone.
   * @param {string} dateStr 
   * @param {string} timeStr 
   * @returns {number}
   */
  /**
   * Converts any 12-hour or 24-hour time string into a normalized 24-hour HH:MM string
   * Handles "10:30 AM", "2:30 PM", "02:30 PM", "14:30", etc.
   * @param {string} timeStr
   * @returns {string}
   */
  parseTimeTo24h(timeStr) {
    if (!timeStr) return '';
    const trimmed = String(timeStr).trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return trimmed;

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3] ? match[3].toUpperCase() : null;

    if (period === 'PM') {
      if (hours < 12) hours += 12;
    } else if (period === 'AM') {
      if (hours === 12) hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  /**
   * Converts date string (YYYY-MM-DD) and 12h/24h time string to millisecond timestamp in local timezone.
   * @param {string} dateStr 
   * @param {string} timeStr 
   * @returns {number}
   */
  getTimestamp(dateStr, timeStr) {
    if (!dateStr || !timeStr) return NaN;
    const time24 = this.parseTimeTo24h(timeStr);
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = time24.split(':').map(Number);
    const dateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return dateObj.getTime();
  }

  /**
   * Creates a normalized subject object
   */
  createSubject(data) {
    const id = data.id || this.generateId();
    const name = (data.name || '').trim();
    const date = data.date || '';
    const startTime = data.startTime || '';
    const endTime = data.endTime || '';

    const startMs = (data.isSimulation && data.startMs) ? data.startMs : this.getTimestamp(date, startTime);
    const endMs = (data.isSimulation && data.endMs) ? data.endMs : this.getTimestamp(date, endTime);

    return {
      id,
      name,
      date,
      startTime,
      endTime,
      startMs,
      endMs,
      isSimulation: !!data.isSimulation
    };
  }

  /**
   * Validate a single subject's input fields
   * @param {Object} subject 
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateSubjectFields(subject) {
    const errors = [];
    const name = (subject.name || '').trim();

    if (!name) {
      errors.push('Subject name cannot be empty.');
    } else if (name.length < 2) {
      errors.push('Subject name must be at least 2 characters.');
    }

    if (!subject.date) {
      errors.push('Examination date is required.');
    } else {
      const parts = subject.date.split('-');
      if (parts.length !== 3 || isNaN(new Date(subject.date).getTime())) {
        errors.push('Invalid examination date format.');
      }
    }

    const isValidTimeFormat = (str) => {
      if (!str) return false;
      const m = String(str).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!m) return false;
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const hasAmPm = !!m[3];
      if (min < 0 || min > 59) return false;
      if (hasAmPm) {
        return h >= 1 && h <= 12;
      }
      return h >= 0 && h <= 23;
    };

    if (!subject.startTime) {
      errors.push('Start time is required.');
    } else if (!isValidTimeFormat(subject.startTime)) {
      errors.push('Start time must be a valid 12-hour time (e.g. 10:30 AM).');
    }

    if (!subject.endTime) {
      errors.push('End time is required.');
    } else if (!isValidTimeFormat(subject.endTime)) {
      errors.push('End time must be a valid 12-hour time (e.g. 12:30 PM).');
    }

    if (subject.date && subject.startTime && subject.endTime) {
      const startMs = this.getTimestamp(subject.date, subject.startTime);
      const endMs = this.getTimestamp(subject.date, subject.endTime);

      if (isNaN(startMs) || isNaN(endMs)) {
        errors.push('Invalid date or time values.');
      } else if (endMs <= startMs) {
        errors.push('Examination end time must be after the start time.');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate the complete list of subjects for conflicts, duplicates, and timing issues
   * @param {Array} subjects 
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  validateTimetable(subjects) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(subjects) || subjects.length === 0) {
      errors.push('Please enter at least one examination subject.');
      return { valid: false, errors, warnings };
    }

    const normalized = subjects.map((s, idx) => ({
      ...s,
      index: idx + 1,
      startMs: this.getTimestamp(s.date, s.startTime),
      endMs: this.getTimestamp(s.date, s.endTime)
    }));

    // Check individual subject field validity
    normalized.forEach((s) => {
      const fieldValidation = this.validateSubjectFields(s);
      if (!fieldValidation.valid) {
        fieldValidation.errors.forEach(err => {
          errors.push(`Subject #${s.index} (${s.name || 'Unnamed'}): ${err}`);
        });
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Check duplicate names (case-insensitive)
    const nameMap = new Map();
    normalized.forEach((s) => {
      const lower = s.name.toLowerCase();
      if (nameMap.has(lower)) {
        warnings.push(`Duplicate subject name detected: "${s.name}".`);
      } else {
        nameMap.set(lower, s.index);
      }
    });

    // Check overlapping/conflicting schedules
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const a = normalized[i];
        const b = normalized[j];

        // Conflict occurs if a starts before b ends and a ends after b starts
        const hasOverlap = a.startMs < b.endMs && a.endMs > b.startMs;
        if (hasOverlap) {
          errors.push(
            `Schedule Conflict: "${a.name}" (${a.date} ${this.formatTime(a.startTime)}–${this.formatTime(a.endTime)}) overlaps with "${b.name}" (${b.date} ${this.formatTime(b.startTime)}–${this.formatTime(b.endTime)}).`
          );
        }
      }
    }

    // Check if all examinations are already in the past
    const now = Date.now();
    const allInPast = normalized.every(s => s.endMs <= now);
    if (allInPast) {
      warnings.push('All entered examinations have already concluded. They will be marked as Completed.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sort subjects chronologically by exam start time
   * @param {Array} subjects 
   * @returns {Array}
   */
  sanitizeAndSort(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects
      .map(s => this.createSubject(s))
      .filter(s => s.name && s.date && s.startTime && s.endTime && !isNaN(s.startMs))
      .sort((a, b) => {
        if (a.startMs !== b.startMs) {
          return a.startMs - b.startMs;
        }
        return a.endMs - b.endMs;
      });
  }

  /**
   * Add a new subject to timetable
   */
  addSubject(subjectData) {
    const subject = this.createSubject(subjectData);
    const validation = this.validateSubjectFields(subject);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const testList = [...this.subjects, subject];
    const timetableValidation = this.validateTimetable(testList);
    if (!timetableValidation.valid) {
      return { success: false, errors: timetableValidation.errors };
    }

    this.subjects = this.sanitizeAndSort(testList);
    return { success: true, subjects: this.subjects };
  }

  /**
   * Update an existing subject
   */
  updateSubject(id, updatedData) {
    const index = this.subjects.findIndex(s => s.id === id);
    if (index === -1) {
      return { success: false, errors: ['Subject not found.'] };
    }

    const updated = this.createSubject({ ...this.subjects[index], ...updatedData, id });
    const validation = this.validateSubjectFields(updated);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const testList = this.subjects.map(s => (s.id === id ? updated : s));
    const timetableValidation = this.validateTimetable(testList);
    if (!timetableValidation.valid) {
      return { success: false, errors: timetableValidation.errors };
    }

    this.subjects = this.sanitizeAndSort(testList);
    return { success: true, subjects: this.subjects };
  }

  /**
   * Delete a subject by ID
   */
  deleteSubject(id) {
    this.subjects = this.subjects.filter(s => s.id !== id);
    return { success: true, subjects: this.subjects };
  }

  /**
   * Get all subjects
   */
  getSubjects() {
    return [...this.subjects];
  }

  /**
   * Format date into readable string, e.g. "Thu, 12 Nov 2026"
   */
  formatDate(dateStr, includeWeekday = true) {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      if (includeWeekday) {
        options.weekday = 'short';
      }
      return dateObj.toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Format any time into strictly 12-hour AM/PM format (e.g. "10:30 AM", "02:30 PM")
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const trimmed = String(timeStr).trim();
      const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
      if (!match) return trimmed;

      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const explicitPeriod = match[3] ? match[3].toUpperCase() : null;

      let period = 'AM';
      if (explicitPeriod) {
        period = explicitPeriod;
      } else {
        period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
      }

      const paddedHours = String(hours).padStart(2, '0');
      return `${paddedHours}:${minutes} ${period}`;
    } catch (e) {
      return timeStr;
    }
  }

  /**
   * Format duration between two timestamps
   */
  formatDuration(startMs, endMs) {
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return '0 mins';
    const diffMins = Math.round((endMs - startMs) / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours === 0) {
      return `${mins} min${mins === 1 ? '' : 's'}`;
    }
    if (mins === 0) {
      return `${hours} hr${hours === 1 ? '' : 's'}`;
    }
    return `${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
  }
}

// Export singleton
window.timetableService = new TimetableService();


/**
 * storage.js
 * LocalStorage management with safe fallbacks and schema validation.
 */

const STORAGE_KEYS = {
  TIMETABLE: 'exam_timer_timetable_v1',
  SETTINGS: 'exam_timer_settings_v1'
};

class StorageService {
  constructor() {
    this.memoryFallback = new Map();
    this.isStorageSupported = this._checkStorageAvailability();
  }

  _checkStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('LocalStorage is not available. Falling back to in-memory storage.', e);
      return false;
    }
  }

  /**
   * Save subjects timetable to storage
   * @param {Array} subjects 
   * @returns {boolean}
   */
  saveTimetable(subjects) {
    if (!Array.isArray(subjects)) {
      console.error('Invalid subjects array passed to saveTimetable');
      return false;
    }
    const serialized = JSON.stringify(subjects);
    if (this.isStorageSupported) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.TIMETABLE, serialized);
        return true;
      } catch (err) {
        console.error('Failed to save timetable to LocalStorage:', err);
      }
    }
    this.memoryFallback.set(STORAGE_KEYS.TIMETABLE, serialized);
    return true;
  }

  /**
   * Load timetable subjects from storage
   * @returns {Array} Array of subjects or empty array
   */
  loadTimetable() {
    let serialized = null;
    if (this.isStorageSupported) {
      try {
        serialized = window.localStorage.getItem(STORAGE_KEYS.TIMETABLE);
      } catch (err) {
        console.error('Failed to read timetable from LocalStorage:', err);
      }
    }
    if (!serialized && this.memoryFallback.has(STORAGE_KEYS.TIMETABLE)) {
      serialized = this.memoryFallback.get(STORAGE_KEYS.TIMETABLE);
    }
    if (!serialized) {
      return [];
    }

    try {
      const parsed = JSON.parse(serialized);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error('Corrupted timetable data found in storage. Resetting.', e);
    }
    return [];
  }

  /**
   * Clear timetable from storage
   */
  clearTimetable() {
    if (this.isStorageSupported) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.TIMETABLE);
      } catch (err) {
        console.error('Failed to remove timetable from LocalStorage:', err);
      }
    }
    this.memoryFallback.delete(STORAGE_KEYS.TIMETABLE);
  }

  /**
   * Save user preferences/settings
   * @param {Object} settings
   */
  saveSettings(settings) {
    const current = this.loadSettings();
    const updated = { ...current, ...settings };
    const serialized = JSON.stringify(updated);
    if (this.isStorageSupported) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.SETTINGS, serialized);
        return true;
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
    this.memoryFallback.set(STORAGE_KEYS.SETTINGS, serialized);
    return true;
  }

  /**
   * Load user preferences/settings
   * @returns {Object}
   */
  loadSettings() {
    const defaults = {
      notificationsEnabled: false,
      audioEnabled: true,
      hasSeenWelcome: false
    };

    let serialized = null;
    if (this.isStorageSupported) {
      try {
        serialized = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
      } catch (err) {
        console.error('Failed to read settings from LocalStorage:', err);
      }
    }
    if (!serialized && this.memoryFallback.has(STORAGE_KEYS.SETTINGS)) {
      serialized = this.memoryFallback.get(STORAGE_KEYS.SETTINGS);
    }
    if (!serialized) {
      return defaults;
    }

    try {
      const parsed = JSON.parse(serialized);
      return { ...defaults, ...parsed };
    } catch (e) {
      return defaults;
    }
  }
}

// Export singleton
window.storageService = new StorageService();


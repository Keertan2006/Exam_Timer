/**
 * unit_tests.js
 * Comprehensive automated test suite for Exam Timer modules
 */

// Setup minimal browser-like globals for Node environment
global.window = global;
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  visibilityState: 'visible'
};
global.localStorage = {
  _store: {},
  setItem(k, v) { this._store[k] = String(v); },
  getItem(k) { return this._store[k] || null; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

// Load modules by evaluating their content
const fs = require('fs');
const path = require('path');

function loadModule(relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  eval(code);
}

loadModule('js/storage.js');
loadModule('js/timetable.js');
loadModule('js/timer.js');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  assert(actual === expected, `${message} (Expected: ${expected}, Got: ${actual})`);
}

console.log('\n--- 1. Testing TimetableService Validation & Sorting ---');

const timetable = window.timetableService;

// Test valid subject creation
const subj1 = timetable.createSubject({
  name: 'Computational Theory',
  date: '2026-11-12',
  startTime: '10:30',
  endTime: '12:30'
});

assert(subj1.name === 'Computational Theory', 'Subject name set properly');
assert(!isNaN(subj1.startMs), 'Valid startMs timestamp generated');
assert(!isNaN(subj1.endMs), 'Valid endMs timestamp generated');
assert(subj1.endMs > subj1.startMs, 'endMs is strictly greater than startMs');

// Test field validation
const emptyNameValidation = timetable.validateSubjectFields({
  name: '',
  date: '2026-11-12',
  startTime: '10:30',
  endTime: '12:30'
});
assert(!emptyNameValidation.valid, 'Empty name rejected');

const invalidTimesValidation = timetable.validateSubjectFields({
  name: 'Physics',
  date: '2026-11-12',
  startTime: '14:00',
  endTime: '12:00'
});
assert(!invalidTimesValidation.valid, 'End time before start time rejected');

// Test Conflict / Overlap Detection
const overlappingList = [
  { name: 'Exam A', date: '2026-11-12', startTime: '10:00', endTime: '12:00' },
  { name: 'Exam B', date: '2026-11-12', startTime: '11:00', endTime: '13:00' }
];
const conflictResult = timetable.validateTimetable(overlappingList);
assert(!conflictResult.valid, 'Overlapping exam schedules detected as error');

// Test Same Day Non-overlapping Schedules
const sameDayNonOverlap = [
  { name: 'Morning Exam', date: '2026-11-12', startTime: '09:00', endTime: '11:00' },
  { name: 'Afternoon Exam', date: '2026-11-12', startTime: '14:00', endTime: '16:00' }
];
const sameDayResult = timetable.validateTimetable(sameDayNonOverlap);
assert(sameDayResult.valid, 'Multiple non-overlapping exams on same day accepted');

// Test Chronological Sorting
const unsorted = [
  { name: 'Late Exam', date: '2026-11-16', startTime: '10:00', endTime: '12:00' },
  { name: 'Early Exam', date: '2026-11-10', startTime: '10:00', endTime: '12:00' },
  { name: 'Middle Exam', date: '2026-11-12', startTime: '10:00', endTime: '12:00' }
];
const sorted = timetable.sanitizeAndSort(unsorted);
assertEquals(sorted[0].name, 'Early Exam', 'Early exam sorted to 1st');
assertEquals(sorted[1].name, 'Middle Exam', 'Middle exam sorted to 2nd');
assertEquals(sorted[2].name, 'Late Exam', 'Late exam sorted to 3rd');

// Test Formatters
assertEquals(timetable.formatDuration(subj1.startMs, subj1.endMs), '2 hrs', 'Duration formatted correctly as 2 hrs');
assert(timetable.formatTime('10:30').includes('10:30'), 'Time formatter includes 10:30');

console.log('\n--- 2. Testing ExamTimerEngine State Machine & Real Time Calculations ---');

const timer = window.examTimerEngine;

// Create 3 subjects:
// S1: 2026-11-12 10:00 - 12:00
// S2: 2026-11-14 10:00 - 12:00
// S3: 2026-11-16 10:00 - 12:00
const testSubjects = timetable.sanitizeAndSort([
  { name: 'Subject 1', date: '2026-11-12', startTime: '10:00', endTime: '12:00' },
  { name: 'Subject 2', date: '2026-11-14', startTime: '10:00', endTime: '12:00' },
  { name: 'Subject 3', date: '2026-11-16', startTime: '10:00', endTime: '12:00' }
]);
timer.setSubjects(testSubjects);

const s1Start = testSubjects[0].startMs;
const s1End = testSubjects[0].endMs;
const s2Start = testSubjects[1].startMs;
const s2End = testSubjects[1].endMs;
const s3Start = testSubjects[2].startMs;
const s3End = testSubjects[2].endMs;

// Case 1: Before First Exam (e.g. 1 hour before Subject 1)
const timeBeforeFirst = s1Start - 3600 * 1000;
const state1 = timer.evaluate(timeBeforeFirst);
assertEquals(state1.state, 'UPCOMING EXAM', 'State 1: Status is UPCOMING EXAM');
assertEquals(state1.activeExam.name, 'Subject 1', 'State 1: Active exam is Subject 1');
assertEquals(state1.subjectNumber, 1, 'State 1: Subject number is 1');
assertEquals(state1.nextExam.name, 'Subject 2', 'State 1: Next exam is Subject 2');
assertEquals(state1.completedExams, 0, 'State 1: 0 completed exams');
assertEquals(state1.countdown.hours, '01', 'State 1: Exactly 1 hour remaining in countdown');

// Case 2: During First Exam (e.g. 30 mins after Subject 1 starts)
const timeDuringS1 = s1Start + 30 * 60 * 1000;
const state2 = timer.evaluate(timeDuringS1);
assertEquals(state2.state, 'EXAM IN PROGRESS', 'State 2: Status is EXAM IN PROGRESS');
assertEquals(state2.activeExam.name, 'Subject 1', 'State 2: Active exam is Subject 1');
assertEquals(state2.countdownLabel, 'Time remaining in examination.', 'State 2: Countdown label matches in-progress');
assertEquals(state2.countdown.hours, '01', 'State 2: 1 hour 30 mins remaining to end of exam');
assertEquals(state2.countdown.minutes, '30', 'State 2: 30 minutes remaining to end of exam');

// Case 3: Subject 1 Ends -> Switches to NEXT EXAM (Subject 2)
const timeBetweenS1andS2 = s1End + 3600 * 1000; // 1 hour after S1 ends
const state3 = timer.evaluate(timeBetweenS1andS2);
assertEquals(state3.state, 'NEXT EXAM', 'State 3: Status is NEXT EXAM');
assertEquals(state3.activeExam.name, 'Subject 2', 'State 3: Automatically switched to Subject 2');
assertEquals(state3.subjectNumber, 2, 'State 3: Subject number is 2');
assertEquals(state3.nextExam.name, 'Subject 3', 'State 3: Next exam preview is Subject 3');
assertEquals(state3.completedExams, 1, 'State 3: 1 exam completed');
assertEquals(state3.remainingExams, 2, 'State 3: 2 exams remaining');

// Case 4: During Subject 3 (Last Exam)
const timeDuringS3 = s3Start + 15 * 60 * 1000;
const state4 = timer.evaluate(timeDuringS3);
assertEquals(state4.state, 'EXAM IN PROGRESS', 'State 4: Status is EXAM IN PROGRESS');
assertEquals(state4.activeExam.name, 'Subject 3', 'State 4: Active exam is Subject 3');
assertEquals(state4.nextExam, null, 'State 4: No next exam preview when on last exam');
assertEquals(state4.completedExams, 2, 'State 4: 2 completed exams');

// Case 5: All Exams Concluded
const timeAfterAll = s3End + 1000;
const state5 = timer.evaluate(timeAfterAll);
assertEquals(state5.state, 'ALL EXAMS COMPLETED', 'State 5: Status is ALL EXAMS COMPLETED');
assertEquals(state5.isCompleted, true, 'State 5: isCompleted is true');
assertEquals(state5.completedExams, 3, 'State 5: All 3 exams marked completed');
assertEquals(state5.remainingExams, 0, 'State 5: 0 remaining exams');
assertEquals(state5.progressPercent, 100, 'State 5: Progress is 100%');

console.log('\n--- 3. Testing StorageService Persistence ---');

const storage = window.storageService;
storage.clearTimetable();
assertEquals(storage.loadTimetable().length, 0, 'Cleared timetable returns empty array');

storage.saveTimetable(testSubjects);
const reloaded = storage.loadTimetable();
assertEquals(reloaded.length, 3, 'Loaded saved timetable returns 3 subjects');
assertEquals(reloaded[0].name, 'Subject 1', 'First subject matches stored name');

console.log(`\n========================================`);
console.log(`Total tests: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
console.log(`========================================\n`);

if (totalTests === passedTests) {
  process.exit(0);
} else {
  process.exit(1);
}


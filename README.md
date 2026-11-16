# EXAM TIMER — Minimalist Exam Countdown Web App

A modern, responsive web application with a strict black-and-white minimalist aesthetic, designed to help students track upcoming examinations through an automated digital countdown timer — because apparently, my brain needs a countdown to understand the meaning of a deadline. 💀

---

## 🌟 Key Features

1. **Automatic Subject Switching (Zero Manual Toggling)**:
   - Evaluates the timetable every second against real system timestamps.
   - Automatically switches from **UPCOMING EXAM** → **EXAM IN PROGRESS** → **COMPLETED** → **NEXT EXAM** → **ALL EXAMS COMPLETED**.
   - No manual intervention needed during or between exams.

2. **Timestamp-Accurate Engine**:
   - Calculated strictly using JavaScript `Date` timestamps in the user's local timezone.
   - 100% resilient across page reloads, tab closure, laptop shutdowns, and multi-day gaps.
   - Handles multiple exams on the same day seamlessly (e.g. morning and afternoon sessions).

3. **Strict Black-and-White Minimalist Aesthetic**:
   - Palette: `#000000` (Deep Black Background), `#FFFFFF` (Crisp White Text & Primary Buttons), `#0A0A0A` / `#0F0F0F` (Dark Card Surfaces), `#A0A0A0` (Secondary Text), `#282828` / `#1F1F1F` (Borders).
   - High-contrast, distraction-free SaaS productivity aesthetic (inspired by Linear, Raycast, and Vercel dark mode).
   - Tabular monospaced numerals (`JetBrains Mono`, `font-variant-numeric: tabular-nums`) so countdown digits never jump horizontally.

4. **Dynamic Timetable Management & 12-Hour AM/PM Input**:
   - Strict 12-hour AM/PM format used throughout the entire app (time input with AM/PM selector, schedule displays, live countdowns, conflict alerts, and clipboard export).
   - Flexible subject count picker (1–25 subjects) with dynamic form generation.
   - Rigorous validation:
     - Subject name required (min 2 characters).
     - Exam date required (YYYY-MM-DD).
     - Start time and end time required in 12-hour format (e.g. 10:30 AM, 12:30 PM).
     - End time must be strictly after start time.
     - Overlapping schedule conflict detection (warns if two exams overlap).
     - Duplicate subject name detection.
   - Full CRUD support: Add, Edit, or Delete individual examinations directly from the dashboard.
   - Chronological auto-sorting by examination date and start time.

5. **Live Status & Statistics**:
   - Large digital countdown (`DAYS : HOURS : MINUTES : SECONDS`).
   - Dynamic status badges with pulsing live indicators.
   - Overall examination progress bar (e.g., `2 of 5 completed (40%)`).
   - Next examination preview card.
   - Summary statistics (Remaining, Completed, Total).
   - Live header clock and date display.

6. **Web Notifications & Subtle Audio Feedback**:
   - Opt-in Web Notification API integration (permission requested only when the user enables alerts).
   - Dispatches notifications when an exam begins, finishes, and when all exams conclude.
   - Embedded Web Audio API chime (synthesizer tone, zero external audio assets required).

7. **Dedicated Pomodoro Focus Timer**:
   - Integrated study timer with quick-switch presets:
     - **10 : 02** (10m focus · 2m break)
     - **30 : 10** (30m focus · 10m break)
     - **45 : 15** (45m focus · 15m break)
     - **60 : 20** (60m focus · 20m break)
   - Visual SVG countdown ring, cycle tracker, interval history log, audio chimes, and live tab title updates.
   - Dedicated distraction-free focus screen accessible directly from the top navigation bar.

8. **Zero Dependencies & Full Privacy**:
   - Pure Vanilla HTML5, CSS3, and JavaScript (ES6+).
   - `LocalStorage` persistence with in-memory fallback for private browsing.
   - No login, no backend, no telemetry, no ads.

---

## 📁 Project Architecture

```
Exam_Timer/
├── index.html            # Semantic HTML5 layout and view containers
├── css/
│   └── style.css         # Minimalist monochrome responsive design system
├── js/
│   ├── storage.js        # LocalStorage wrapper with validation & memory fallback
│   ├── timetable.js      # Timetable data model, validation, overlap detection & sorting
│   ├── timer.js          # Core real-time state machine & countdown calculation
│   └── app.js            # UI controller, view router, notifications & audio
├── assets/
│   └── icon.svg          # Minimalist clock logo icon
└── README.md             # Project documentation
```

---

## 🚀 How to Run the Application

Simply open `index.html` in any modern web browser:
- Double click `index.html`, or
- Open in VS Code with the Live Server extension, or
- Run a local static server:
  ```bash
  npx serve .
  ```

---

## 🧪 Automatic State Machine Workflow

```
[ Welcome Screen ]
       │
       ▼
[ Timetable Setup Form ]
       │ (Validate & Save)
       ▼
┌─────────────────────────────────────────────────────────────┐
│                      TIMER STATE MACHINE                    │
│                                                             │
│  State 1: UPCOMING EXAM                                     │
│  • Current Time < Exam Start Time                           │
│  • Countdown displays time remaining until exam start       │
│                                                             │
│  State 2: EXAM IN PROGRESS                                  │
│  • Exam Start Time <= Current Time < Exam End Time          │
│  • Countdown displays time remaining in the paper           │
│  • Pulsing active status badge                              │
│                                                             │
│  State 3: COMPLETED & NEXT EXAM                             │
│  • Current Time >= Exam End Time                            │
│  • Auto-marks paper as completed                            │
│  • Increments completed counter                             │
│  • Automatically switches active countdown to Next Exam     │
│                                                             │
│  State 4: ALL EXAMS COMPLETED                               │
│  • All scheduled examinations have finished                 │
│  • Displays completion summary with option to reset         │
└─────────────────────────────────────────────────────────────┘
```


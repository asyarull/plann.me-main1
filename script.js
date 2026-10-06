/**
 * Plan.me — Personal Productivity
 * State · Storage · Timer · Render · Events
 */

(function () {
  "use strict";

  /* ---------- Constants ---------- */

  const STORAGE_KEYS = {
    tasks: "planme_tasks",
    note: "planme_note",
    sessionCount: "planme_session_count",
  };

  /* Legacy keys from earlier builds — migrated once, then removed */
  const LEGACY_KEYS = {
    tasks: "vinoos_tasks",
    note: "vinoos_note",
    seeded: "vinoos_seeded",
    sessionCount: "vinoos_session_count",
  };

  const CATEGORIES = ["TODAY", "PERSONAL", "LEARNING", "PROJECTS"];
  const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
  const FOCUS_SECONDS = 25 * 60;
  const NOTE_SAVE_DELAY = 450;

  const SAMPLE_TASKS = [
    {
      id: "sample-1",
      title: "Finish personal project",
      category: "PROJECTS",
      priority: "HIGH",
      deadline: "",
      completed: false,
      createdAt: Date.now() - 5000,
    },
    {
      id: "sample-2",
      title: "Study mathematics",
      category: "LEARNING",
      priority: "MEDIUM",
      deadline: "",
      completed: false,
      createdAt: Date.now() - 4000,
    },
    {
      id: "sample-3",
      title: "Read JavaScript documentation",
      category: "LEARNING",
      priority: "LOW",
      deadline: "",
      completed: true,
      createdAt: Date.now() - 3000,
    },
    {
      id: "sample-4",
      title: "Upload project to GitHub",
      category: "PROJECTS",
      priority: "HIGH",
      deadline: "",
      completed: false,
      createdAt: Date.now() - 2000,
    },
    {
      id: "sample-5",
      title: "Review today's notes",
      category: "TODAY",
      priority: "MEDIUM",
      deadline: "",
      completed: true,
      createdAt: Date.now() - 1000,
    },
    {
      id: "sample-6",
      title: "Plan evening walk",
      category: "PERSONAL",
      priority: "LOW",
      deadline: "",
      completed: false,
      createdAt: Date.now(),
    },
  ];

  /* ---------- State ---------- */

  const state = {
    tasks: [],
    note: "",
    editingId: null,
    focus: {
      remaining: FOCUS_SECONDS,
      running: false,
      paused: false,
      session: 1,
      intervalId: null,
    },
  };

  /* ---------- DOM refs ---------- */

  const els = {
    currentDate: document.getElementById("current-date"),
    greetingTitle: document.getElementById("greeting-title"),
    greetingSub: document.getElementById("greeting-sub"),
    greetingRing: document.getElementById("greeting-ring"),
    greetingPct: document.getElementById("greeting-pct"),
    greetingProgressLabel: document.getElementById("greeting-progress-label"),
    taskList: document.getElementById("task-list"),
    emptyState: document.getElementById("empty-state"),
    completedCount: document.getElementById("completed-count"),
    totalCount: document.getElementById("total-count"),
    statCompleted: document.getElementById("stat-completed"),
    statRemaining: document.getElementById("stat-remaining"),
    statPercent: document.getElementById("stat-percent"),
    progressBar: document.getElementById("progress-bar"),
    progressBarFill: document.getElementById("progress-bar-fill"),
    quickNote: document.getElementById("quick-note"),
    saveIndicator: document.getElementById("save-indicator"),
    timerTime: document.getElementById("timer-time"),
    timerStatus: document.getElementById("timer-status"),
    timerDisplay: document.getElementById("timer-display"),
    sessionLabel: document.getElementById("session-label"),
    timerStart: document.getElementById("timer-start"),
    timerPause: document.getElementById("timer-pause"),
    timerReset: document.getElementById("timer-reset"),
    fabAdd: document.getElementById("fab-add"),
    emptyAddBtn: document.getElementById("empty-add-btn"),
    modalBackdrop: document.getElementById("modal-backdrop"),
    taskModal: document.getElementById("task-modal"),
    modalTitle: document.getElementById("modal-title"),
    modalClose: document.getElementById("modal-close"),
    modalCancel: document.getElementById("modal-cancel"),
    modalSubmit: document.getElementById("modal-submit"),
    taskForm: document.getElementById("task-form"),
    taskId: document.getElementById("task-id"),
    taskName: document.getElementById("task-name"),
    taskCategory: document.getElementById("task-category"),
    taskPriority: document.getElementById("task-priority"),
    taskDeadline: document.getElementById("task-deadline"),
    nameError: document.getElementById("name-error"),
    settingsBtn: document.getElementById("settings-btn"),
    settingsBackdrop: document.getElementById("settings-backdrop"),
    settingsClose: document.getElementById("settings-close"),
    settingsDone: document.getElementById("settings-done"),
    clearDataBtn: document.getElementById("clear-data-btn"),
  };

  /* ---------- Storage ---------- */

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn("Plan.me: could not save", key, err);
    }
  }

  function migrateLegacyStorage() {
    try {
      if (localStorage.getItem(STORAGE_KEYS.tasks) === null) {
        const legacyTasks = localStorage.getItem(LEGACY_KEYS.tasks);
        if (legacyTasks !== null) {
          localStorage.setItem(STORAGE_KEYS.tasks, legacyTasks);
        }
      }

      if (localStorage.getItem(STORAGE_KEYS.note) === null) {
        const legacyNote = localStorage.getItem(LEGACY_KEYS.note);
        if (legacyNote !== null) {
          localStorage.setItem(STORAGE_KEYS.note, legacyNote);
        }
      }

      if (localStorage.getItem(STORAGE_KEYS.sessionCount) === null) {
        const legacySession = localStorage.getItem(LEGACY_KEYS.sessionCount);
        if (legacySession !== null) {
          localStorage.setItem(STORAGE_KEYS.sessionCount, legacySession);
        }
      }

      localStorage.removeItem(LEGACY_KEYS.tasks);
      localStorage.removeItem(LEGACY_KEYS.note);
      localStorage.removeItem(LEGACY_KEYS.seeded);
      localStorage.removeItem(LEGACY_KEYS.sessionCount);
    } catch (err) {
      console.warn("Plan.me: legacy migrate failed", err);
    }
  }

  /**
   * Sample tasks only when the tasks key is genuinely absent.
   * An existing empty array [] means the user cleared everything — keep it empty.
   */
  function initializeTasksIfNeeded() {
    if (localStorage.getItem(STORAGE_KEYS.tasks) !== null) return;

    const samples = SAMPLE_TASKS.map((t, i) => ({
      ...t,
      createdAt: Date.now() - (SAMPLE_TASKS.length - i) * 1000,
    }));
    saveJSON(STORAGE_KEYS.tasks, samples);
  }

  function loadTasks() {
    initializeTasksIfNeeded();
    const tasks = loadJSON(STORAGE_KEYS.tasks, []);
    return Array.isArray(tasks) ? tasks.filter(isValidTask) : [];
  }

  function isValidTask(task) {
    return (
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      task.title.trim().length > 0 &&
      CATEGORIES.includes(task.category) &&
      PRIORITIES.includes(task.priority) &&
      typeof task.completed === "boolean"
    );
  }

  function saveTasks() {
    saveJSON(STORAGE_KEYS.tasks, state.tasks);
  }

  function loadNote() {
    try {
      return localStorage.getItem(STORAGE_KEYS.note) || "";
    } catch {
      return "";
    }
  }

  function persistNote(value) {
    try {
      localStorage.setItem(STORAGE_KEYS.note, value);
    } catch (err) {
      console.warn("Plan.me: could not save note", err);
    }
  }

  function loadSessionCount() {
    const n = parseInt(localStorage.getItem(STORAGE_KEYS.sessionCount) || "1", 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function persistSessionCount(n) {
    localStorage.setItem(STORAGE_KEYS.sessionCount, String(n));
  }

  /* ---------- Helpers ---------- */

  function uid() {
    return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getTimeGreeting(date) {
    const hour = (date || new Date()).getHours();

    if (hour >= 5 && hour < 12) {
      return {
        greeting: "Good morning, Mr/Ms.",
        subtitle: "Let's plan a productive day.",
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        greeting: "Good afternoon, Mr/Ms.",
        subtitle: "Let's keep the momentum going.",
      };
    }
    if (hour >= 17 && hour < 21) {
      return {
        greeting: "Good evening, Mr/Ms.",
        subtitle: "Let's make some progress.",
      };
    }
    return {
      greeting: "Good night, Mr/Ms.",
      subtitle: "Let's wrap things up.",
    };
  }

  function formatDate(date) {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const weekday = days[date.getDay()];
    const d = String(date.getDate()).padStart(2, "0");
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    const localIso =
      y +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      d;
    return { display: weekday + ", " + d + " " + m + " " + y, iso: localIso };
  }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return mm + ":" + ss;
  }

  function formatDeadline(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter((t) => t.completed).length;
    const remaining = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, remaining, percent };
  }

  /* ---------- Render ---------- */

  function renderHeader() {
    const now = new Date();
    const { display, iso } = formatDate(now);
    const { greeting, subtitle } = getTimeGreeting(now);
    els.currentDate.textContent = display;
    els.currentDate.setAttribute("datetime", iso);
    els.greetingTitle.textContent = greeting;
    els.greetingSub.textContent = subtitle;
  }

  function renderProgress() {
    const { total, completed, remaining, percent } = getStats();
    const circumference = 2 * Math.PI * 18;

    els.completedCount.textContent = String(completed);
    els.totalCount.textContent = String(total);
    els.statCompleted.textContent = String(completed);
    els.statRemaining.textContent = String(remaining);
    els.statPercent.textContent = percent + "%";
    els.progressBarFill.style.width = percent + "%";
    els.progressBar.setAttribute("aria-valuenow", String(percent));

    els.greetingPct.textContent = percent + "%";
    els.greetingProgressLabel.textContent =
      total === 0 ? "No tasks yet" : completed + " of " + total + " done";
    els.greetingRing.style.strokeDasharray = String(circumference);
    els.greetingRing.style.strokeDashoffset = String(
      circumference - (percent / 100) * circumference
    );
  }

  function renderTasks() {
    const tasks = state.tasks;

    if (tasks.length === 0) {
      els.taskList.innerHTML = "";
      els.taskList.hidden = true;
      els.emptyState.hidden = false;
      renderProgress();
      return;
    }

    els.emptyState.hidden = true;
    els.taskList.hidden = false;

    const grouped = {};
    CATEGORIES.forEach((c) => {
      grouped[c] = [];
    });

    tasks
      .slice()
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .forEach((task) => {
        if (grouped[task.category]) grouped[task.category].push(task);
        else grouped.TODAY.push(task);
      });

    let html = "";

    CATEGORIES.forEach((category) => {
      const items = grouped[category];
      if (!items.length) return;

      html +=
        '<section class="task-section" aria-label="' +
        escapeHTML(category) +
        '">' +
        '<h3 class="section-label" data-category="' +
        escapeHTML(category) +
        '">' +
        escapeHTML(category) +
        "</h3>";

      items.forEach((task) => {
        const deadlineText = formatDeadline(task.deadline);
        const priorityClass = "priority-" + task.priority.toLowerCase();

        html +=
          '<article class="task-item' +
          (task.completed ? " is-complete" : "") +
          '" role="listitem" data-id="' +
          escapeHTML(task.id) +
          '">' +
          '<label class="task-check">' +
          '<input type="checkbox" ' +
          (task.completed ? "checked " : "") +
          'aria-label="Mark &quot;' +
          escapeHTML(task.title) +
          '&quot; as ' +
          (task.completed ? "incomplete" : "complete") +
          '" />' +
          '<span class="box" aria-hidden="true"></span>' +
          "</label>" +
          '<div class="task-body">' +
          '<p class="task-title">' +
          escapeHTML(task.title) +
          "</p>" +
          '<div class="task-meta">' +
          '<span class="meta-chip ' +
          priorityClass +
          '">' +
          escapeHTML(task.priority) +
          "</span>" +
          (deadlineText
            ? '<span class="meta-deadline">' + escapeHTML(deadlineText) + "</span>"
            : "") +
          "</div>" +
          "</div>" +
          '<div class="task-actions">' +
          '<button type="button" class="task-action" data-action="edit" aria-label="Edit task">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
          "</button>" +
          '<button type="button" class="task-action task-action--danger" data-action="delete" aria-label="Delete task">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>' +
          "</button>" +
          "</div>" +
          "</article>";
      });

      html += "</section>";
    });

    els.taskList.innerHTML = html;
    renderProgress();
  }

  function renderTimer() {
    const { remaining, running, paused, session } = state.focus;
    const display = formatTime(remaining);

    els.timerTime.textContent = display;
    els.timerTime.setAttribute("datetime", "PT" + Math.floor(remaining / 60) + "M" + (remaining % 60) + "S");
    els.sessionLabel.textContent = "Focus Session #" + session;

    let status = "Ready";
    let dataState = "idle";

    if (remaining === 0) {
      status = "Focus session complete";
      dataState = "complete";
    } else if (running) {
      status = "Focusing";
      dataState = "running";
    } else if (paused) {
      status = "Paused";
      dataState = "paused";
    }

    els.timerStatus.textContent = status;
    els.timerDisplay.setAttribute("data-state", dataState);

    els.timerPause.disabled = !running;

    if (remaining === 0) {
      els.timerStart.disabled = false;
      els.timerStart.textContent = "New Session";
    } else if (running) {
      els.timerStart.disabled = true;
      els.timerStart.textContent = "Start";
    } else if (paused) {
      els.timerStart.disabled = false;
      els.timerStart.textContent = "Resume";
    } else {
      els.timerStart.disabled = false;
      els.timerStart.textContent = "Start";
    }
  }

  function renderAll() {
    renderHeader();
    renderTasks();
    renderTimer();
  }

  /* ---------- Task actions ---------- */

  function addTask(data) {
    const task = {
      id: uid(),
      title: data.title.trim(),
      category: data.category,
      priority: data.priority,
      deadline: data.deadline || "",
      completed: false,
      createdAt: Date.now(),
    };

    if (!isValidTask(task)) return false;

    state.tasks.unshift(task);
    saveTasks();
    renderTasks();
    return true;
  }

  function updateTask(id, data) {
    const index = state.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    const updated = {
      ...state.tasks[index],
      title: data.title.trim(),
      category: data.category,
      priority: data.priority,
      deadline: data.deadline || "",
    };

    if (!isValidTask(updated)) return false;

    state.tasks[index] = updated;
    saveTasks();
    renderTasks();
    return true;
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    saveTasks();
    renderTasks();
  }

  function toggleTask(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }

  /* ---------- Modal ---------- */

  function openModal(mode, task) {
    state.editingId = mode === "edit" && task ? task.id : null;
    els.nameError.hidden = true;
    els.taskName.classList.remove("is-invalid");

    if (state.editingId && task) {
      els.modalTitle.textContent = "Edit Task";
      els.modalSubmit.textContent = "Save Changes";
      els.taskId.value = task.id;
      els.taskName.value = task.title;
      els.taskCategory.value = task.category;
      els.taskPriority.value = task.priority;
      els.taskDeadline.value = task.deadline || "";
    } else {
      els.modalTitle.textContent = "Add Task";
      els.modalSubmit.textContent = "Add Task";
      els.taskForm.reset();
      els.taskId.value = "";
      els.taskPriority.value = "MEDIUM";
      els.taskCategory.value = "TODAY";
    }

    els.modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => els.taskName.focus());
  }

  function closeModal() {
    els.modalBackdrop.hidden = true;
    document.body.style.overflow = "";
    state.editingId = null;
    els.taskForm.reset();
    els.nameError.hidden = true;
  }

  function openSettings() {
    els.settingsBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeSettings() {
    els.settingsBackdrop.hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- Timer ---------- */

  function clearFocusInterval() {
    if (state.focus.intervalId !== null) {
      clearInterval(state.focus.intervalId);
      state.focus.intervalId = null;
    }
  }

  function tickFocus() {
    if (state.focus.remaining <= 1) {
      state.focus.remaining = 0;
      state.focus.running = false;
      state.focus.paused = false;
      clearFocusInterval();
      renderTimer();
      return;
    }
    state.focus.remaining -= 1;
    renderTimer();
  }

  function startFocus() {
    if (state.focus.running) return;

    if (state.focus.remaining === 0) {
      state.focus.remaining = FOCUS_SECONDS;
      state.focus.session += 1;
      persistSessionCount(state.focus.session);
    }

    state.focus.running = true;
    state.focus.paused = false;
    clearFocusInterval();
    state.focus.intervalId = setInterval(tickFocus, 1000);
    renderTimer();
  }

  function pauseFocus() {
    if (!state.focus.running) return;
    state.focus.running = false;
    state.focus.paused = true;
    clearFocusInterval();
    renderTimer();
  }

  function resetFocus() {
    clearFocusInterval();
    state.focus.remaining = FOCUS_SECONDS;
    state.focus.running = false;
    state.focus.paused = false;
    renderTimer();
  }

  /* ---------- Note ---------- */

  let noteTimer = null;

  function scheduleNoteSave() {
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      const value = els.quickNote.value;
      state.note = value;
      persistNote(value);
      showSaved();
    }, NOTE_SAVE_DELAY);
  }

  function showSaved() {
    els.saveIndicator.textContent = "Saved";
    els.saveIndicator.classList.add("is-visible");
    setTimeout(() => {
      els.saveIndicator.classList.remove("is-visible");
    }, 1400);
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    els.fabAdd.addEventListener("click", () => openModal("add"));
    els.emptyAddBtn.addEventListener("click", () => openModal("add"));

    els.modalClose.addEventListener("click", closeModal);
    els.modalCancel.addEventListener("click", closeModal);

    els.modalBackdrop.addEventListener("click", (e) => {
      if (e.target === els.modalBackdrop) closeModal();
    });

    els.taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = els.taskName.value.trim();

      if (!title) {
        els.nameError.hidden = false;
        els.taskName.focus();
        return;
      }

      els.nameError.hidden = true;

      const data = {
        title,
        category: els.taskCategory.value,
        priority: els.taskPriority.value,
        deadline: els.taskDeadline.value,
      };

      let ok;
      if (state.editingId) {
        ok = updateTask(state.editingId, data);
      } else {
        ok = addTask(data);
      }

      if (ok) closeModal();
    });

    els.taskList.addEventListener("click", (e) => {
      const item = e.target.closest(".task-item");
      if (!item) return;
      const id = item.dataset.id;

      const actionBtn = e.target.closest("[data-action]");
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === "edit") {
          const task = state.tasks.find((t) => t.id === id);
          if (task) openModal("edit", task);
        } else if (action === "delete") {
          deleteTask(id);
        }
        return;
      }
    });

    els.taskList.addEventListener("change", (e) => {
      if (e.target.matches('.task-check input[type="checkbox"]')) {
        const item = e.target.closest(".task-item");
        if (item) toggleTask(item.dataset.id);
      }
    });

    els.timerStart.addEventListener("click", startFocus);
    els.timerPause.addEventListener("click", pauseFocus);
    els.timerReset.addEventListener("click", resetFocus);

    els.quickNote.addEventListener("input", scheduleNoteSave);

    els.settingsBtn.addEventListener("click", openSettings);
    els.settingsClose.addEventListener("click", closeSettings);
    els.settingsDone.addEventListener("click", closeSettings);
    els.settingsBackdrop.addEventListener("click", (e) => {
      if (e.target === els.settingsBackdrop) closeSettings();
    });

    els.clearDataBtn.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Clear all tasks and notes? Sample tasks will be restored on next load."
      );
      if (!confirmed) return;

      clearFocusInterval();
      localStorage.removeItem(STORAGE_KEYS.tasks);
      localStorage.removeItem(STORAGE_KEYS.note);
      localStorage.removeItem(STORAGE_KEYS.sessionCount);
      localStorage.removeItem(LEGACY_KEYS.tasks);
      localStorage.removeItem(LEGACY_KEYS.note);
      localStorage.removeItem(LEGACY_KEYS.seeded);
      localStorage.removeItem(LEGACY_KEYS.sessionCount);

      state.tasks = loadTasks();
      state.note = "";
      els.quickNote.value = "";
      state.focus = {
        remaining: FOCUS_SECONDS,
        running: false,
        paused: false,
        session: 1,
        intervalId: null,
      };
      closeSettings();
      renderAll();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!els.modalBackdrop.hidden) closeModal();
        if (!els.settingsBackdrop.hidden) closeSettings();
      }
    });
  }

  /* ---------- Init ---------- */

  function init() {
    migrateLegacyStorage();
    state.tasks = loadTasks();
    state.note = loadNote();
    state.focus.session = loadSessionCount();
    els.quickNote.value = state.note;

    bindEvents();
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

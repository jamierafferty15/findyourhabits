const STORAGE_KEY = 'routineTrackerV1';
const MAX_HABITS = 8;

let now = new Date();
let today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
let todayDate = new Date(today.y, today.m, today.d);

let state = loadState();
let focusDate = new Date(today.y, today.m, today.d);
let heatmapHabitId = 'all';
let selectedHeatmapDateKey = null;

const els = {
  body: document.body,
  themeToggle: document.getElementById('themeToggle'),
  shareBtn: document.getElementById('shareBtn'),
  habitCounter: document.getElementById('habitCounter'),
  starterHint: document.getElementById('starterHint'),
  editHabitsBtn: document.getElementById('editHabitsBtn'),
  habitEditorArea: document.getElementById('habitEditorArea'),
  habitEditorList: document.getElementById('habitEditorList'),
  habitForm: document.getElementById('habitForm'),
  habitInput: document.getElementById('habitInput'),
  formMessage: document.getElementById('formMessage'),
  monthViewBtn: document.getElementById('monthViewBtn'),
  weekViewBtn: document.getElementById('weekViewBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  todayBtn: document.getElementById('todayBtn'),
  periodTitle: document.getElementById('periodTitle'),
  tableHead: document.getElementById('tableHead'),
  tableBody: document.getElementById('tableBody'),
  heatmapHabitSelect: document.getElementById('heatmapHabitSelect'),
  heatmapGrid: document.getElementById('heatmapGrid'),
  heatmapSummary: document.getElementById('heatmapSummary'),
  heatmapDetail: document.getElementById('heatmapDetail'),
  overallPct: document.getElementById('overallPct'),
  completedCount: document.getElementById('completedCount'),
  bestStreak: document.getElementById('bestStreak'),
  habitCount: document.getElementById('habitCount'),
  habitStats: document.getElementById('habitStats'),
  overallComparison: document.getElementById('overallComparison'),
  archivedHabitsArea: document.getElementById('archivedHabitsArea'),
  archivedHabitList: document.getElementById('archivedHabitList'),
  exportBtn: document.getElementById('exportBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  resetMonthBtn: document.getElementById('resetMonthBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),
  dataMessage: document.getElementById('dataMessage')
};

function defaultState() {
  return {
    theme: 'light',
    viewMode: 'week',
    habits: [
      { id: 'run', name: 'Run', targetType: 'weekly', weeklyTarget: 3 },
      { id: 'walk', name: 'Walk', targetType: 'daily', weeklyTarget: 7 },
      { id: 'water', name: 'Water', targetType: 'daily', weeklyTarget: 7 }
    ],
    data: {},
    notes: {},
    customised: false
  };
}

function stripLeadingEmoji(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]+\s*/u, '').trim();
}

function normaliseHabit(habit) {
  const targetType = ['daily', 'weekdays', 'weekly'].includes(habit?.targetType) ? habit.targetType : 'daily';
  const rawTarget = Number(habit?.weeklyTarget);
  const weeklyTarget = Number.isFinite(rawTarget) ? Math.min(7, Math.max(1, Math.round(rawTarget))) : 7;
  return {
    ...habit,
    name: stripLeadingEmoji(habit?.name) || 'Habit',
    targetType,
    weeklyTarget: targetType === 'weekly' ? weeklyTarget : (targetType === 'weekdays' ? 5 : 7),
    archived: Boolean(habit?.archived),
    archivedAt: habit?.archivedAt || null,
    createdAt: /^\d{4}-\d{2}-\d{2}$/.test(habit?.createdAt || '') ? habit.createdAt : null
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      habits: Array.isArray(parsed.habits) ? parsed.habits.map(normaliseHabit) : defaultState().habits,
      data: parsed.data && typeof parsed.data === 'object' ? parsed.data : {},
      notes: parsed.notes && typeof parsed.notes === 'object' && !Array.isArray(parsed.notes) ? parsed.notes : {},
      customised: Boolean(parsed.customised)
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setShareSuccess(active) {
  if (!els.shareBtn) return;
  els.shareBtn.classList.toggle('is-success', active);
  els.shareBtn.innerHTML = active
    ? `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 13l4 4L19 7"></path></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 16V4"></path><path d="M8 8l4-4 4 4"></path><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"></path></svg>`;
  els.shareBtn.title = active ? 'Link copied' : 'Share';
  els.shareBtn.setAttribute('aria-label', active ? 'Link copied' : 'Share FindYourHabits');
}

async function shareSite() {
  const shareUrl = window.location.origin && window.location.origin !== 'null'
    ? `${window.location.origin}${window.location.pathname}`
    : window.location.href;

  const shareData = {
    title: 'FindYourHabits',
    text: 'Track habits, progress and consistency with FindYourHabits.',
    url: shareUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    let copied = false;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
    } else {
      const input = document.createElement('input');
      input.value = shareUrl;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      copied = document.execCommand('copy');
      input.remove();
    }

    if (copied) {
      setShareSuccess(true);
      window.setTimeout(() => setShareSuccess(false), 1600);
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return;

    // Final fallback: copy using the legacy selection route.
    try {
      const input = document.createElement('input');
      input.value = shareUrl;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();

      if (copied) {
        setShareSuccess(true);
        window.setTimeout(() => setShareSuccess(false), 1600);
      }
    } catch (fallbackError) {
      console.error(fallbackError);
    }
  }
}


function refreshTodayReference() {
  const fresh = new Date();
  const freshDate = new Date(fresh.getFullYear(), fresh.getMonth(), fresh.getDate());
  const changed = !sameDate(freshDate, todayDate);
  now = fresh;
  today = { y: fresh.getFullYear(), m: fresh.getMonth(), d: fresh.getDate() };
  todayDate = freshDate;
  return changed;
}

function isFutureDate(date) {
  return date.getTime() > todayDate.getTime();
}

function isPastDate(date) {
  return date.getTime() < todayDate.getTime();
}

function elapsedDates(dates) {
  return dates.filter(date => !isFutureDate(date));
}

function expectedDates(dates) {
  // Today is still in progress. Do not treat an unfinished current day as a failure.
  return dates.filter(date => isPastDate(date));
}

function calendarDayOrdinal(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function calendarWeekDiff(a, b) {
  return Math.round((calendarDayOrdinal(a) - calendarDayOrdinal(b)) / 7);
}


function sanitiseImportedState(value) {
  if (!value || typeof value !== 'object') throw new Error('The backup file does not contain valid tracker data.');

  const candidate = value.state && typeof value.state === 'object' ? value.state : value;
  if (!Array.isArray(candidate.habits)) throw new Error('The backup is missing its habits list.');

  const habits = candidate.habits
    .filter(habit => habit && typeof habit === 'object')
    .map((habit, index) => normaliseHabit({
      ...habit,
      id: typeof habit.id === 'string' && habit.id.trim() ? habit.id.trim() : `imported-${index + 1}`,
      name: typeof habit.name === 'string' ? habit.name : 'Habit'
    }));

  const ids = new Set();
  habits.forEach(habit => {
    if (ids.has(habit.id)) throw new Error('The backup contains duplicate habit IDs.');
    ids.add(habit.id);
  });

  if (habits.filter(habit => !habit.archived).length > MAX_HABITS) {
    throw new Error(`This backup contains more than ${MAX_HABITS} active habits.`);
  }

  const cleanData = {};
  if (candidate.data && typeof candidate.data === 'object' && !Array.isArray(candidate.data)) {
    Object.entries(candidate.data).forEach(([month, habitMap]) => {
      if (!/^\d{4}-\d{2}$/.test(month) || !habitMap || typeof habitMap !== 'object' || Array.isArray(habitMap)) return;
      cleanData[month] = {};
      Object.entries(habitMap).forEach(([habitId, days]) => {
        if (!Array.isArray(days)) return;
        const cleanDays = [...new Set(days
          .map(Number)
          .filter(day => Number.isInteger(day) && day >= 1 && day <= 31))]
          .sort((a, b) => a - b);
        cleanData[month][habitId] = cleanDays;
      });
    });
  }

  const cleanNotes = {};
  if (candidate.notes && typeof candidate.notes === 'object' && !Array.isArray(candidate.notes)) {
    Object.entries(candidate.notes).forEach(([key, value]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === 'string' && value.trim()) {
        cleanNotes[key] = value.trim().slice(0, 240);
      }
    });
  }

  return {
    theme: candidate.theme === 'dark' ? 'dark' : 'light',
    viewMode: candidate.viewMode === 'week' ? 'week' : 'month',
    habits,
    data: cleanData,
    notes: cleanNotes,
    customised: Boolean(candidate.customised)
  };
}

function exportBackup() {
  try {
    const payload = {
      app: 'FindYourHabits',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      state
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `findyourhabits-backup-${stamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);

    // Keep the object URL alive briefly. Safari can ignore a download if the
    // URL is revoked immediately after the synthetic click.
    a.click();

    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);

    els.dataMessage.textContent = `Backup download started: ${filename}`;
  } catch (error) {
    els.dataMessage.textContent = error instanceof Error
      ? `Could not export backup: ${error.message}`
      : 'Could not export backup.';
  }
}


function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function firstCheckInDate() {
  let earliest = null;
  Object.entries(state.data || {}).forEach(([key, habitMap]) => {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match || !habitMap || typeof habitMap !== 'object') return;
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    Object.values(habitMap).forEach(days => {
      if (!Array.isArray(days)) return;
      days.forEach(rawDay => {
        const day = Number(rawDay);
        if (!Number.isInteger(day)) return;
        const date = new Date(y, m, day);
        if (Number.isNaN(date.getTime()) || isFutureDate(date)) return;
        if (!earliest || date < earliest) earliest = date;
      });
    });
  });
  return earliest;
}

function csvHabitHeaders() {
  const seen = new Map();
  return state.habits.map(habit => {
    const base = habit.archived ? `${habit.name} (archived)` : habit.name;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} ${count}`;
  });
}

function exportCsv() {
  try {
    const first = firstCheckInDate();
    if (!first) {
      els.dataMessage.textContent = 'There are no check-ins to export yet.';
      return;
    }

    const headers = ['Date', 'Day', 'Note', ...csvHabitHeaders()];
    const rows = [headers.map(csvEscape).join(',')];

    for (let date = new Date(first); date <= todayDate; date = addDays(date, 1)) {
      const values = [formatIsoDate(date), new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date), noteForDate(date)];
      state.habits.forEach(habit => {
        values.push(isDoneOnDate(habit.id, date) ? 1 : 0);
      });
      rows.push(values.map(csvEscape).join(','));
    }

    // UTF-8 BOM makes the file open cleanly in Excel while remaining plain CSV.
    const csv = `\uFEFF${rows.join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const stamp = formatIsoDate(todayDate);
    const filename = `findyourhabits-data-${stamp}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);

    els.dataMessage.textContent = `CSV download started: ${filename}. CSV is analysis-only; use JSON to restore your tracker.`;
  } catch (error) {
    els.dataMessage.textContent = error instanceof Error
      ? `Could not export CSV: ${error.message}`
      : 'Could not export CSV.';
  }
}

async function importBackup(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) throw new Error('That backup file is too large.');
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const imported = sanitiseImportedState(parsed);
  const confirmed = window.confirm('Import this backup? Your current tracker data will be replaced.');
  if (!confirmed) return;

  state = imported;
  focusDate = new Date(today.y, today.m, today.d);
  saveState();
  setEditorOpen(false);
  render();
  els.dataMessage.textContent = 'Backup restored successfully.';
}

function clearCurrentMonth() {
  const key = monthKey(today.y, today.m);
  const hasData = state.data[key] && Object.values(state.data[key]).some(days => Array.isArray(days) && days.length);
  if (!hasData) {
    els.dataMessage.textContent = 'There are no check-ins to clear for the current month.';
    return;
  }
  const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(todayDate);
  if (!window.confirm(`Clear all check-ins for ${monthLabel}? Habit names and targets will be kept.`)) return;
  delete state.data[key];
  saveState();
  render();
  els.dataMessage.textContent = `${monthLabel} check-ins cleared.`;
}

function resetAllData() {
  if (!window.confirm('Reset the entire tracker? This will remove all habits, archives and check-ins and restore the default setup.')) return;
  if (!window.confirm('Are you sure? This cannot be undone unless you exported a backup first.')) return;
  state = defaultState();
  focusDate = new Date(today.y, today.m, today.d);
  saveState();
  setEditorOpen(false);
  render();
  els.dataMessage.textContent = 'Tracker reset to the default setup.';
}

function activeHabits() {
  return state.habits.filter(habit => !habit.archived);
}

function archivedHabits() {
  return state.habits.filter(habit => habit.archived);
}

function monthKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function getMonthData(y, m) {
  const key = monthKey(y, m);
  if (!state.data[key]) state.data[key] = {};
  return state.data[key];
}

function getDaysArray(habitId, y, m) {
  const month = getMonthData(y, m);
  if (!Array.isArray(month[habitId])) month[habitId] = [];
  return month[habitId];
}

function isDoneOnDate(habitId, date) {
  if (isFutureDate(date)) return false;
  const month = state.data[monthKey(date.getFullYear(), date.getMonth())];
  const days = month && Array.isArray(month[habitId]) ? month[habitId] : [];
  return days.includes(date.getDate());
}

function hasCheckInData(habitId, dates) {
  return dates.some(date => isDoneOnDate(habitId, date));
}

function toggleDoneOnDate(habitId, date) {
  if (isFutureDate(date)) return;
  const days = getDaysArray(habitId, date.getFullYear(), date.getMonth());
  const day = date.getDate();
  const i = days.indexOf(day);
  if (i >= 0) days.splice(i, 1);
  else days.push(day);
  days.sort((a, b) => a - b);
  saveState();
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function getVisibleDates() {
  if (state.viewMode === 'month') {
    const y = focusDate.getFullYear();
    const m = focusDate.getMonth();
    return Array.from({ length: daysInMonth(y, m) }, (_, i) => new Date(y, m, i + 1));
  }
  const start = startOfWeek(focusDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
}

function formatPeriodTitle(dates) {
  if (state.viewMode === 'month') return formatMonthYear(focusDate);
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(start);
    return `${start.getDate()}–${end.getDate()} ${month} ${start.getFullYear()}`;
  }
  const left = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(start);
  const right = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(end);
  return `${left} – ${right}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function weekKey(date) {
  return dateKey(startOfWeek(date));
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstCheckInDateForHabit(habitId) {
  let earliest = null;
  Object.entries(state.data || {}).forEach(([key, habitMap]) => {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match || !habitMap || !Array.isArray(habitMap[habitId])) return;
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    habitMap[habitId].forEach(rawDay => {
      const date = new Date(y, m, Number(rawDay));
      if (Number.isNaN(date.getTime()) || isFutureDate(date)) return;
      if (!earliest || date < earliest) earliest = date;
    });
  });
  return earliest;
}

function habitStartDate(habit) {
  return parseIsoDate(habit.createdAt) || firstCheckInDateForHabit(habit.id);
}

function isOnOrAfterHabitStart(habit, date) {
  const start = habitStartDate(habit);
  return Boolean(start) && calendarDayOrdinal(date) >= calendarDayOrdinal(start);
}

function isTargetDay(habit, date) {
  if (habit.targetType === 'weekdays') {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }
  return true;
}

function targetLabel(habit) {
  if (habit.targetType === 'weekdays') return 'Weekdays';
  if (habit.targetType === 'weekly') return `${habit.weeklyTarget}× / week`;
  return 'Daily';
}

function targetForDates(habit, dates) {
  if (!dates.length) return 0;

  if (habit.targetType === 'daily') return dates.length;
  if (habit.targetType === 'weekdays') return dates.filter(date => isTargetDay(habit, date)).length;

  const groups = new Map();
  dates.forEach(date => {
    const key = weekKey(date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(date);
  });

  let target = 0;
  groups.forEach(groupDates => {
    target += Math.min(habit.weeklyTarget, groupDates.length);
  });
  return target;
}

function completedForDates(habit, dates) {
  const eligibleDates = elapsedDates(dates);
  if (habit.targetType === 'weekdays') {
    return eligibleDates.filter(date => isTargetDay(habit, date) && isDoneOnDate(habit.id, date)).length;
  }
  return eligibleDates.filter(date => isDoneOnDate(habit.id, date)).length;
}

function targetSoFar(habit, dates) {
  const expectedSoFar = expectedDates(dates);
  if (!expectedSoFar.length) return 0;
  if (habit.targetType !== 'weekly') return targetForDates(habit, expectedSoFar);

  const allGroups = new Map();
  dates.forEach(date => {
    const key = weekKey(date);
    if (!allGroups.has(key)) allGroups.set(key, []);
    allGroups.get(key).push(date);
  });

  let expected = 0;
  allGroups.forEach(groupDates => {
    const elapsedGroup = groupDates.filter(date => isPastDate(date));
    if (!elapsedGroup.length) return;
    const groupTarget = Math.min(habit.weeklyTarget, groupDates.length);
    expected += groupTarget * (elapsedGroup.length / groupDates.length);
  });
  return expected;
}

function progressStatus(habit, dates, completed) {
  const expected = targetSoFar(habit, dates);
  if (expected <= 0) return completed > 0
    ? { pacePct: 100, label: 'On track', className: 'progress-high' }
    : { pacePct: 0, label: 'Not started', className: 'progress-neutral' };
  const pacePct = Math.min(100, Math.round((completed / expected) * 100));
  if (pacePct >= 65) return { pacePct, label: 'On track', className: 'progress-high' };
  if (pacePct >= 40) return { pacePct, label: 'Watch', className: 'progress-mid' };
  return { pacePct, label: 'Behind', className: 'progress-low' };
}

function allDatesForHabit(habit) {
  const start = habitStartDate(habit);
  if (!start) return [];
  const dates = [];
  for (let date = new Date(start); date <= todayDate; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function dailyLikeStreakStats(habit) {
  const eligible = allDatesForHabit(habit).filter(date => isTargetDay(habit, date));
  let current = 0;
  let best = 0;
  let run = 0;

  eligible.forEach(date => {
    if (isDoneOnDate(habit.id, date)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  });

  let i = eligible.length - 1;
  // An unfinished today is not a broken streak until tomorrow arrives.
  if (i >= 0 && sameDate(eligible[i], todayDate) && !isDoneOnDate(habit.id, eligible[i])) i -= 1;
  for (; i >= 0; i -= 1) {
    if (isDoneOnDate(habit.id, eligible[i])) current += 1;
    else break;
  }

  return { current, best, unit: 'days' };
}

function weeklyStreakStats(habit) {
  const dates = allDatesForHabit(habit);
  if (!dates.length) return { current: 0, best: 0, unit: 'weeks' };

  const groups = [];
  const byWeek = new Map();
  dates.forEach(date => {
    const key = weekKey(date);
    if (!byWeek.has(key)) {
      const group = { key, dates: [] };
      byWeek.set(key, group);
      groups.push(group);
    }
    byWeek.get(key).dates.push(date);
  });

  const groupResult = group => {
    const target = Math.min(habit.weeklyTarget, group.dates.length);
    const completed = group.dates.filter(date => isDoneOnDate(habit.id, date)).length;
    return { target, completed, met: target > 0 && completed >= target };
  };

  let best = 0;
  let run = 0;
  groups.forEach(group => {
    const result = groupResult(group);
    const isCurrentWeek = group.dates.some(date => sameDate(date, todayDate));
    if (result.met) {
      run += 1;
      best = Math.max(best, run);
    } else if (!isCurrentWeek) {
      run = 0;
    }
  });

  let current = 0;
  let i = groups.length - 1;
  if (i >= 0) {
    const currentWeek = groups[i].dates.some(date => sameDate(date, todayDate));
    if (currentWeek && !groupResult(groups[i]).met) i -= 1;
  }
  for (; i >= 0; i -= 1) {
    if (groupResult(groups[i]).met) current += 1;
    else break;
  }

  return { current, best, unit: 'weeks' };
}

function streakStats(habit) {
  return habit.targetType === 'weekly' ? weeklyStreakStats(habit) : dailyLikeStreakStats(habit);
}

function noteForDate(date) {
  return state.notes?.[formatIsoDate(date)] || '';
}

function editNoteForDate(date) {
  if (isFutureDate(date)) return;
  const key = formatIsoDate(date);
  const existing = state.notes?.[key] || '';
  const value = window.prompt(`Note for ${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}:`, existing);
  if (value === null) return;
  state.notes = state.notes || {};
  const clean = value.trim().slice(0, 240);
  if (clean) state.notes[key] = clean;
  else delete state.notes[key];
  state.customised = true;
  saveState();
  render();
}

function totalCheckInsForHabit(habitId) {
  let total = 0;
  let last = null;
  Object.entries(state.data || {}).forEach(([month, habitMap]) => {
    if (!habitMap || !Array.isArray(habitMap[habitId])) return;
    const [y, m] = month.split('-').map(Number);
    habitMap[habitId].forEach(day => {
      total += 1;
      const d = new Date(y, m - 1, Number(day));
      if (!last || d > last) last = d;
    });
  });
  return { total, last };
}

function isStarterState() {
  const active = activeHabits();
  const names = active.map(h => h.name).join('|');
  const hasData = firstCheckInDate() !== null;
  return !state.customised && !hasData && active.length === 3 && names === 'Run|Walk|Water';
}

function showHeatmapDetail(date, value) {
  selectedHeatmapDateKey = formatIsoDate(date);
  const habits = heatmapHabitsForDate(date);
  const completed = habits.filter(habit => isDoneOnDate(habit.id, date)).length;
  const note = noteForDate(date);
  const title = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  const summary = heatmapHabitId === 'all'
    ? `${completed} of ${habits.length} habits completed`
    : (completed ? 'Completed' : 'Not completed');

  els.heatmapDetail.innerHTML = '';
  const text = document.createElement('div');
  text.className = 'heatmap-detail-copy';
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = `${summary}${note ? ` · ${note}` : ''}`;
  text.append(strong, span);

  const actions = document.createElement('div');
  actions.className = 'heatmap-detail-actions';

  const noteBtn = document.createElement('button');
  noteBtn.type = 'button';
  noteBtn.className = 'button secondary compact-button';
  noteBtn.textContent = note ? 'Edit note' : 'Add note';
  noteBtn.addEventListener('click', () => editNoteForDate(date));

  const weekBtn = document.createElement('button');
  weekBtn.type = 'button';
  weekBtn.className = 'button primary compact-button';
  weekBtn.textContent = 'View week';
  weekBtn.addEventListener('click', () => {
    focusDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    state.viewMode = 'week';
    saveState();
    render();
    document.querySelector('.tracker-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  actions.append(noteBtn, weekBtn);
  els.heatmapDetail.append(text, actions);
  els.heatmapDetail.hidden = false;
}

function moveHabit(index, direction) {
  state.customised = true;
  const newIndex = index + direction;
  const active = activeHabits();
  if (newIndex < 0 || newIndex >= active.length) return;
  const habit = active[index];
  const swapWith = active[newIndex];
  const originalIndex = state.habits.indexOf(habit);
  const swapIndex = state.habits.indexOf(swapWith);
  [state.habits[originalIndex], state.habits[swapIndex]] = [state.habits[swapIndex], state.habits[originalIndex]];
  saveState();
  render();
}

function makeTargetSelect(habit) {
  const select = document.createElement('select');
  select.setAttribute('aria-label', `Target for ${habit.name}`);

  const options = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    ...Array.from({ length: 7 }, (_, i) => ({ value: `weekly:${i + 1}`, label: `${i + 1}× per week` }))
  ];

  const selectedValue = habit.targetType === 'weekly' ? `weekly:${habit.weeklyTarget}` : habit.targetType;
  options.forEach(option => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    el.selected = option.value === selectedValue;
    select.appendChild(el);
  });

  select.addEventListener('change', () => {
    state.customised = true;
    if (select.value.startsWith('weekly:')) {
      habit.targetType = 'weekly';
      habit.weeklyTarget = Number(select.value.split(':')[1]);
    } else {
      habit.targetType = select.value;
      habit.weeklyTarget = habit.targetType === 'weekdays' ? 5 : 7;
    }
    els.formMessage.textContent = `Target updated for “${habit.name}”.`;
    saveState();
    render();
  });

  return select;
}

function setEditorOpen(open, focusAdd = false) {
  els.habitEditorArea.hidden = !open;
  els.editHabitsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  els.editHabitsBtn.textContent = open ? 'Done' : 'Manage habits';
  if (open && focusAdd) {
    requestAnimationFrame(() => els.habitInput.focus());
  }
}

function renderEditor() {
  els.habitEditorList.innerHTML = '';
  const active = activeHabits();
  const archived = archivedHabits();

  active.forEach((habit, index) => {
    const row = document.createElement('div');
    row.className = 'habit-editor-row';

    const input = document.createElement('input');
    input.value = habit.name;
    input.maxLength = 22;
    input.setAttribute('aria-label', `Rename ${habit.name}`);
    input.addEventListener('change', () => {
      const value = input.value.trim();
      if (!value) {
        input.value = habit.name;
        els.formMessage.textContent = 'Habit names cannot be blank.';
        return;
      }
      habit.name = value;
      state.customised = true;
      els.formMessage.textContent = 'Habit updated.';
      saveState();
      render();
    });

    const targetSelect = makeTargetSelect(habit);

    const up = document.createElement('button');
    up.className = 'icon-btn';
    up.type = 'button';
    up.textContent = '↑';
    up.disabled = index === 0;
    up.setAttribute('aria-label', `Move ${habit.name} left`);
    up.addEventListener('click', () => moveHabit(index, -1));

    const down = document.createElement('button');
    down.className = 'icon-btn';
    down.type = 'button';
    down.textContent = '↓';
    down.disabled = index === active.length - 1;
    down.setAttribute('aria-label', `Move ${habit.name} right`);
    down.addEventListener('click', () => moveHabit(index, 1));

    const archive = document.createElement('button');
    archive.className = 'archive-btn';
    archive.type = 'button';
    archive.textContent = 'Archive';
    archive.setAttribute('aria-label', `Archive ${habit.name}`);
    archive.addEventListener('click', () => {
      state.customised = true;
      habit.archived = true;
      habit.archivedAt = new Date().toISOString().slice(0, 10);
      els.formMessage.textContent = `Archived “${habit.name}”. Previous check-ins have been kept.`;
      saveState();
      render();
    });

    row.append(input, targetSelect, up, down, archive);
    els.habitEditorList.appendChild(row);
  });

  if (!active.length) {
    els.habitEditorList.innerHTML = '<div class="empty-note">No active habits — add one below or restore an archived habit.</div>';
  }

  els.archivedHabitList.innerHTML = '';
  archived.forEach(habit => {
    const item = document.createElement('div');
    item.className = 'archived-habit-item';

    const name = document.createElement('span');
    name.className = 'archived-habit-name';
    name.textContent = habit.name;

    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'restore-btn';
    restore.textContent = 'Restore';
    restore.addEventListener('click', () => {
      if (activeHabits().length >= MAX_HABITS) {
        els.formMessage.textContent = `You can have up to ${MAX_HABITS} active habits. Archive another habit before restoring this one.`;
        return;
      }
      state.customised = true;
      habit.archived = false;
      habit.archivedAt = null;
      els.formMessage.textContent = `Restored “${habit.name}” with its previous check-ins.`;
      saveState();
      render();
    });

    const history = totalCheckInsForHabit(habit.id);
    const historyText = document.createElement('span');
    historyText.className = 'archived-habit-history';
    historyText.textContent = history.total
      ? `${history.total} check-in${history.total === 1 ? '' : 's'}${history.last ? ` · last ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(history.last)}` : ''}`
      : 'No check-ins';

    item.append(name, historyText, restore);
    els.archivedHabitList.appendChild(item);
  });

  els.archivedHabitsArea.hidden = archived.length === 0;
  els.habitCounter.textContent = `${active.length} of ${MAX_HABITS} habits`;
  els.starterHint.hidden = !isStarterState();
  const atLimit = active.length >= MAX_HABITS;
  els.habitInput.disabled = atLimit;
  const addButton = els.habitForm.querySelector('button[type="submit"]');
  if (addButton) {
    addButton.disabled = atLimit;
    addButton.title = atLimit ? `Maximum of ${MAX_HABITS} active habits reached` : '';
  }
}

function renderGrid(dates) {
  els.tableHead.innerHTML = '';
  els.tableBody.innerHTML = '';

  const dayTh = document.createElement('th');
  dayTh.className = 'day-col';
  dayTh.textContent = 'Day';
  els.tableHead.appendChild(dayTh);

  const showMonthlyComparison = state.viewMode === 'month';
  const previousDate = previousMonthDate(focusDate);
  const previousDates = showMonthlyComparison ? monthDatesFor(previousDate) : [];
  const previousLabel = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(previousDate);

  activeHabits().forEach(habit => {
    const th = document.createElement('th');
    th.className = 'habit-head';

    let comparisonNote = '';
    if (showMonthlyComparison && !hasCheckInData(habit.id, previousDates)) {
      comparisonNote = `<div class="habit-header-note">No ${previousLabel} data yet</div>`;
    }

    th.innerHTML = `<div class="habit-name"></div>${comparisonNote}`;
    th.querySelector('.habit-name').textContent = habit.name;
    els.tableHead.appendChild(th);
  });

  dates.forEach(date => {
    const tr = document.createElement('tr');
    const isToday = sameDate(date, todayDate);
    if (isToday) tr.classList.add('today-row');
    const isFuture = isFutureDate(date);
    if (isToday) tr.classList.add('today');
    if (isFuture) tr.classList.add('future-row');

    const dayTd = document.createElement('td');
    dayTd.className = 'day-col';
    const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
    dayTd.innerHTML = `<div>${date.getDate()}</div><div style="font-size:.72rem;font-weight:600">${weekday}</div>${isToday ? '<span class="today-badge">Today</span>' : ''}`;
    if (!isFuture) {
      const noteButton = document.createElement('button');
      noteButton.type = 'button';
      noteButton.className = `day-note-btn${noteForDate(date) ? ' has-note' : ''}`;
      noteButton.textContent = noteForDate(date) ? '●' : '＋';
      noteButton.title = noteForDate(date) || 'Add day note';
      noteButton.setAttribute('aria-label', noteForDate(date) ? `Edit note for ${date.toDateString()}` : `Add note for ${date.toDateString()}`);
      noteButton.addEventListener('click', () => editNoteForDate(date));
      dayTd.appendChild(noteButton);
    }
    tr.appendChild(dayTd);

    activeHabits().forEach(habit => {
      const done = !isFuture && isDoneOnDate(habit.id, date);
      const targetDay = isTargetDay(habit, date);
      const missed = habit.targetType !== 'weekly' && isPastDate(date) && targetDay && !done && isOnOrAfterHabitStart(habit, date);
      const td = document.createElement('td');
      td.className = `check-cell${done ? ' done' : ''}${!targetDay ? ' off-target' : ''}${isFuture ? ' future' : ''}${missed ? ' missed' : ''}`;

      const button = document.createElement('button');
      button.className = 'check-btn';
      button.type = 'button';
      button.disabled = isFuture;
      button.setAttribute('aria-pressed', done ? 'true' : 'false');
      button.setAttribute('aria-label', isFuture
        ? `Future date: ${habit.name}, ${date.toDateString()}`
        : `${done ? 'Mark incomplete' : 'Mark complete'}: ${habit.name}, ${date.toDateString()}${!targetDay ? ' (outside target days)' : ''}`);
      button.textContent = done ? '✓' : '';
      if (!isFuture) {
        button.addEventListener('click', () => {
          toggleDoneOnDate(habit.id, date);
          render();
        });
      }

      td.appendChild(button);
      tr.appendChild(td);
    });

    els.tableBody.appendChild(tr);
  });
}

function monthDatesFor(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => new Date(y, m, i + 1));
}

function previousMonthDate(date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function comparisonText(currentPct, previousPct, previousLabel) {
  const delta = currentPct - previousPct;
  if (delta > 0) return { text: `↑ ${delta} pp vs ${previousLabel}`, className: 'comparison-positive' };
  if (delta < 0) return { text: `↓ ${Math.abs(delta)} pp vs ${previousLabel}`, className: 'comparison-negative' };
  return { text: `No change vs ${previousLabel}`, className: 'comparison-neutral' };
}

function renderStats(dates) {
  els.habitStats.innerHTML = '';
  let completedTotal = 0;
  let elapsedTargetTotal = 0;
  let best = 0;
  const active = activeHabits();
  const showComparison = state.viewMode === 'month';
  const previousDate = previousMonthDate(focusDate);
  const previousDatesFull = showComparison ? monthDatesFor(previousDate) : [];
  const currentIsThisMonth = state.viewMode === 'month' && focusDate.getFullYear() === today.y && focusDate.getMonth() === today.m;
  const elapsedCurrentDays = currentIsThisMonth ? Math.max(0, today.d - 1) : dates.length;
  const previousDates = currentIsThisMonth
    ? previousDatesFull.filter(date => date.getDate() <= elapsedCurrentDays)
    : previousDatesFull;
  const previousLabel = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(previousDate);
  let previousCompletedTotal = 0;
  let previousTargetTotal = 0;

  active.forEach(habit => {
    const completed = completedForDates(habit, dates);
    const fullTarget = targetForDates(habit, dates);
    const expected = targetSoFar(habit, dates);
    const periodPct = fullTarget ? Math.min(100, Math.round((completed / fullTarget) * 100)) : 0;
    const soFarPct = expected ? Math.min(100, Math.round((completed / expected) * 100)) : (completed > 0 ? 100 : 0);
    const pace = progressStatus(habit, dates, completed);
    const streak = streakStats(habit);
    completedTotal += completed;
    elapsedTargetTotal += expected;
    best = Math.max(best, streak.best);

    const streakUnit = streak.unit === 'weeks' ? 'week' : 'day';
    const currentLabel = `${streak.current} ${streakUnit}${streak.current === 1 ? '' : 's'}`;
    const bestLabel = `${streak.best} ${streakUnit}${streak.best === 1 ? '' : 's'}`;
    const streakText = streak.current > 0
      ? `🔥 Current streak ${currentLabel} · Best ${bestLabel}`
      : streak.best > 0
        ? `No current streak · Best ${bestLabel}`
        : 'No streak yet';

    let comparisonHtml = '';
    if (showComparison) {
      const previousCompleted = completedForDates(habit, previousDates);
      const previousTarget = targetSoFar(habit, previousDates);
      const hasPreviousData = hasCheckInData(habit.id, previousDatesFull);
      if (hasPreviousData && expected > 0 && previousDates.length) {
        const previousPct = previousTarget ? Math.min(100, Math.round((previousCompleted / previousTarget) * 100)) : 0;
        previousCompletedTotal += previousCompleted;
        previousTargetTotal += previousTarget;
        const comparison = comparisonText(soFarPct, previousPct, previousLabel);
        comparisonHtml = `<div class="habit-comparison ${comparison.className}">${comparison.text}</div>`;
      } else if (!hasPreviousData) {
        comparisonHtml = `<div class="habit-comparison comparison-neutral">No ${previousLabel} data yet</div>`;
      }
    }

    const elapsedTargetText = habit.targetType === 'weekly'
      ? `${completed}/${fullTarget} this ${state.viewMode === 'week' ? 'week' : 'period'}`
      : `${completed} of ${Math.round(expected)} target day${Math.round(expected) === 1 ? '' : 's'} so far`;

    const card = document.createElement('article');
    card.className = 'panel habit-stat';
    card.innerHTML = `
      <strong></strong>
      <div class="small">${elapsedTargetText} · <span class="pace-label ${pace.className}">${pace.label}</span></div>
      <div class="small streak-line">${streakText}</div>
      <div class="habit-target-label">${targetLabel(habit)} · ${periodPct}% of full-period target</div>
      ${comparisonHtml}
      <div class="progress ${pace.className}" aria-label="${pace.pacePct}% of expected progress so far"><span style="width:${pace.pacePct}%"></span></div>
    `;
    card.querySelector('strong').textContent = `${habit.name} — ${soFarPct}% so far`;
    els.habitStats.appendChild(card);
  });

  const overallPct = elapsedTargetTotal ? Math.min(100, Math.round((completedTotal / elapsedTargetTotal) * 100)) : (completedTotal > 0 ? 100 : 0);
  els.overallPct.textContent = `${overallPct}%`;
  els.completedCount.textContent = String(completedTotal);
  els.bestStreak.textContent = String(best);
  els.habitCount.textContent = String(active.length);

  const anyPreviousMonthData = active.some(habit => hasCheckInData(habit.id, previousDatesFull));
  if (showComparison && active.length && elapsedTargetTotal > 0 && previousTargetTotal > 0) {
    const previousPct = Math.min(100, Math.round((previousCompletedTotal / previousTargetTotal) * 100));
    const comparison = comparisonText(overallPct, previousPct, previousLabel);
    els.overallComparison.textContent = comparison.text;
    els.overallComparison.className = `summary-comparison ${comparison.className}`;
    els.overallComparison.hidden = false;
  } else if (showComparison && active.length && !anyPreviousMonthData) {
    els.overallComparison.textContent = `No ${previousLabel} data yet`;
    els.overallComparison.className = 'summary-comparison comparison-neutral';
    els.overallComparison.hidden = false;
  } else {
    els.overallComparison.hidden = true;
  }

  if (!active.length) {
    els.habitStats.innerHTML = '<div class="empty-note">Add your first habit above to start tracking.</div>';
  }
}


function heatmapWindow() {
  const windowStart = new Date(today.y, today.m - 11, 1);
  const gridStart = startOfWeek(windowStart);
  const gridEnd = addDays(startOfWeek(todayDate), 6);
  const dates = [];
  for (let date = new Date(gridStart); date <= gridEnd; date = addDays(date, 1)) dates.push(date);
  return { windowStart, gridStart, gridEnd, dates };
}

function heatmapHabitsForDate(date) {
  const active = activeHabits();
  if (heatmapHabitId !== 'all') {
    const habit = active.find(item => item.id === heatmapHabitId);
    if (!habit || !isTargetDay(habit, date)) return [];
    return [habit];
  }
  return active.filter(habit => isTargetDay(habit, date));
}

function heatmapValue(date) {
  const habits = heatmapHabitsForDate(date);
  if (!habits.length) return null;
  const completed = habits.filter(habit => isDoneOnDate(habit.id, date)).length;
  return completed / habits.length;
}

function heatmapLevel(value) {
  if (value === null || value <= 0) return 0;
  if (value <= 0.25) return 1;
  if (value <= 0.5) return 2;
  if (value < 1) return 3;
  return 4;
}

function heatmapTooltip(date, value) {
  const dateText = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
  if (value === null) return `${dateText}: not a target day`;
  const habits = heatmapHabitsForDate(date);
  const completed = habits.filter(habit => isDoneOnDate(habit.id, date)).length;
  if (heatmapHabitId === 'all') return `${dateText}: ${completed} of ${habits.length} habits completed`;
  return `${dateText}: ${completed ? 'completed' : 'not completed'}`;
}

function renderHeatmapSelect() {
  const active = activeHabits();
  if (heatmapHabitId !== 'all' && !active.some(habit => habit.id === heatmapHabitId)) heatmapHabitId = 'all';
  els.heatmapHabitSelect.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All active habits';
  els.heatmapHabitSelect.appendChild(allOption);

  if (active.length) {
    const group = document.createElement('optgroup');
    group.label = 'Habits';
    active.forEach(habit => {
      const option = document.createElement('option');
      option.value = habit.id;
      option.textContent = habit.name;
      group.appendChild(option);
    });
    els.heatmapHabitSelect.appendChild(group);
  }
  els.heatmapHabitSelect.value = heatmapHabitId;
}

function renderHeatmap() {
  renderHeatmapSelect();
  if (!selectedHeatmapDateKey) els.heatmapDetail.hidden = true;
  const { windowStart, gridStart, gridEnd, dates } = heatmapWindow();
  const weeks = calendarWeekDiff(gridEnd, gridStart) + 1;
  els.heatmapGrid.style.setProperty('--heatmap-weeks', String(weeks));
  els.heatmapGrid.innerHTML = '';

  const weekdayLabels = new Map([[0, 'Mon'], [2, 'Wed'], [4, 'Fri'], [6, 'Sun']]);
  weekdayLabels.forEach((label, row) => {
    const item = document.createElement('div');
    item.className = 'heatmap-weekday';
    item.textContent = label;
    item.style.gridColumn = '1';
    item.style.gridRow = String(row + 2);
    els.heatmapGrid.appendChild(item);
  });

  for (let m = 0; m < 12; m += 1) {
    const monthDate = new Date(windowStart.getFullYear(), windowStart.getMonth() + m, 1);
    const column = calendarWeekDiff(startOfWeek(monthDate), gridStart) + 2;
    const label = document.createElement('div');
    label.className = 'heatmap-month';
    label.textContent = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(monthDate);
    label.style.gridColumn = String(column);
    label.style.gridRow = '1';
    els.heatmapGrid.appendChild(label);
  }

  let trackedStart = firstCheckInDate();
  if (!trackedStart || trackedStart < windowStart) trackedStart = windowStart;
  let trackedDays = 0;
  let perfectDays = 0;
  const weekdayTotals = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));

  dates.forEach(date => {
    const weekIndex = Math.floor((calendarDayOrdinal(date) - calendarDayOrdinal(gridStart)) / 7);
    const rowIndex = (date.getDay() + 6) % 7;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'heatmap-cell';
    cell.style.gridColumn = String(weekIndex + 2);
    cell.style.gridRow = String(rowIndex + 2);

    const outside = date < windowStart || date > todayDate;
    if (outside) {
      cell.classList.add('heatmap-outside');
      cell.disabled = true;
      cell.setAttribute('aria-hidden', 'true');
      cell.tabIndex = -1;
    } else {
      const value = heatmapValue(date);
      const level = heatmapLevel(value);
      cell.classList.add(`heat-level-${level}`);
      if (sameDate(date, todayDate)) cell.classList.add('heatmap-today');
      cell.title = heatmapTooltip(date, value);
      cell.setAttribute('aria-label', cell.title);
      cell.dataset.date = formatIsoDate(date);
      cell.tabIndex = -1;
      cell.addEventListener('click', () => {
        showHeatmapDetail(date, value);
      });

      if (date >= trackedStart && value !== null) {
        trackedDays += 1;
        if (value >= 0.999) perfectDays += 1;
        const dayIndex = (date.getDay() + 6) % 7;
        weekdayTotals[dayIndex].sum += value;
        weekdayTotals[dayIndex].count += 1;
      }
    }
    els.heatmapGrid.appendChild(cell);
  });

  const heatCells = [...els.heatmapGrid.querySelectorAll('.heatmap-cell[data-date]:not(:disabled)')];
  const cellByDate = new Map(heatCells.map(cell => [cell.dataset.date, cell]));
  const preferredKey = selectedHeatmapDateKey && cellByDate.has(selectedHeatmapDateKey)
    ? selectedHeatmapDateKey
    : formatIsoDate(todayDate);
  const rovingCell = cellByDate.get(preferredKey) || heatCells[heatCells.length - 1];
  if (rovingCell) rovingCell.tabIndex = 0;

  heatCells.forEach(cell => {
    cell.addEventListener('focus', () => {
      heatCells.forEach(item => { item.tabIndex = item === cell ? 0 : -1; });
    });
    cell.addEventListener('keydown', event => {
      const current = parseIsoDate(cell.dataset.date);
      if (!current) return;
      let target = null;
      if (event.key === 'ArrowUp') target = addDays(current, -1);
      if (event.key === 'ArrowDown') target = addDays(current, 1);
      if (event.key === 'ArrowLeft') target = addDays(current, -7);
      if (event.key === 'ArrowRight') target = addDays(current, 7);
      if (event.key === 'Home') { event.preventDefault(); heatCells[0]?.focus(); return; }
      if (event.key === 'End') { event.preventDefault(); heatCells[heatCells.length - 1]?.focus(); return; }
      if (!target) return;
      const next = cellByDate.get(formatIsoDate(target));
      if (next) { event.preventDefault(); next.focus(); }
    });
  });

  if (selectedHeatmapDateKey && cellByDate.has(selectedHeatmapDateKey)) {
    const selectedDate = parseIsoDate(selectedHeatmapDateKey);
    if (selectedDate) showHeatmapDetail(selectedDate, heatmapValue(selectedDate));
  } else if (selectedHeatmapDateKey) {
    selectedHeatmapDateKey = null;
    els.heatmapDetail.hidden = true;
  }

  let strongestIndex = -1;
  let strongestPct = -1;
  weekdayTotals.forEach((item, index) => {
    if (!item.count) return;
    const pct = Math.round((item.sum / item.count) * 100);
    if (pct > strongestPct) {
      strongestPct = pct;
      strongestIndex = index;
    }
  });
  const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (!activeHabits().length || !firstCheckInDate()) {
    els.heatmapSummary.textContent = 'Your consistency history will appear here after your first check-in.';
  } else if (strongestIndex >= 0) {
    const lead = heatmapHabitId === 'all'
      ? `${perfectDays} perfect day${perfectDays === 1 ? '' : 's'} out of ${trackedDays} tracked`
      : `${perfectDays} completed day${perfectDays === 1 ? '' : 's'} out of ${trackedDays} tracked`;
    els.heatmapSummary.textContent = `${lead} · Strongest day: ${weekdayNames[strongestIndex]} (${strongestPct}%)`;
  } else {
    els.heatmapSummary.textContent = `${trackedDays} tracked day${trackedDays === 1 ? '' : 's'}`;
  }
}

function renderTheme() {
  const dark = state.theme === 'dark';
  els.body.classList.toggle('dark', dark);
  els.themeToggle.textContent = '';
  els.themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  els.themeToggle.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
  const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
  themeMetas.forEach(meta => {
    const media = meta.getAttribute('media') || '';
    if (!media) meta.setAttribute('content', dark ? '#202329' : '#6f52ed');
  });
}

function render() {
  refreshTodayReference();
  const dates = getVisibleDates();
  els.periodTitle.textContent = formatPeriodTitle(dates);
  els.monthViewBtn.classList.toggle('active', state.viewMode === 'month');
  els.weekViewBtn.classList.toggle('active', state.viewMode === 'week');
  renderTheme();
  renderEditor();
  renderGrid(dates);
  renderHeatmap();
  renderStats(dates);
}


els.editHabitsBtn.addEventListener('click', () => {
  setEditorOpen(els.habitEditorArea.hidden);
});


els.habitForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = els.habitInput.value.trim();

  if (!name) {
    els.formMessage.textContent = 'Enter a habit name first.';
    return;
  }
  if (activeHabits().length >= MAX_HABITS) {
    els.formMessage.textContent = `This version supports up to ${MAX_HABITS} habits.`;
    return;
  }
  const duplicate = state.habits.find(h => h.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    els.formMessage.textContent = duplicate.archived
      ? 'That habit is archived already — restore it instead of creating a duplicate.'
      : 'That habit already exists.';
    return;
  }

  state.customised = true;
  state.habits.push({ id: `h${Date.now()}`, name, targetType: 'daily', weeklyTarget: 7, archived: false, archivedAt: null, createdAt: formatIsoDate(todayDate) });
  els.habitInput.value = '';
  els.formMessage.textContent = `Added “${name}”. It is set to Daily by default.`;
  saveState();
  render();
});


if (els.shareBtn) {
  els.shareBtn.addEventListener('click', shareSite);
}

els.themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveState();
  renderTheme();
});

els.monthViewBtn.addEventListener('click', () => {
  state.viewMode = 'month';
  saveState();
  render();
});

els.weekViewBtn.addEventListener('click', () => {
  state.viewMode = 'week';
  saveState();
  render();
});

els.prevBtn.addEventListener('click', () => {
  if (state.viewMode === 'month') focusDate = new Date(focusDate.getFullYear(), focusDate.getMonth() - 1, 1);
  else focusDate = addDays(focusDate, -7);
  render();
});

els.nextBtn.addEventListener('click', () => {
  if (state.viewMode === 'month') focusDate = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 1);
  else focusDate = addDays(focusDate, 7);
  render();
});

els.todayBtn.addEventListener('click', () => {
  refreshTodayReference();
  focusDate = new Date(today.y, today.m, today.d);
  render();
});

els.exportBtn.addEventListener('click', exportBackup);
els.heatmapHabitSelect.addEventListener('change', () => {
  heatmapHabitId = els.heatmapHabitSelect.value;
  selectedHeatmapDateKey = null;
  renderHeatmap();
});

els.exportCsvBtn.addEventListener('click', exportCsv);

els.importBtn.addEventListener('click', () => {
  els.importFile.value = '';
  els.importFile.click();
});

els.importFile.addEventListener('change', async () => {
  try {
    await importBackup(els.importFile.files?.[0]);
  } catch (error) {
    els.dataMessage.textContent = error instanceof Error ? error.message : 'Could not import that backup.';
  }
});

els.resetMonthBtn.addEventListener('click', clearCurrentMonth);
els.resetAllBtn.addEventListener('click', resetAllData);

function refreshAfterResume() {
  if (document.visibilityState && document.visibilityState !== 'visible') return;
  if (refreshTodayReference()) render();
}

document.addEventListener('visibilitychange', refreshAfterResume);
window.addEventListener('focus', refreshAfterResume);

render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The tracker remains fully usable without offline support.
    });
  });
}

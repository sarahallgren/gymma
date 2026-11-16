'use strict';

// ---------- Data ----------
// Allt sparas i webbläsarens lagring (localStorage) på din mobil.
// Inget skickas till någon server.
//
// Det som sparas:
//   active:   pågående pass  { id, start, title, week, exercises: [{ exId, kg, reps, done, setsDone }], timer }
//             setsDone = hur många set du har bockat av. timer = pågående vila eller tidtagning (se längre ner)
//   history:  sparade pass   { id, start, end, title, week, exercises: [{ exId, sets: [{ kg, reps }], targetSets, targetReps }] }
//   custom:   egna övningar  { id, name, group, eq }
//   settings: inställningar  { theme, steps: { redskap: kg }, rest: sekunder, sound: true/false }
//   notes:    anteckningar   { övningens id: text }
//   rotation: egna byten i schemat { "Muskelgrupp|vecka|plats": övningens id }, vecka och plats räknas från 0
// Bara sista setet sparas per övning. Äldre pass kan ha flera set – då räknas det sista.

const KEY = 'gymma-v1';
const NOTE_MAX = 200; // Längsta anteckning, i tecken

// Val under Inställningar
const STEP_OPTIONS = [0, 0.5, 1, 1.25, 2, 2.5, 5, 10]; // Steg för plus och minus i kg. 0 = automatiskt
const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180]; // Vila mellan set i sekunder. 0 = räkna inte set
const STEP_EQUIPMENT = ['maskin', 'kabel', 'hantlar', 'stang']; // Redskap som kan ha eget steg
function defaultSettings() {
  return { theme: 'gron', steps: {}, rest: 90, sound: false };
}

// Färgteman. Färgerna finns i style.css under samma id.
const THEMES = [
  { id: 'gron', name: 'Grön' },
  { id: 'rosa', name: 'Rosa' },
  { id: 'bla', name: 'Blå' },
  { id: 'gra', name: 'Grå' },
  { id: 'sand', name: 'Sand' },
];

const $main = document.getElementById('main');
const $picker = document.getElementById('picker');
const $search = document.getElementById('picker-search');
const $pickerList = document.getElementById('picker-list');
const $pickerTitle = document.getElementById('picker-title');
const $pickerIntro = document.getElementById('picker-intro');
const $noteDialog = document.getElementById('note-dialog');
const $noteLabel = document.getElementById('note-label');
const $noteText = document.getElementById('note-text');
const $noteDelete = document.getElementById('note-delete');
const $timerBar = document.getElementById('timer-bar');
const $timerTime = document.getElementById('timer-time');
const $timerLabel = document.getElementById('timer-label');
const $timerFill = document.getElementById('timer-fill');
const $timerButtons = document.getElementById('timer-buttons');
const $settings = document.getElementById('settings-dialog');
const $settingsBody = document.getElementById('settings-body');
const $status = document.getElementById('status');

let view = 'hem';
let chosenWeek = null; // Vecka du valt själv på startsidan (null = denna veckas)
let openIdx = null;    // Vilken övning som är öppen i passet (null = första som inte är klar)
let showHow = false;   // Visas de stora bilderna för den öppna övningen?
let state = load();

function emptyState() {
  return { active: null, history: [], custom: [], settings: defaultSettings(), notes: {}, rotation: {} };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return normalize({ ...emptyState(), ...s });
  } catch (e) { /* tom eller trasig lagring */ }
  return emptyState();
}

// Städar data från lagringen eller en inläst kopia, så att appen tål äldre format och trasiga rader.
function normalize(s) {
  s.history = (Array.isArray(s.history) ? s.history : [])
    .filter(p => p && !Number.isNaN(new Date(p.start).getTime()))
    .map(p => ({
      ...p,
      exercises: (Array.isArray(p.exercises) ? p.exercises : [])
        .filter(e => e && e.exId)
        .map(e => ({ ...e, sets: Array.isArray(e.sets) ? e.sets.filter(Boolean) : [] }))
        .filter(e => e.sets.length),
    }))
    .sort(byStart);

  s.custom = (Array.isArray(s.custom) ? s.custom : [])
    .filter(c => c && c.id && c.name)
    .map(c => ({ ...c, group: c.group || 'Övrigt' }));

  s.notes = cleanMap(s.notes, NOTE_MAX);
  s.rotation = cleanMap(s.rotation, 80);

  const set = s.settings && typeof s.settings === 'object' ? s.settings : {};
  s.settings = { ...defaultSettings(), ...set };
  if (!THEMES.some(t => t.id === s.settings.theme)) s.settings.theme = 'gron';
  if (!REST_OPTIONS.includes(s.settings.rest)) s.settings.rest = 90;
  s.settings.sound = s.settings.sound === true;
  const steps = {};
  STEP_EQUIPMENT.forEach(id => {
    const v = Number(set.steps && set.steps[id]);
    if (v > 0 && STEP_OPTIONS.includes(v)) steps[id] = v;
  });
  s.settings.steps = steps;

  // Ett pass som pågick i en äldre version (med flera set) görs om till "sista setet".
  if (s.active && Array.isArray(s.active.exercises)) {
    s.active.exercises = s.active.exercises.filter(e => e && e.exId).map(e => {
      if (!Array.isArray(e.sets)) return e;
      const last = e.sets[e.sets.length - 1] || {};
      return { exId: e.exId, kg: last.kg ?? '', reps: last.reps ?? '', done: !!last.done };
    });
    const t = s.active.timer;
    const okTimer = t && typeof t === 'object' && ['rest', 'work'].includes(t.kind) && typeof t.exId === 'string'
      && Number.isFinite(t.end) && Number.isFinite(t.total) && t.total > 0;
    if (!okTimer) delete s.active.timer;
    else {
      t.set = Math.min(DEFAULT_SETS, Math.max(1, Math.floor(Number(t.set)) || 1));
      t.done = t.done === true;
    }
  } else {
    s.active = null;
  }
  return s;
}

// Behåller bara rader med text i ett uppslag som { nyckel: text }, och kortar för långa texter.
function cleanMap(obj, max) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, max);
    }
  }
  return out;
}

// Äldst först. Ett pass som avslutas flera dagar för sent hamnar ändå på rätt plats.
function byStart(a, b) {
  return new Date(a.start) - new Date(b.start);
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    announce('Kunde inte spara. Ta en säkerhetskopia under Historik.');
  }
}

// ---------- Ikoner ----------
// Material Icons (Apache 2.0), inbäddade så att appen inte behöver hämta något utifrån.
const ICONS = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  fitness: 'M20.57 14.86 22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z',
  event: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
  history: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  remove: 'M19 13H5v-2h14v2z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  check_circle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  expand: 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
  chevron: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  play: 'M8 5v14l11-7z',
  up: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
  down: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
  trending: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  swap: 'M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
  notes: 'M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  timer: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 0 0 7.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  sound: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  star: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  skip: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[name]}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

// ---------- Hjälpfunktioner ----------

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Övningar som visas i listor och sök (dolda övningar räknas inte med)
const allExercises = () => EXERCISES.filter(e => !e.hidden).concat(state.custom);
// Muskelgrupper att visa – plus grupper från egna övningar som inte finns i listan
const allGroups = () => GROUPS.concat([...new Set(state.custom.map(c => c.group))].filter(g => !GROUPS.includes(g)));
// Hittar även dolda övningar, så att gamla pass visar rätt namn
const exById = id => EXERCISES.concat(state.custom).find(e => e.id === id);
const exName = id => (exById(id) || { name: 'Okänd övning' }).name;
const exPart = id => (exById(id) || {}).part || '';
const exGroup = id => (exById(id) || {}).group || 'Övrigt';
const eqById = id => EQUIPMENT.find(q => q.id === id);
const exEq = id => eqById((exById(id) || {}).eq);

// Ikoner för redskap (linjeikoner, ritade för Gymma)
const EQ_ICONS = {
  maskin: '<rect x="4" y="3" width="6" height="18" rx="1"/><path d="M4 8h6M4 13h6M10 6h7v9M14 15h6"/>',
  kabel: '<circle cx="7" cy="6" r="3"/><path d="M7 9v6l8 5M15 20h5"/>',
  hantlar: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  stang: '<path d="M2 12h20M5 8v8M8 6v12M16 6v12M19 8v8"/>',
  kropp: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M7 10l5 1 5-1M12 15l-3 6M12 15l3 6"/>',
};
const eqIcon = id => `<svg class="eq-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${EQ_ICONS[id] || ''}</svg>`;
// Liten etikett som visar redskapet, t.ex. [ikon] Hantlar
function eqTag(exId) {
  const q = exEq(exId);
  return q ? `<span class="eq">${eqIcon(q.id)}${esc(q.name)}</span>` : '';
}
// Söker i namn, muskeldel, muskelgrupp och redskap
function exMatches(e, q) {
  if (!q) return true;
  const eq = eqById(e.eq);
  return [e.name, e.part, e.group, eq && eq.name].some(t => (t || '').toLowerCase().includes(q));
}
const isSek = id => (exById(id) || {}).unit === 'sek';
const unitOf = id => (isSek(id) ? 'sek' : 'reps');
const repsFor = id => (exById(id) || {}).defaultReps || DEFAULT_REPS;

function parseNum(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : '';
}
const fmtNum = n => (n === '' || n == null ? '' : String(n).replace('.', ','));
const round2 = n => Math.round(n * 100) / 100;
const hasKg = r => Number(r && r.kg) > 0;

// ---------- Datum ----------

const DAYS_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
const DAYS_LONG = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const DAY_MS = 86400000;

const monShort = d => MONTHS[d.getMonth()].slice(0, 3);
// "Fre 13 nov"
function shortDate(iso) {
  const d = new Date(iso);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${monShort(d)}`;
}
const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const mondayOf = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));

function minutesBetween(a, b) {
  if (a == null || b == null) return null;
  const ms = new Date(b) - new Date(a);
  return Number.isFinite(ms) && ms >= 0 ? Math.max(1, Math.round(ms / 60000)) : null;
}
// Passets längd i minuter. Längre än 6 timmar betyder att passet glömdes kvar – då visas ingen tid.
const MAX_PASS_MIN = 360;
function passMinutes(start, end) {
  const mins = minutesBetween(start, end);
  return mins != null && mins <= MAX_PASS_MIN ? mins : null;
}
const isToday = iso => dayKey(new Date(iso)) === dayKey(new Date());
// Har det pågående passet blivit liggande? (startat en annan dag eller för mer än 6 timmar sedan)
const isStale = a => !isToday(a.start) || passMinutes(a.start, new Date()) == null;
// "fre 13 nov kl. 18.00"
function startedText(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${shortDate(iso).toLowerCase()} kl. ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

// Antal veckor i rotationen (lika många rader per muskelgrupp i ROTATION)
const ROT_WEEKS = Math.max(1, ...Object.values(ROTATION).map(r => r.length));
// Vilken vecka i rotationen är det? Räknas i hela veckor från en fast måndag,
// så att rotationen fortsätter i samma takt över årsskiften.
const ROTATION_START = Date.UTC(2026, 10, 9); // Måndag 9 november 2026 = vecka 1
function currentWeek() {
  const m = mondayOf(new Date());
  const weeks = Math.round((Date.UTC(m.getFullYear(), m.getMonth(), m.getDate()) - ROTATION_START) / (7 * DAY_MS));
  return ((weeks % ROT_WEEKS) + ROT_WEEKS) % ROT_WEEKS; // 0 = vecka 1
}
const activeWeek = () => (chosenWeek == null ? currentWeek() : chosenWeek);

const todaysSchedule = () => SCHEDULE.find(s => s.day === new Date().getDay());
const groupsTitle = s => cap(s.groups.map(g => g.toLowerCase()).join(' och '));
const dayTitle = s => `${s.name} – ${s.groups.map(g => g.toLowerCase()).join(' och ')}`;

// Schemat: grundförslaget finns i ROTATION (exercises.js). Byten som du gör i appen sparas i
// state.rotation och läggs ovanpå. Ett byte gäller bara om övningen finns kvar och hör till rätt muskelgrupp.
const rotKey = (g, w, k) => `${g}|${w}|${k}`;
const rotBase = (g, w) => (ROTATION[g] || [])[w] || [];
function rotWeek(g, w) {
  const base = rotBase(g, w);
  const row = base.map((id, k) => {
    const own = state.rotation[rotKey(g, w, k)];
    const ex = own ? exById(own) : null;
    return ex && !ex.hidden && ex.group === g ? own : id;
  });
  // Samma övning får inte hamna två gånger i samma pass
  return row.map((id, k) => (row.indexOf(id) < k ? base[k] : id));
}
// Platser där du har bytt övning: [{ g, w, k }]
function rotChanges() {
  const out = [];
  Object.keys(ROTATION).forEach(g => ROTATION[g].forEach((base, w) => {
    rotWeek(g, w).forEach((id, k) => { if (id !== base[k]) out.push({ g, w, k }); });
  }));
  return out;
}
const exercisesFor = (s, week) => s.groups.flatMap(g => rotWeek(g, week));

// Delar upp en sparad passrubrik: "Måndag – axlar och vader · vecka 2"
// blir { over: "Måndag · vecka 2", main: "Axlar och vader" }.
function splitTitle(title, fallback = 'Eget pass') {
  const m = /^(.+?) – (.+?)(?: · (vecka \d+))?$/.exec(title || '');
  if (!m) return { over: '', main: title || fallback };
  return { over: m[1] + (m[3] ? ` · ${m[3]}` : ''), main: cap(m[2]) };
}

// ---------- Resultat och utveckling ----------

// "40 kg × 10 reps" eller "30 sek"
function formatResult(r, exId) {
  if (!r) return '';
  const amount = `${r.reps || 0} ${unitOf(exId)}`;
  return hasKg(r) ? `${fmtNum(r.kg)} kg × ${amount}` : amount;
}
// Kortare variant för listor: "40 kg × 10"
function formatShort(r, exId) {
  if (!r) return '';
  return hasKg(r) ? `${fmtNum(r.kg)} kg × ${r.reps || 0}` : `${r.reps || 0} ${unitOf(exId)}`;
}
const lastSet = e => e.sets[e.sets.length - 1];

// Sista setet förra gången du gjorde övningen
function lastResultFor(exId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = state.history[i].exercises.find(x => x.exId === exId);
    if (e) return lastSet(e);
  }
  return null;
}

// Alla resultat per övning, äldst först: { exId: [{ start, kg, reps }] }
function resultsByExercise() {
  const map = new Map();
  for (const p of state.history) {
    for (const e of p.exercises) {
      const r = lastSet(e);
      if (!map.has(e.exId)) map.set(e.exId, []);
      map.get(e.exId).push({ start: p.start, kg: r.kg, reps: r.reps });
    }
  }
  return map;
}

// Jämför ett resultat med förra gången: först vikt, sedan reps.
function trend(r, prev, exId) {
  if (!prev) return { dir: 'first', text: 'första' };
  const dKg = round2((Number(r.kg) || 0) - (Number(prev.kg) || 0));
  if (dKg !== 0) return { dir: dKg > 0 ? 'up' : 'down', text: `${fmtNum(Math.abs(dKg))} kg` };
  const dReps = (Number(r.reps) || 0) - (Number(prev.reps) || 0);
  if (dReps !== 0) return { dir: dReps > 0 ? 'up' : 'down', text: `${Math.abs(dReps)} ${unitOf(exId)}` };
  return { dir: 'same', text: 'samma' };
}

// Utveckling för varje övning i varje pass: { passId: [trend, trend, …] }
function trendsByPass() {
  const seen = new Map();
  const out = new Map();
  for (const p of state.history) {
    out.set(p.id, p.exercises.map(e => {
      const r = lastSet(e);
      const t = trend(r, seen.get(e.exId), e.exId);
      seen.set(e.exId, r);
      return t;
    }));
  }
  return out;
}

// Det pass för en viss dag i schemat som sparats i dag (det senaste), annars null
function todaysDonePass(s) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const p = state.history[i];
    if (isToday(p.start) && String(p.title || '').startsWith(`${s.name} –`)) return p;
  }
  return null;
}

function weekCount() {
  const monday = mondayOf(new Date());
  return state.history.filter(p => new Date(p.start) >= monday).length;
}

// Eget steg för övningens redskap (kg), eller 0 om steget är automatiskt
function stepSize(exId) {
  const q = exEq(exId);
  return (q && state.settings.steps[q.id]) || 0;
}

// Plus och minus på vikten. Med eget steg för redskapet går vikten till nästa jämna steg.
// Automatiskt: 1 kg i taget upp till 10 kg, sedan 2,5 kg.
function stepKg(value, dir, exId) {
  const v = Number(value) || 0;
  const fixed = stepSize(exId);
  if (fixed) {
    const n = dir > 0 ? Math.floor(v / fixed + 1e-9) + 1 : Math.ceil(v / fixed - 1e-9) - 1;
    return Math.max(0, round2(n * fixed));
  }
  if (dir > 0) {
    const step = v < 10 ? 1 : 2.5;
    return round2(Math.floor(v / step + 1e-9) * step + step);
  }
  const step = v <= 10 ? 1 : 2.5;
  return Math.max(0, round2(Math.ceil(v / step - 1e-9) * step - step));
}
const stepReps = (value, dir, exId) => Math.max(0, (Number(value) || 0) + dir * (isSek(exId) ? 5 : 1));

// Förslag på högre vikt när du klarade alla reps förra gången
function suggestedKg(exId, prev) {
  if (!prev || isSek(exId) || !hasKg(prev)) return null;
  return Number(prev.reps) >= repsFor(exId) ? stepKg(prev.kg, 1, exId) : null;
}

let toastTimer;
function announce(msg) {
  $status.textContent = msg;
  $status.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $status.classList.remove('show'), 3500);
}

// ---------- Bilder ----------

function thumb(exId, cls = '') {
  const ex = exById(exId);
  if (!ex || !ex.img) return `<span class="thumb ph ${cls}">${icon('fitness')}</span>`;
  return `<img class="thumb ${cls}" src="bilder/${esc(ex.id)}-0.jpg" alt="" loading="lazy" width="96" height="64">`;
}

// Stora bilder som visar hur övningen görs (start och slut)
function howImgs(exId) {
  const ex = exById(exId);
  if (!ex || !ex.img) return '';
  return `<div class="how-imgs">
    <figure><img src="bilder/${esc(ex.id)}-0.jpg" alt="${esc(ex.name)}, startläge" loading="lazy" width="480" height="320"><figcaption>Start</figcaption></figure>
    <figure><img src="bilder/${esc(ex.id)}-1.jpg" alt="${esc(ex.name)}, slutläge" loading="lazy" width="480" height="320"><figcaption>Slut</figcaption></figure>
  </div>`;
}

// Anteckning för en övning, t.ex. sitshöjd eller grepp. Visas varje gång övningen är med.
function noteBlock(exId) {
  const note = state.notes[exId];
  if (!note) return '';
  return `<div class="note">
    ${icon('notes')}
    <p><span class="sr-only">Anteckning: </span>${esc(note)}</p>
    <button type="button" class="text-btn" data-action="edit-note" data-id="${esc(exId)}" aria-label="Ändra anteckningen för ${esc(exName(exId))}">Ändra</button>
  </div>`;
}
const noteButton = exId => `<button type="button" class="text-btn" data-action="edit-note" data-id="${esc(exId)}">${icon('notes')} Anteckning</button>`;

// ---------- Vy: Hem ----------

function weekStrip() {
  const now = new Date();
  const monday = mondayOf(now);
  const trained = new Set(state.history.map(p => dayKey(new Date(p.start))));
  let h = '<ol class="weekstrip" aria-label="Den här veckan">';
  for (let k = 0; k < 7; k++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + k);
    const current = dayKey(d) === dayKey(now);
    const done = trained.has(dayKey(d));
    const planned = SCHEDULE.some(s => s.day === d.getDay());
    const cls = [done ? 'done' : '', current ? 'today' : '', !planned && !done ? 'rest' : ''].filter(Boolean).join(' ');
    const what = done ? 'tränat' : planned ? 'pass i schemat' : 'vilodag';
    h += `<li>
      <span class="d" aria-hidden="true">${DAYS_SHORT[d.getDay()]}</span>
      <span class="dot ${cls}" aria-hidden="true">${done ? icon('check') : d.getDate()}</span>
      <span class="sr-only">${cap(DAYS_LONG[d.getDay()])} ${d.getDate()}${current ? ', i dag' : ''}: ${what}</span>
    </li>`;
  }
  return h + '</ol>';
}

function weekSelect() {
  const now = currentWeek();
  return `<span class="weekchip">
    <label class="sr-only" for="week-select">Vecka i rotationen</label>
    <select id="week-select">
      ${Array.from({ length: ROT_WEEKS }, (_, w) => w).map(w => `<option value="${w}" ${w === activeWeek() ? 'selected' : ''}>Vecka ${w + 1} av ${ROT_WEEKS}${w === now ? ' (nu)' : ''}</option>`).join('')}
    </select>${icon('expand')}
  </span>`;
}

function progressBar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progress" role="progressbar" aria-label="Klara övningar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">
    <div style="width:${pct}%"></div>
  </div>`;
}

function viewHem() {
  let h = weekStrip();
  const a = state.active;

  if (a) {
    const done = a.exercises.filter(e => e.done).length;
    h += `<section class="hero">
      <p class="overline">Pass pågår</p>
      <h2>${esc(splitTitle(a.title).main)}</h2>
      ${progressBar(done, a.exercises.length)}
      <p>${done} av ${plural(a.exercises.length, 'övning', 'övningar')} klara${isStale(a) ? `. Startat ${esc(startedText(a.start))}.` : ''}</p>
      <button type="button" class="btn primary wide" data-action="goto" data-view="pass">${icon('play')} Fortsätt passet</button>
    </section>`;
  } else {
    const today = todaysSchedule();
    const week = activeWeek();
    const donePass = today && todaysDonePass(today);
    if (donePass) {
      const ups = (trendsByPass().get(donePass.id) || []).filter(t => t.dir === 'up').length;
      const mins = passMinutes(donePass.start, donePass.end);
      const facts = [
        plural(donePass.exercises.length, 'övning', 'övningar'),
        mins ? `${mins} min` : '',
        ups ? plural(ups, 'ökning', 'ökningar') : '',
      ].filter(Boolean).join(' · ');
      h += `<section class="hero">
        <div class="hero-top"><p class="overline">Dagens pass</p>${weekSelect()}</div>
        <h2>${esc(groupsTitle(today))}</h2>
        <p class="hero-done">${icon('check_circle')}<span>Klart för i dag! ${esc(facts)}.</span></p>
        <div class="stack">
          <button type="button" class="btn primary wide" data-action="show-pass" data-id="${esc(donePass.id)}">Visa passet</button>
          <button type="button" class="text-btn" data-action="start" data-day="${today.day}">Kör passet en gång till</button>
        </div>
      </section>`;
    } else if (today) {
      h += `<section class="hero">
        <div class="hero-top"><p class="overline">Dagens pass</p>${weekSelect()}</div>
        <h2>${esc(groupsTitle(today))}</h2>
        <div class="hero-cols">
          ${today.groups.map(g => `<div>
            <h3>${esc(g)}</h3>
            <ul>${rotWeek(g, week).map(id => `<li>${thumb(id)}<span>${esc(exName(id))}</span></li>`).join('')}</ul>
          </div>`).join('')}
        </div>
        <button type="button" class="btn primary wide" data-action="start" data-day="${today.day}">${icon('play')} Starta passet</button>
      </section>`;
    } else {
      h += `<section class="hero">
        <div class="hero-top"><p class="overline">I dag</p>${weekSelect()}</div>
        <h2>Vilodag</h2>
        <p>Inget pass i schemat i dag. Vill du träna ändå? Välj ett pass nedanför.</p>
      </section>`;
    }
  }

  const last = state.history[state.history.length - 1];
  const lastDate = last ? new Date(last.start) : null;
  const count = weekCount();
  const goal = SCHEDULE.length;
  h += `<dl class="stat-row">
    <div>${count > goal
      ? `<dt>pass denna vecka, målet var ${goal}</dt><dd>${count}</dd>`
      : `<dt>pass denna vecka</dt><dd>${count} av ${goal}</dd>`}</div>
    <div><dt>pass totalt</dt><dd>${state.history.length}</dd></div>
    <div><dt>senaste passet</dt><dd>${lastDate ? `${lastDate.getDate()} ${monShort(lastDate)}` : '–'}</dd></div>
  </dl>`;

  if (!a) {
    const today = todaysSchedule();
    h += `<h3 class="section-title">${today ? 'Andra pass' : 'Välj pass'}</h3>
    <div class="card list-card">
      ${SCHEDULE.filter(s => s !== today).map(s => `<button type="button" class="li" data-action="start" data-day="${s.day}">
        <span class="day" aria-hidden="true">${esc(s.name.slice(0, 3))}</span>
        <span class="txt"><span class="sr-only">${esc(s.name)}: </span>${esc(groupsTitle(s))}</span>${icon('chevron')}
      </button>`).join('')}
      <button type="button" class="li" data-action="start">
        <span class="day" aria-hidden="true">${icon('add')}</span>
        <span class="txt">Tomt pass – välj övningar själv</span>${icon('chevron')}
      </button>
    </div>`;
  }
  return h;
}

// ---------- Vy: Pass ----------

// Vilken övning är öppen? Den du valt, annars första som inte är klar (-1 = alla klara).
function currentOpen() {
  const ex = state.active.exercises;
  if (openIdx != null && openIdx >= 0 && openIdx < ex.length) return openIdx;
  return ex.findIndex(e => !e.done);
}

function hintFor(e, prev) {
  const target = repsFor(e.exId);
  const unit = unitOf(e.exId);
  if (!prev) {
    return `<div class="hint">${icon('trending')}<span>Första gången. Välj en vikt du klarar ${DEFAULT_SETS} set × ${target} ${unit} med.</span></div>`;
  }
  const sug = suggestedKg(e.exId, prev);
  let text = `Förra gången: <b>${esc(formatResult(prev, e.exId))}</b>.`;
  let btn = '';
  if (sug != null && (Number(e.kg) || 0) < sug) {
    text += ` Du klarade alla – prova <b>${fmtNum(sug)} kg</b>?`;
    btn = `<button type="button" class="hint-btn" data-action="bump">Höj till ${fmtNum(sug)} kg</button>`;
  } else if (Number(prev.reps) < target) {
    text += ` Sikta på ${target} i dag.`;
  }
  return `<div class="hint">${icon('trending')}<span>${text}</span>${btn}</div>`;
}

function stepper(i, field, label, value, attrs, down, up) {
  return `<div class="stepper">
    <label for="${field}-${i}">${label}</label>
    <div class="ctl">
      <button type="button" data-action="step" data-i="${i}" data-field="${field}" data-dir="-1" aria-label="${down}">${icon('remove')}</button>
      <input id="${field}-${i}" type="text" ${attrs} value="${esc(value)}" placeholder="0" data-i="${i}" data-field="${field}" autocomplete="off">
      <button type="button" data-action="step" data-i="${i}" data-field="${field}" data-dir="1" aria-label="${up}">${icon('add')}</button>
    </div>
  </div>`;
}

// Raden som räknar set: prickar, "Set 2 av 4" och knappen Set klart.
// För övningar i sekunder startar knappen en nedräkning för själva setet.
const setsDoneOf = e => Math.min(DEFAULT_SETS, Math.max(0, Math.floor(Number(e.setsDone) || 0)));

function setRow(e, i) {
  if (!state.settings.rest || e.done) return '';
  const done = setsDoneOf(e);
  const sek = isSek(e.exId);
  const t = timerOf();
  const busy = !!t && !t.done && t.exId === e.exId;
  let label = `Set ${Math.min(DEFAULT_SETS, done + 1)} av ${DEFAULT_SETS}`;
  let btn = '';
  if (busy) {
    label = t.kind === 'rest' ? `Vila före set ${t.set}` : `Set ${t.set} pågår`;
  } else if (sek && done < DEFAULT_SETS) {
    const secs = Number(e.reps) > 0 ? Number(e.reps) : repsFor(e.exId);
    btn = `<button type="button" class="pill-btn" data-action="set-time" data-i="${i}">${icon('play')} Starta ${secs} sek</button>`;
  } else if (sek) {
    label = 'Alla set klara';
  } else if (done < DEFAULT_SETS - 1) {
    btn = `<button type="button" class="pill-btn" data-action="set-done" data-i="${i}">${icon('check')} Set klart</button>`;
  } else {
    label = 'Sista setet';
  }
  return `<div class="setrow">
    <span class="prog">
      <span class="dots" aria-hidden="true">${Array.from({ length: DEFAULT_SETS }, (_, k) => `<i class="${k < done ? 'on' : ''}"></i>`).join('')}</span>
      <span class="lbl">${label}<span class="sr-only">. ${done} av ${DEFAULT_SETS} set klara.</span></span>
    </span>
    ${done > 0 && !busy ? `<button type="button" class="icon-btn" data-action="set-undo" data-i="${i}" aria-label="Ångra senaste set">${icon('undo')}</button>` : ''}
    ${btn}
  </div>`;
}

function activeCard(e, i) {
  const name = exName(e.exId);
  const prev = lastResultFor(e.exId);
  const ex = exById(e.exId);
  const sek = isSek(e.exId);
  const note = state.notes[e.exId];
  const actions = [
    e.done ? '' : `<button type="button" class="text-btn" data-action="swap-ex" data-i="${i}">${icon('swap')} Byt övning</button>`,
    note ? '' : noteButton(e.exId),
  ].join('');
  const picture = ex && ex.img
    ? `<button type="button" class="thumb-btn" data-action="toggle-how" aria-expanded="${showHow}" aria-label="Visa hur övningen görs">${thumb(e.exId, 'lg')}</button>`
    : thumb(e.exId, 'lg');
  return `<section class="card active-card" id="ex-${i}" aria-labelledby="ex-name-${i}">
    <div class="active-head">
      ${picture}
      <div class="grow">
        <h4 id="ex-name-${i}" tabindex="-1">${esc(name)}</h4>
        ${eqTag(e.exId) ? `<div class="eq-line">${eqTag(e.exId)}</div>` : ''}
        ${exPart(e.exId) ? `<span class="chip">${esc(exPart(e.exId))}</span>` : ''}
        <span class="chip">${DEFAULT_SETS} × ${repsFor(e.exId)} ${unitOf(e.exId)}</span>
      </div>
      <button type="button" class="icon-btn" data-action="remove-ex" data-i="${i}" aria-label="Ta bort ${esc(name)} från passet">${icon('close')}</button>
    </div>
    ${showHow ? howImgs(e.exId) : ''}
    ${actions ? `<div class="card-actions">${actions}</div>` : ''}
    ${noteBlock(e.exId)}
    ${hintFor(e, prev)}
    ${setRow(e, i)}
    <div class="steppers">
      ${stepper(i, 'kg', 'Kg', fmtNum(e.kg), 'inputmode="decimal"', 'Minska vikten', 'Öka vikten')}
      ${stepper(i, 'reps', `${sek ? 'Sek' : 'Reps'} i sista setet`, e.reps, 'inputmode="numeric" pattern="[0-9]*"', sek ? 'Färre sekunder' : 'Färre reps', sek ? 'Fler sekunder' : 'Fler reps')}
    </div>
    <button type="button" class="btn primary wide" data-action="done" data-i="${i}">${icon('check')} ${e.done ? 'Spara' : 'Klar'}</button>
  </section>`;
}

function passRow(e, i) {
  const name = exName(e.exId);
  if (e.done) {
    return `<div class="card row-card done" id="ex-${i}">
      <span class="lead">${icon('check_circle')}</span>
      <span class="txt"><span class="name">${esc(name)}</span><span class="meta"><span class="sr-only">Klar: </span>${esc(formatResult(e, e.exId))}</span></span>
      <button type="button" class="text-btn" data-action="open-ex" data-i="${i}" aria-label="Ändra ${esc(name)}">Ändra</button>
    </div>`;
  }
  const prev = lastResultFor(e.exId);
  return `<button type="button" class="card row-card" id="ex-${i}" data-action="open-ex" data-i="${i}">
    ${thumb(e.exId)}
    <span class="txt"><span class="name">${esc(name)}</span><span class="meta">${eqTag(e.exId)}${prev ? `Förra: ${esc(formatResult(prev, e.exId))}` : esc(exPart(e.exId) || 'Inte loggad än')}</span></span>
    ${icon('expand')}
  </button>`;
}

function viewPass() {
  const a = state.active;
  const t = splitTitle(a.title);
  const total = a.exercises.length;
  const done = a.exercises.filter(e => e.done).length;
  const open = currentOpen();
  const stale = isStale(a);
  const mins = stale ? null : passMinutes(a.start, new Date());

  let h = `${t.over ? `<p class="overline">${esc(t.over)}</p>` : ''}
    <h2 class="pass-title">${esc(t.main)}</h2>
    ${progressBar(done, total)}
    <p class="muted small">${done} av ${plural(total, 'övning', 'övningar')} klara${mins ? ` · ${mins} min` : ''}</p>`;

  if (stale) {
    h += `<p class="notice">Passet startade ${esc(startedText(a.start))} och blev aldrig avslutat. Avsluta det för att spara det du hann med, eller avbryt passet. Det sparas på dagen då du startade.</p>`;
  }

  if (!total) h += '<p>Lägg till din första övning.</p>';
  if (total && done === total) {
    h += '<p class="all-done">Alla övningar är klara. Avsluta passet för att spara det.</p>';
  }

  let group = null;
  a.exercises.forEach((e, i) => {
    const g = exGroup(e.exId);
    if (g !== group) {
      group = g;
      h += `<h3 class="group-head">${esc(g)}</h3>`;
    }
    h += i === open ? activeCard(e, i) : passRow(e, i);
  });

  h += `<button type="button" class="btn outline" data-action="open-picker">${icon('add')} Lägg till övning</button>
  <div class="stack pass-actions">
    <button type="button" class="btn primary wide" data-action="finish">Avsluta och spara passet</button>
    <button type="button" class="text-btn danger" data-action="cancel">Avbryt passet</button>
  </div>`;
  return h;
}

// ---------- Vy: Schema ----------

let schemaEdit = false; // Är schemat i ändringsläge? (bara skärmläge)

function viewSchema() {
  const now = currentWeek();
  const changes = rotChanges().length;
  let h = `<div class="head-row">
      <h2>Schema</h2>
      <button type="button" class="pill-btn" data-action="schema-edit">${icon(schemaEdit ? 'check' : 'edit')} ${schemaEdit ? 'Klar' : 'Ändra'}</button>
    </div>
    <p>Varje muskelgrupp får 3 övningar per pass – en för varje del av muskeln. Övningarna byts ut i en rotation på ${ROT_WEEKS} veckor. Denna vecka är <strong>vecka ${now + 1}</strong>.</p>`;
  if (schemaEdit) {
    h += '<p class="notice">Tryck på Byt för att välja en annan övning. Ändringen gäller från nästa pass du startar.</p>';
  }
  SCHEDULE.forEach(s => {
    h += `<section class="card"><h3>${esc(dayTitle(s))}</h3>`;
    s.groups.forEach(g => {
      h += `<h4 class="group-head">${esc(g)}</h4><ol class="weeks">
        ${(ROTATION[g] || []).map((base, w) => `<li class="${w === now ? 'now' : ''}">
          <span class="wk">Vecka ${w + 1}${w === now ? ' (nu)' : ''}</span>
          <ul class="plain">${rotWeek(g, w).map((id, k) => `<li class="${schemaEdit ? 'ex-line' : ''}">
            <span class="txt">${esc(exName(id))} <span class="muted">– ${esc(exPart(id))}</span>${id !== base[k] ? ' <span class="changed">Ändrad</span>' : ''}</span>
            ${schemaEdit ? `<button type="button" class="text-btn" data-action="rot-swap" data-group="${esc(g)}" data-week="${w}" data-slot="${k}"
              aria-label="Byt ${esc(exName(id))}, ${esc(s.name.toLowerCase())} vecka ${w + 1}">${icon('swap')}Byt</button>` : ''}
          </li>`).join('')}</ul>
        </li>`).join('')}
      </ol>`;
    });
    h += '</section>';
  });
  if (changes) {
    h += `<div class="schema-foot">
      <p class="muted">Du har bytt ${plural(changes, 'övning', 'övningar')} i schemat.</p>
      <button type="button" class="text-btn" data-action="rot-reset-all">${icon('undo')} Återställ hela schemat</button>
    </div>`;
  }
  return h;
}

// ---------- Vy: Historik ----------

function trendChip(t) {
  if (t.dir === 'up') return `<span class="trend up">${icon('up')}<span class="sr-only">Ökning: </span>${esc(t.text)}</span>`;
  if (t.dir === 'down') return `<span class="trend">${icon('down')}<span class="sr-only">Minskning: </span>${esc(t.text)}</span>`;
  return `<span class="trend">${esc(t.text)}</span>`;
}

// Historik har två delar: listan med pass och sidan Framsteg (bara skärmläge)
let histTab = 'pass';
let histPeriod = 4; // Framsteg för de senaste 4 eller 13 veckorna. 0 = allt

function viewHistorik() {
  const tab = (id, label, ico) => `<button type="button" data-action="hist-tab" data-tab="${id}" aria-pressed="${histTab === id}">${icon(ico)}${label}</button>`;
  return `<h2>Historik</h2>
    <div class="seg2" role="group" aria-label="Visa">${tab('pass', 'Pass', 'history')}${tab('framsteg', 'Framsteg', 'trending')}</div>
    ${histTab === 'framsteg' ? viewFramsteg() : viewPassList()}`;
}

// Räknar ihop framstegen för en period. weeks = antal veckor bakåt (med den här veckan), 0 = allt.
function progressStats(weeks) {
  const goal = SCHEDULE.length;
  const thisMonday = mondayOf(new Date());
  const firstMonday = state.history.length ? mondayOf(new Date(state.history[0].start)) : thisMonday;
  const wanted = weeks
    ? new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7 * (weeks - 1))
    : firstMonday;
  const from = wanted < firstMonday ? firstMonday : wanted; // Perioden börjar inte före ditt första pass

  const seen = new Map();    // Förra resultatet per övning
  const best = new Map();    // Bästa resultatet hittills per övning
  const records = new Map(); // Senaste rekordet i perioden per övning
  const ups = new Map();     // Ökningar per muskelgrupp
  const perWeek = new Map(); // Antal pass per vecka
  let passes = 0;
  let upCount = 0;

  for (const p of state.history) {
    const d = new Date(p.start);
    const inPeriod = d >= from;
    if (inPeriod) {
      passes++;
      const wk = dayKey(mondayOf(d));
      perWeek.set(wk, (perWeek.get(wk) || 0) + 1);
    }
    for (const e of p.exercises) {
      const r = lastSet(e);
      const t = trend(r, seen.get(e.exId), e.exId);
      seen.set(e.exId, r);
      if (inPeriod && t.dir === 'up') {
        upCount++;
        const g = exGroup(e.exId);
        ups.set(g, (ups.get(g) || 0) + 1);
      }
      // Rekord: mer än alla tidigare gånger. Vikt räknas om övningen har vikt, annars reps eller sekunder.
      const useKg = hasKg(r);
      const val = Number(useKg ? r.kg : r.reps) || 0;
      const b = best.get(e.exId);
      if (b && b.useKg === useKg && val > b.val && inPeriod) {
        records.set(e.exId, { exId: e.exId, start: p.start, val, delta: round2(val - b.val), useKg });
      }
      if (!b || b.useKg !== useKg || val > b.val) best.set(e.exId, { val, useKg });
    }
  }

  // Veckor med alla pass. Veckan som pågår räknas först när den är komplett.
  let fullWeeks = 0;
  let countedWeeks = 0;
  for (let m = new Date(from); m <= thisMonday; m = new Date(m.getFullYear(), m.getMonth(), m.getDate() + 7)) {
    const n = perWeek.get(dayKey(m)) || 0;
    const current = dayKey(m) === dayKey(thisMonday);
    if (current && n < goal) continue;
    countedWeeks++;
    if (n >= goal) fullWeeks++;
  }

  return {
    passes, upCount, fullWeeks, countedWeeks, ups,
    records: [...records.values()].sort((a, b) => new Date(b.start) - new Date(a.start)),
  };
}

function viewFramsteg() {
  if (!state.history.length) return '<p>Här visas dina framsteg när du har sparat några pass.</p>';
  const st = progressStats(histPeriod);
  const period = (weeks, label) => `<button type="button" class="filter-chip" data-action="hist-period" data-weeks="${weeks}"
    aria-pressed="${histPeriod === weeks}">${histPeriod === weeks ? icon('check') : ''}${label}</button>`;
  const groups = allGroups();
  const max = Math.max(1, ...groups.map(g => st.ups.get(g) || 0));

  return `<div class="chips wrap" role="group" aria-label="Period">${period(4, '4 veckor')}${period(13, '3 månader')}${period(0, 'Allt')}</div>
    <dl class="stat-row">
      <div><dt>pass</dt><dd>${st.passes}</dd></div>
      <div><dt>${st.upCount === 1 ? 'ökning' : 'ökningar'}</dt><dd>${st.upCount}</dd></div>
      <div><dt>veckor med alla pass</dt><dd>${st.countedWeeks ? `${st.fullWeeks} av ${st.countedWeeks}` : '–'}</dd></div>
    </dl>
    <section class="card progress-card">
      <h3>Nya rekord</h3>
      ${st.records.length
        ? `<ul class="plain recs">${st.records.slice(0, 10).map(r => {
          const unit = r.useKg ? 'kg' : unitOf(r.exId);
          return `<li class="rec">
            ${icon('star')}
            <span class="txt"><span class="name">${esc(exName(r.exId))}</span><span class="meta">${fmtNum(r.val)} ${unit} · ${esc(shortDate(r.start).toLowerCase())}</span></span>
            ${trendChip({ dir: 'up', text: `${fmtNum(r.delta)} ${unit}` })}
          </li>`;
        }).join('')}</ul>${st.records.length > 10 ? `<p class="muted small">Visar de 10 senaste av ${st.records.length}.</p>` : ''}`
        : '<p class="muted">Inga nya rekord i perioden än.</p>'}
      <p class="muted small">Ett rekord är när sista setet blev tyngre än alla tidigare gånger. För övningar utan vikt räknas reps eller sekunder.</p>
    </section>
    <section class="card progress-card">
      <h3>Ökningar per muskelgrupp</h3>
      <ul class="plain bars">
        ${groups.map(g => {
          const n = st.ups.get(g) || 0;
          return `<li><span class="g">${esc(g)}</span><span class="b" aria-hidden="true"><i style="width:${(n / max) * 100}%"></i></span><span class="v">${n}<span class="sr-only"> ${n === 1 ? 'ökning' : 'ökningar'}</span></span></li>`;
        }).join('')}
      </ul>
      <p class="muted small">En ökning är när sista setet blev bättre än förra gången: mer vikt, eller fler reps med samma vikt.</p>
    </section>`;
}

function viewPassList() {
  let h = '';
  if (!state.history.length) h += '<p>Här hamnar dina pass när du avslutat dem.</p>';

  const trends = trendsByPass();
  const thisYear = new Date().getFullYear();
  let month = null;
  [...state.history].reverse().forEach((p, idx) => {
    const d = new Date(p.start);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== month) {
      month = key;
      h += `<h3 class="overline month">${cap(MONTHS[d.getMonth()])}${d.getFullYear() !== thisYear ? ` ${d.getFullYear()}` : ''}</h3>`;
    }
    const ts = trends.get(p.id) || [];
    const ups = ts.filter(t => t.dir === 'up').length;
    const mins = passMinutes(p.start, p.end);
    const meta = [
      p.week ? `Vecka ${p.week}` : '',
      mins ? `${mins} min` : '',
      plural(p.exercises.length, 'övning', 'övningar'),
      ups ? plural(ups, 'ökning', 'ökningar') : '',
    ].filter(Boolean).join(' · ');
    const title = `${shortDate(p.start)} · ${splitTitle(p.title, 'Pass').main}`;

    h += `<details class="card pass" data-pass="${esc(p.id)}" ${idx === 0 ? 'open' : ''}>
      <summary>
        <div class="txt"><h4 class="name">${esc(title)}</h4><span class="meta">${esc(meta)}</span></div>
        <span class="chev">${icon('expand')}</span>
      </summary>
      <ul class="res-list">
        ${p.exercises.map((e, k) => `<li>
          <span class="n">${esc(exName(e.exId))}</span>
          <span class="r">${esc(formatShort(lastSet(e), e.exId))}</span>
          ${trendChip(ts[k] || { dir: 'same', text: '' })}
        </li>`).join('')}
      </ul>
      <div class="card-foot">
        <button type="button" class="text-btn danger" data-action="delete-pass" data-id="${esc(p.id)}" aria-label="Radera passet ${esc(title)}">${icon('delete')} Radera passet</button>
      </div>
    </details>`;
  });

  h += `<section class="card backup">
    <h3>Säkerhetskopia</h3>
    <p>Dina pass finns bara i den här webbläsaren. Spara en kopia ibland, till exempel i OneDrive.</p>
    <div class="row">
      <button type="button" class="btn small" data-action="export">Spara kopia</button>
      <label class="btn small ghost" for="import-file">Läs in kopia</label>
      <input id="import-file" type="file" accept="application/json,.json" class="sr-only">
    </div>
  </section>`;
  return h;
}

// ---------- Vy: Övningar ----------

// Sök och filter under Övningar (sparas bara medan appen är öppen)
let exQuery = '';
let exFilter = null; // null = alla muskelgrupper
let eqFilter = null; // null = alla redskap

function viewOvningar() {
  return `<h2>Övningar</h2>
    <div class="search-field">
      ${icon('search')}
      <label for="ex-search" class="sr-only">Sök övning, muskel eller redskap</label>
      <input id="ex-search" type="search" placeholder="Sök övning, muskel eller redskap …" autocomplete="off" value="${esc(exQuery)}">
    </div>
    <p class="chips-label" id="lbl-group">Muskelgrupp</p>
    <div class="chips" role="group" aria-labelledby="lbl-group">
      ${[null, ...allGroups()].map(g => `<button type="button" class="filter-chip" data-action="filter-group"
        data-group="${esc(g ?? '')}" aria-pressed="${exFilter === g}">${exFilter === g ? icon('check') : ''}${esc(g ?? 'Alla')}</button>`).join('')}
    </div>
    <p class="chips-label" id="lbl-eq">Redskap</p>
    <div class="chips" role="group" aria-labelledby="lbl-eq">
      ${[null, ...EQUIPMENT].map(q => `<button type="button" class="filter-chip" data-action="filter-eq"
        data-eq="${q ? q.id : ''}" aria-pressed="${eqFilter === (q ? q.id : null)}">${eqFilter === (q ? q.id : null) ? icon('check') : (q ? eqIcon(q.id) : '')}${esc(q ? q.name : 'Alla')}</button>`).join('')}
    </div>
    <p id="ex-count" class="muted small" aria-live="polite"></p>
    <div id="ex-list"></div>
    <section class="card">
      <h3>Lägg till egen övning</h3>
      <form id="add-ex-form" class="stack">
        <label for="new-ex-name">Namn</label>
        <input id="new-ex-name" name="exname" type="text" required maxlength="40" autocomplete="off">
        <label for="new-ex-group">Muskelgrupp</label>
        <select id="new-ex-group" name="exgroup">${GROUPS.map(g => `<option>${esc(g)}</option>`).join('')}</select>
        <label for="new-ex-eq">Redskap</label>
        <select id="new-ex-eq" name="exeq">${EQUIPMENT.map(q => `<option value="${q.id}">${esc(q.name)}</option>`).join('')}<option value="">Annat</option></select>
        <button type="submit" class="btn primary">Lägg till</button>
      </form>
    </section>`;
}

// När ligger övningen i schemat? "Mån v. 2"
function scheduleFor(ex) {
  const weeks = (ROTATION[ex.group] || []).map((_, w) => (rotWeek(ex.group, w).includes(ex.id) ? w + 1 : 0)).filter(Boolean);
  const day = SCHEDULE.find(s => s.groups.includes(ex.group));
  return weeks.length && day ? `${day.name.slice(0, 3)} v. ${weeks.join(', ')}` : '–';
}

// Liten kurva över de senaste resultaten (vikt, eller reps för övningar utan vikt)
function sparkline(ex, results) {
  const pts = results.slice(-8);
  if (pts.length < 2) return '';
  const useKg = pts.some(hasKg);
  const vals = pts.map(r => Number(useKg ? r.kg : r.reps) || 0);
  const unit = useKg ? 'kg' : unitOf(ex.id);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const x = k => 14 + (k * (320 - 28)) / (pts.length - 1);
  const y = v => (max === min ? 44 : 66 - ((v - min) / (max - min)) * 40);
  const first = vals[0];
  const last = vals[vals.length - 1];
  return `<p class="muted small spark-cap">Utveckling, sista setet (${unit})</p>
    <svg class="spark" viewBox="0 0 320 84" role="img" aria-label="Utveckling för ${esc(ex.name)}: från ${fmtNum(first)} till ${fmtNum(last)} ${unit} på ${pts.length} pass">
      <line x1="0" y1="78" x2="320" y2="78" class="axis"/>
      <polyline class="line" points="${vals.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>
      ${vals.map((v, k) => `<circle cx="${x(k).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${k === vals.length - 1 ? 5 : 3.5}"/>`).join('')}
      <text x="${x(0) - 8}" y="${y(first) - 10}">${fmtNum(first)}</text>
      <text x="${x(vals.length - 1) + 8}" y="${y(last) - 10}" text-anchor="end">${fmtNum(last)}</text>
    </svg>`;
}

function exerciseItem(ex, results) {
  const kgs = results.map(r => Number(r.kg) || 0);
  const best = kgs.length ? Math.max(...kgs) : 0;
  const latest = results[results.length - 1];
  const custom = state.custom.some(c => c.id === ex.id);
  const meta = [ex.part, best ? `bästa ${fmtNum(best)} kg` : ''].filter(Boolean).join(' · ');
  return `<details class="ex-item" data-ex="${esc(ex.id)}">
    <summary>
      ${thumb(ex.id)}
      <span class="txt"><span class="name">${esc(ex.name)}</span>${meta || ex.eq ? `<span class="meta">${eqTag(ex.id)}${esc(meta)}</span>` : ''}</span>
      <span class="chev">${icon('expand')}</span>
    </summary>
    <div class="detail">
      ${howImgs(ex.id)}
      <dl class="kv">
        <div><dt>${latest ? `senast, ${esc(new Date(latest.start).getDate() + ' ' + monShort(new Date(latest.start)))}` : 'senast'}</dt><dd>${latest ? esc(formatShort(latest, ex.id)) : '–'}</dd></div>
        <div><dt>bästa vikt</dt><dd>${best ? `${fmtNum(best)} kg` : '–'}</dd></div>
        <div><dt>i schemat</dt><dd>${esc(scheduleFor(ex))}</dd></div>
      </dl>
      ${sparkline(ex, results)}
      ${noteBlock(ex.id) || `<div class="card-actions">${noteButton(ex.id)}</div>`}
      ${custom ? `<div class="card-foot"><button type="button" class="text-btn danger" data-action="delete-custom" data-id="${esc(ex.id)}" aria-label="Radera övningen ${esc(ex.name)}">${icon('delete')} Radera övningen</button></div>` : ''}
    </div>
  </details>`;
}

function renderExList() {
  const $list = document.getElementById('ex-list');
  if (!$list) return;
  const q = exQuery.trim().toLowerCase();
  const matches = e => exMatches(e, q) && (eqFilter == null || e.eq === eqFilter);
  const results = resultsByExercise();
  let h = '';
  let count = 0;
  allGroups().filter(g => exFilter == null || g === exFilter).forEach(g => {
    const list = allExercises().filter(e => e.group === g && matches(e));
    if (!list.length) return;
    count += list.length;
    h += `<section class="card list-card"><h3>${esc(g)}</h3>
      ${list.map(e => exerciseItem(e, results.get(e.id) || [])).join('')}
    </section>`;
  });
  $list.innerHTML = h || '<section class="card"><p>Ingen övning matchar. Prova ett annat ord, eller lägg till en egen övning nedanför.</p></section>';
  document.getElementById('ex-count').textContent = plural(count, 'övning', 'övningar');
}

// ---------- Rita upp ----------

const VIEWS = { hem: viewHem, pass: viewPass, schema: viewSchema, historik: viewHistorik, ovningar: viewOvningar };

function render() {
  if (view === 'pass' && !state.active) view = 'hem';
  document.querySelector('.tabs [data-view="pass"]').hidden = !state.active;
  document.querySelectorAll('.tabs button').forEach(b => {
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $main.innerHTML = VIEWS[view]();
  if (view === 'ovningar') renderExList();
}

// Rita om men behåll fokus på samma knapp/fält
function rerender() {
  const el = document.activeElement;
  let sel = null;
  if (el && $main.contains(el)) {
    if (el.id) sel = `#${CSS.escape(el.id)}`;
    else if (el.dataset && el.dataset.action) {
      sel = ['action', 'i', 'field', 'dir', 'group', 'eq', 'day', 'id', 'week', 'slot', 'tab', 'weeks'].filter(k => el.dataset[k] != null)
        .map(k => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('');
    }
  }
  render();
  if (sel) {
    const again = $main.querySelector(sel);
    if (again) again.focus({ preventScroll: true });
  }
}

function show(v) {
  if (v !== 'schema') schemaEdit = false;
  view = v;
  render();
  window.scrollTo(0, 0);
  $main.focus({ preventScroll: true });
}

function scrollToEl(el) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
}

// Efter Set klart, Ångra eller när en tid kvitteras: fokus på knappen i set-raden om den finns,
// annars på övningens namn
function focusSetRow(i) {
  if (view !== 'pass' || !state.active) {
    // På en annan flik: knappen i tidraden försvann, så fokus går till sidans innehåll
    const el = document.activeElement;
    if (!el || el === document.body || $timerBar.contains(el)) $main.focus({ preventScroll: true });
    return;
  }
  const card = document.getElementById(`ex-${i}`);
  const target = (card && card.querySelector('.setrow .pill-btn')) || document.getElementById(`ex-name-${i}`);
  if (target) target.focus({ preventScroll: true });
}

// Efter att en övning öppnats eller blivit klar: flytta fokus till nästa steg
function focusPassStep() {
  const open = currentOpen();
  const target = open >= 0
    ? document.getElementById(`ex-name-${open}`)
    : $main.querySelector('[data-action="finish"]');
  if (!target) return;
  target.focus({ preventScroll: true });
  scrollToEl(open >= 0 ? document.getElementById(`ex-${open}`) : target);
}

// ---------- Färgtema ----------

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--surface-container').trim();
  const meta = document.getElementById('theme-color');
  if (meta && color) meta.setAttribute('content', color);
}

const fmtRest = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function themeButtons() {
  return THEMES.map(t => `<button type="button" class="theme-opt" data-theme="${t.id}"
    data-action="set-theme" data-id="${t.id}" aria-pressed="${state.settings.theme === t.id}">
    <span class="swatch" aria-hidden="true"><span></span></span>${esc(t.name)}
    ${state.settings.theme === t.id ? icon('check') : ''}
  </button>`).join('');
}

function renderSettings() {
  const st = state.settings;
  const option = (value, label, current) => `<option value="${value}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;
  $settingsBody.innerHTML = `
    <h3 class="set-sec">Färgtema</h3>
    <p class="muted small">Ljust eller mörkt läge följer mobilens inställning.</p>
    <div id="theme-list" class="theme-list" role="group" aria-label="Välj färgtema">${themeButtons()}</div>

    <h3 class="set-sec">Steg för plus och minus</h3>
    <p class="muted small">Så mycket ändras vikten när du trycker plus eller minus. Automatiskt betyder 1 kg upp till 10 kg, sedan 2,5 kg.</p>
    ${STEP_EQUIPMENT.map(id => `<div class="set-row">
      <label for="step-${id}">${eqIcon(id)}${esc(eqById(id).name)}</label>
      <select id="step-${id}" data-setting="step" data-eq="${id}">
        ${STEP_OPTIONS.map(v => option(v, v ? `${fmtNum(v)} kg` : 'Automatiskt', st.steps[id] || 0)).join('')}
      </select>
    </div>`).join('')}

    <h3 class="set-sec">Vila mellan set</h3>
    <p class="muted small">I passet trycker du Set klart efter varje set. Då räknas seten och vilan räknas ner.</p>
    <div class="set-row">
      <label for="set-rest">${icon('timer')}Nedräkning</label>
      <select id="set-rest" data-setting="rest">
        ${REST_OPTIONS.map(v => option(v, v ? fmtRest(v) : 'Räkna inte set', st.rest)).join('')}
      </select>
    </div>
    <div class="set-row">
      <label for="set-sound">${icon('sound')}Ljud när vilan är slut</label>
      <input type="checkbox" class="switch" id="set-sound" data-setting="sound" ${st.sound ? 'checked' : ''}>
    </div>`;
}

// ---------- Åtgärder ----------

// Ny övning i passet: vikten från förra gången och målet i reps är ifyllt
function newEntry(exId) {
  const prev = lastResultFor(exId);
  return { exId, kg: prev && hasKg(prev) ? prev.kg : '', reps: repsFor(exId), done: false };
}

function startPass(day) {
  if (state.active) { show('pass'); return; }
  const s = SCHEDULE.find(x => String(x.day) === String(day));
  const week = activeWeek();
  state.active = {
    id: uid(),
    start: new Date().toISOString(),
    title: s ? `${dayTitle(s)} · vecka ${week + 1}` : 'Eget pass',
    week: s ? week + 1 : null,
    exercises: (s ? exercisesFor(s, week) : []).filter(exById).map(newEntry),
  };
  openIdx = null;
  showHow = false;
  save();
  show('pass');
}

function endPass(target, message) {
  clearTimer();
  histTab = 'pass';
  state.active = null;
  openIdx = null;
  showHow = false;
  chosenWeek = null;
  save();
  show(target);
  if (message) announce(message);
}

function finishPass() {
  const a = state.active;
  const exercises = a.exercises
    .filter(e => e.done && Number(e.reps) > 0)
    .map(e => ({
      exId: e.exId,
      sets: [{ kg: e.kg, reps: e.reps }],
      targetSets: DEFAULT_SETS,
      targetReps: repsFor(e.exId),
    }));

  if (!exercises.length) {
    if (!confirm('Ingen övning är markerad som klar. Vill du avsluta utan att spara något?')) return;
    endPass('hem', 'Passet avslutades utan att sparas.');
    return;
  }
  const skipped = a.exercises.length - exercises.length;
  if (skipped > 0 && !confirm(`${plural(skipped, 'övning är', 'övningar är')} inte klar och sparas inte. Avsluta ändå?`)) return;

  state.history.push({
    id: a.id, start: a.start, end: new Date().toISOString(),
    title: a.title, week: a.week, exercises,
  });
  state.history.sort(byStart);
  endPass('historik', 'Bra jobbat! Passet är sparat.');
  showPass(a.id);
}

// Öppnar ett visst pass i historiken och rullar dit
function showPass(id) {
  const el = [...$main.querySelectorAll('details.pass')].find(d => d.dataset.pass === id);
  if (!el) return;
  el.open = true;
  if (el !== $main.querySelector('details.pass')) scrollToEl(el);
}

// Lägger in en övning sist i sin muskelgrupp, så att passet inte får samma rubrik två gånger.
// Finns gruppen inte i passet hamnar övningen sist. Returnerar platsen.
function insertInGroup(list, id) {
  const group = exGroup(id);
  let last = -1;
  list.forEach((e, k) => { if (exGroup(e.exId) === group) last = k; });
  const idx = last >= 0 ? last + 1 : list.length;
  list.splice(idx, 0, newEntry(id));
  return idx;
}

// Väljaren används på tre sätt:
//   { type: 'add' }                          lägg till en övning i passet
//   { type: 'swap', index, current, group }  byt en övning i dagens pass
//   { type: 'rot', group, week, slot, current }  byt en övning i schemat
let pickerMode = { type: 'add' };

function openPicker(mode = { type: 'add' }) {
  pickerMode = mode;
  const name = mode.current ? exName(mode.current) : '';
  $pickerTitle.textContent = { add: 'Lägg till övning', swap: 'Byt övning', rot: 'Byt övning i schemat' }[mode.type];
  const day = mode.type === 'rot' ? SCHEDULE.find(x => x.groups.includes(mode.group)) : null;
  $pickerIntro.textContent = {
    add: '',
    swap: `${name} byts bara i dagens pass.`,
    rot: `${day ? `${day.name}, vecka` : 'Vecka'} ${mode.week + 1}. Nu: ${name}.`,
  }[mode.type];
  $pickerIntro.hidden = mode.type === 'add';
  $search.value = '';
  renderPicker();
  $picker.showModal();
  // När du lägger till börjar du oftast med att söka. Vid byte visas förslag direkt,
  // så då hamnar fokus på rubriken och tangentbordet täcker inte förslagen.
  (mode.type === 'add' ? $search : $pickerTitle).focus();
}

// En rad i väljaren. "tags" är små etiketter före redskapet, "meta" är texten efter.
function pickRow(e, tags, meta) {
  return `<button type="button" class="btn small pick" data-action="pick" data-id="${esc(e.id)}">
    ${thumb(e.id)}
    <span class="grow">${esc(e.name)}<span class="sub">${tags}${eqTag(e.id)}${esc(meta)}</span></span>
  </button>`;
}
const pickSection = (title, rows) => (rows.length ? `<h3>${esc(title)}</h3><div class="stack">${rows.join('')}</div>` : '');
const tag = (text, cls = '') => `<span class="eq ${cls}">${text}</span>`;

function renderPicker() {
  const q = $search.value.trim().toLowerCase();
  const m = pickerMode;
  const inPass = new Set(state.active ? state.active.exercises.map(e => e.exId) : []);
  let h = '';

  if (m.type === 'add' || (m.type === 'swap' && (q || m.all))) {
    // Hela listan, grupp för grupp. Vid byte visas inte det som redan är med i passet.
    allGroups().forEach(g => {
      const list = allExercises().filter(e => e.group === g && exMatches(e, q) && !(m.type === 'swap' && inPass.has(e.id)));
      h += pickSection(g, list.map(e => pickRow(e, inPass.has(e.id) ? tag(`${icon('check')}I passet`, 'in-pass') : '', e.part || '')));
    });
  } else {
    // Förslag: först övningar för samma del av muskeln, sedan resten av muskelgruppen
    const cur = exById(m.current);
    const taken = m.type === 'swap' ? inPass : new Set(rotWeek(m.group, m.week));
    const pool = allExercises().filter(e => e.group === m.group && e.id !== m.current && !taken.has(e.id) && exMatches(e, q));
    const same = cur && cur.part ? pool.filter(e => e.part === cur.part) : [];
    const rest = pool.filter(e => !same.includes(e));
    const row = e => {
      if (m.type === 'swap') {
        const last = lastResultFor(e.id);
        return pickRow(e, '', last ? `Senast ${formatShort(last, e.id)}` : 'Inte loggad än');
      }
      const weeks = (ROTATION[m.group] || []).map((_, w) => (rotWeek(m.group, w).includes(e.id) ? w + 1 : 0)).filter(Boolean);
      return pickRow(e, weeks.length ? tag(`Redan vecka ${weeks.join(', ')}`, 'used') : '', e.part || '');
    };
    if (m.type === 'rot' && !q) {
      const base = rotBase(m.group, m.week)[m.slot];
      if (base !== m.current) {
        h += `<button type="button" class="btn ghost wide" data-action="rot-reset">${icon('undo')} Tillbaka till förslaget: ${esc(exName(base))}</button>`;
      }
    }
    h += pickSection(`Samma del: ${cur && cur.part ? cur.part.toLowerCase() : ''}`, same.map(row));
    h += pickSection(`${same.length ? 'Andra övningar' : 'Övningar'} för ${String(m.group).toLowerCase()}`, rest.map(row));
    if (m.type === 'swap') {
      h += `<button type="button" class="btn ghost wide" data-action="picker-all">Visa alla övningar</button>`;
    }
  }
  $pickerList.innerHTML = h || '<p>Ingen övning hittades.</p>';
}

// ---------- Vila mellan set och tidtagning ----------
// Tidtagningen sparas i det pågående passet: active.timer = { kind, exId, set, end, total, done }
//   kind:  'rest' = vila före nästa set, 'work' = ett set som mäts i sekunder (t.ex. plankan)
//   end:   klockslaget (i millisekunder) när tiden är slut. Tiden räknas mot klockan,
//          så den stämmer även om skärmen har varit släckt en stund.
//   total: hela tiden i sekunder, set: vilket set det gäller, done: tiden är slut men inte kvitterad

let tick = null;      // Uppdaterar raden fyra gånger per sekund medan en tid går
let wakeLock = null;  // Håller skärmen tänd under nedräkningen, där mobilen stöder det
let audioCtx = null;  // Ljud, bara om du slagit på det under Inställningar
let barState = '';
let barHeight = 0;

const timerOf = () => (state.active && state.active.timer) || null;

function startTimer(kind, exId, seconds, setNo) {
  state.active.timer = { kind, exId, set: setNo, end: Date.now() + seconds * 1000, total: seconds, done: false };
  save();
  if (state.settings.sound) wakeSound();
  runTimer();
}

function runTimer() {
  if (!tick) tick = setInterval(onTick, 250);
  keepAwake(true);
  renderTimer();
}

function stopTicking() {
  if (tick) { clearInterval(tick); tick = null; }
  keepAwake(false);
}

function clearTimer() {
  if (state.active && state.active.timer) {
    delete state.active.timer;
    save();
  }
  stopTicking();
  renderTimer();
}

function onTick() {
  const t = timerOf();
  if (!t) { clearTimer(); return; }
  if (!t.done && Date.now() >= t.end) { timerEnded(t); return; }
  if (t.done && Date.now() - t.end > 60000) { clearTimer(); return; } // Kvitteras av sig själv efter en minut
  renderTimer();
}

function timerEnded(t) {
  const a = state.active;
  const e = a.exercises.find(x => x.exId === t.exId);
  signal();
  if (t.kind === 'work' && e) {
    // Ett set i sekunder är klart: räkna det och börja vila, om det finns fler set kvar
    e.setsDone = Math.min(DEFAULT_SETS, setsDoneOf(e) + 1);
    if (e.setsDone < DEFAULT_SETS && state.settings.rest) {
      const rest = state.settings.rest;
      a.timer = { kind: 'rest', exId: t.exId, set: e.setsDone + 1, end: Date.now() + rest * 1000, total: rest, done: false };
      save();
      announce(`Set ${t.set} klart. Vila ${fmtRest(rest)}.`);
      if (view === 'pass') rerender();
      renderTimer();
      return;
    }
  }
  t.done = true;
  t.end = Math.min(t.end, Date.now());
  save();
  keepAwake(false);
  announce(t.kind === 'rest' ? `Vilan är slut. Dags för set ${t.set}.` : 'Sista setet är klart.');
  if (view === 'pass') rerender();
  renderTimer();
}

function renderTimer() {
  const t = timerOf();
  $timerBar.hidden = !t;
  document.body.classList.toggle('has-timer', !!t);
  if (!t) { barState = ''; return; }
  const key = `${t.kind}|${t.done}|${t.set}|${t.exId}`;
  if (key !== barState) {
    // Text och knappar byts bara när läget ändras, så att fokus inte försvinner varje sekund
    barState = key;
    const rest = t.kind === 'rest';
    $timerBar.classList.toggle('done', !!t.done);
    $timerLabel.textContent = t.done
      ? (rest ? `Dags för set ${t.set}` : 'Sista setet är klart')
      : (rest ? `Vila före set ${t.set}` : `${exName(t.exId)}, set ${t.set}`);
    $timerButtons.innerHTML = t.done
      ? '<button type="button" data-action="timer-clear">OK</button>'
      : `<button type="button" data-action="timer-add" aria-label="+30 s, lägg till 30 sekunder">+30 s</button>
         <button type="button" data-action="timer-skip" aria-label="${rest ? 'Hoppa över vilan' : 'Stopp, avsluta setet nu'}">${icon('skip')}${rest ? 'Hoppa' : 'Stopp'}</button>`;
  }
  const leftMs = Math.max(0, t.end - Date.now());
  $timerTime.textContent = t.done ? '0:00' : fmtRest(Math.ceil(leftMs / 1000));
  $timerFill.style.width = t.done ? '100%' : `${Math.min(100, Math.max(0, 100 - (leftMs / (t.total * 1000)) * 100))}%`;
  // Raden kan bli två rader hög på smala skärmar eller med stor text. Sidan och meddelandena flyttar sig efter den.
  const h = $timerBar.offsetHeight;
  if (h && h !== barHeight) { barHeight = h; document.body.style.setProperty('--timer-h', `${h}px`); }
}

// När appen öppnas igen: fortsätt en tid som fortfarande går, annars ta bort den
function resumeTimer() {
  const t = timerOf();
  if (t && !t.done && Date.now() < t.end) runTimer();
  else clearTimer();
}

// Håller skärmen tänd under nedräkningen. Alla mobiler stöder inte det – då händer ingenting.
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock && !document.hidden) {
      const lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
      wakeLock = lock;
      if (!timerOf() || timerOf().done) keepAwake(false); // Tiden hann ta slut medan vi väntade
    } else if (!on && wakeLock) {
      const lock = wakeLock;
      wakeLock = null;
      await lock.release();
    }
  } catch (e) { wakeLock = null; }
}

// Signal när tiden är slut: vibration där det går, och ljud om du har slagit på det
function signal() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* stöds inte */ }
  if (state.settings.sound) beep();
}

// Webbläsaren tillåter bara ljud som har väckts av ett tryck. Därför väcks ljudet när du trycker Set klart.
function wakeSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (e) { return null; }
}

function beep() {
  const ctx = wakeSound();
  if (!ctx) return;
  try {
    [0, 0.25].forEach(at => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + at;
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
  } catch (e) { /* inget ljud */ }
}

// ---------- Anteckningar ----------

let noteExId = null; // Vilken övning anteckningsrutan gäller

function openNote(exId) {
  noteExId = exId;
  $noteLabel.textContent = `Anteckning för ${exName(exId)}`;
  $noteText.value = state.notes[exId] || '';
  $noteDelete.hidden = !state.notes[exId];
  $noteDialog.showModal();
  $noteText.focus();
}

// Sparar (eller tar bort) anteckningen och ställer tillbaka fokus där du var
function saveNote(text) {
  const exId = noteExId;
  if (!exId) return;
  const had = !!state.notes[exId];
  const clean = String(text || '').trim().slice(0, NOTE_MAX);
  if (clean) state.notes[exId] = clean;
  else delete state.notes[exId];
  save();
  $noteDialog.close();
  noteExId = null;
  render();
  if (view === 'ovningar') {
    const item = [...$main.querySelectorAll('details.ex-item')].find(d => d.dataset.ex === exId);
    if (item) item.open = true;
  }
  const btn = [...$main.querySelectorAll('[data-action="edit-note"]')].find(el => el.dataset.id === exId);
  if (btn) btn.focus({ preventScroll: true });
  if (clean) announce('Anteckningen är sparad.');
  else if (had) announce('Anteckningen är borttagen.');
}

// ---------- Schemat: byt övning ----------

function focusRotButton(m) {
  const btn = $main.querySelector(`[data-action="rot-swap"][data-group="${CSS.escape(m.group)}"][data-week="${m.week}"][data-slot="${m.slot}"]`);
  if (btn) btn.focus({ preventScroll: true });
}

function setRotation(m, id) {
  const base = rotBase(m.group, m.week)[m.slot];
  const key = rotKey(m.group, m.week, m.slot);
  if (id === base) delete state.rotation[key];
  else state.rotation[key] = id;
  save();
  $picker.close();
  render();
  focusRotButton(m);
  announce(`Vecka ${m.week + 1}: ${exName(id)} i stället för ${exName(m.current)}.`);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = `gymma-kopia-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const s = JSON.parse(reader.result);
      if (!s || !Array.isArray(s.history)) throw new Error('fel format');
      if (!confirm(`Kopian innehåller ${s.history.length} pass. Ersätta det som finns nu?`)) return;
      stopTicking();
      state = normalize({ ...emptyState(), ...s });
      openIdx = null;
      showHow = false;
      save();
      applyTheme();
      render();
      resumeTimer();
      announce('Kopian är inläst.');
    } catch (e) {
      announce('Filen kunde inte läsas. Är det en kopia från Gymma?');
    }
  };
  reader.onerror = () => announce('Filen kunde inte läsas.');
  reader.readAsText(file);
}

// ---------- Händelser ----------

const PASS_ACTIONS = ['open-ex', 'toggle-how', 'step', 'bump', 'done', 'remove-ex', 'swap-ex', 'open-picker', 'finish', 'cancel',
  'set-done', 'set-time', 'set-undo', 'timer-add', 'timer-skip', 'timer-clear'];

document.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const { action } = btn.dataset;
  const i = Number(btn.dataset.i);
  const a = state.active;
  if (PASS_ACTIONS.includes(action) && !a) return;

  switch (action) {
    case 'goto': show(btn.dataset.view); break;
    case 'filter-group':
      exFilter = btn.dataset.group || null;
      rerender();
      break;
    case 'filter-eq':
      eqFilter = btn.dataset.eq || null;
      rerender();
      break;
    case 'start': startPass(btn.dataset.day); break;

    case 'open-ex':
      openIdx = i;
      showHow = false;
      render();
      focusPassStep();
      break;
    case 'toggle-how':
      showHow = !showHow;
      rerender();
      break;
    case 'step': {
      const e = a.exercises[i];
      const dir = Number(btn.dataset.dir);
      if (btn.dataset.field === 'kg') {
        const v = stepKg(e.kg, dir, e.exId);
        e.kg = v === 0 ? '' : v;
      } else {
        e.reps = stepReps(e.reps, dir, e.exId);
      }
      save(); rerender();
      break;
    }
    case 'set-done': {
      // Ett set är gjort: räkna det och börja vila
      const e = a.exercises[i];
      if (!e || isSek(e.exId) || !state.settings.rest) return;
      e.setsDone = Math.min(DEFAULT_SETS - 1, setsDoneOf(e) + 1);
      startTimer('rest', e.exId, state.settings.rest, e.setsDone + 1);
      render();
      focusSetRow(i);
      announce(`Set ${e.setsDone} klart. Vila ${fmtRest(state.settings.rest)}.`);
      break;
    }
    case 'set-time': {
      // Övning i sekunder: räkna ner setet
      const e = a.exercises[i];
      if (!e || !isSek(e.exId) || setsDoneOf(e) >= DEFAULT_SETS) return;
      const secs = Number(e.reps) > 0 ? Number(e.reps) : repsFor(e.exId);
      startTimer('work', e.exId, secs, setsDoneOf(e) + 1);
      render();
      focusSetRow(i);
      announce(`Set ${setsDoneOf(e) + 1} startar. ${secs} sekunder.`);
      break;
    }
    case 'set-undo': {
      const e = a.exercises[i];
      if (!e) return;
      e.setsDone = Math.max(0, setsDoneOf(e) - 1);
      const t = timerOf();
      if (t && t.exId === e.exId) clearTimer();
      save(); render();
      focusSetRow(i);
      announce(`Ångrat. ${e.setsDone} av ${DEFAULT_SETS} set klara.`);
      break;
    }
    case 'timer-add': {
      const t = timerOf();
      if (!t || t.done) return;
      t.end += 30000;
      t.total += 30;
      save(); renderTimer();
      break;
    }
    case 'timer-skip': {
      const t = timerOf();
      if (!t || t.done) return;
      if (t.kind === 'work') {
        t.end = Date.now(); // Setet avslutas nu och räknas
        timerEnded(t);
      } else {
        clearTimer();
        if (view === 'pass') render();
      }
      focusSetRow(currentOpen());
      break;
    }
    case 'timer-clear':
      clearTimer();
      if (view === 'pass') render();
      focusSetRow(currentOpen());
      break;

    case 'bump': {
      const e = a.exercises[currentOpen()];
      const sug = e && suggestedKg(e.exId, lastResultFor(e.exId));
      if (sug == null) return;
      e.kg = sug;
      save(); render();
      const next = $main.querySelector('[data-action="done"]');
      if (next) next.focus({ preventScroll: true });
      announce(`Vikten är höjd till ${fmtNum(sug)} kg.`);
      break;
    }
    case 'done': {
      const e = a.exercises[i];
      if (!(Number(e.reps) > 0)) {
        announce(`Fyll i hur många ${isSek(e.exId) ? 'sekunder' : 'reps'} du orkade i sista setet.`);
        return;
      }
      e.done = true;
      if (timerOf() && timerOf().exId === e.exId) clearTimer();
      const next = a.exercises.findIndex((x, k) => k > i && !x.done);
      openIdx = next >= 0 ? next : null;
      showHow = false;
      save(); render();
      focusPassStep();
      if (a.exercises.every(x => x.done)) announce('Alla övningar är klara. Avsluta passet för att spara det.');
      break;
    }
    case 'remove-ex':
      if (!confirm(`Ta bort ${exName(a.exercises[i].exId)} från passet?`)) return;
      if (timerOf() && timerOf().exId === a.exercises[i].exId) clearTimer();
      a.exercises.splice(i, 1);
      openIdx = null;
      showHow = false;
      save(); render();
      $main.focus({ preventScroll: true });
      break;

    case 'open-picker': openPicker(); break;
    case 'swap-ex': {
      const cur = a.exercises[i];
      if (cur) openPicker({ type: 'swap', index: i, current: cur.exId, group: exGroup(cur.exId) });
      break;
    }
    case 'picker-all':
      pickerMode = { ...pickerMode, all: true };
      renderPicker();
      $search.focus();
      break;
    case 'close-dialog': btn.closest('dialog').close(); break;
    case 'pick': {
      const id = btn.dataset.id;
      const m = pickerMode;
      if (m.type === 'rot') { setRotation(m, id); break; }
      if (!a) return;
      if (m.type === 'swap') {
        // Byt på samma plats i passet. Finns övningen redan med byts ingenting.
        const at = a.exercises[m.index];
        if (!at || at.exId !== m.current || a.exercises.some(e => e.exId === id)) { $picker.close(); break; }
        if (timerOf() && timerOf().exId === m.current) clearTimer();
        if (exGroup(id) === exGroup(m.current)) {
          a.exercises[m.index] = newEntry(id);
          openIdx = m.index;
        } else {
          // En övning för en annan muskelgrupp flyttas till sin egen grupp i passet
          a.exercises.splice(m.index, 1);
          openIdx = insertInGroup(a.exercises, id);
        }
        showHow = false;
        save();
        $picker.close();
        render();
        focusPassStep();
        announce(`Bytt till ${exName(id)}.`);
        break;
      }
      let idx = a.exercises.findIndex(e => e.exId === id);
      const already = idx >= 0;
      if (!already) idx = insertInGroup(a.exercises, id);
      openIdx = idx;
      showHow = false;
      save();
      $picker.close();
      render();
      focusPassStep();
      if (already) announce(`${exName(id)} finns redan i passet.`);
      break;
    }

    case 'finish': finishPass(); break;
    case 'cancel':
      if (!confirm('Avbryta passet? Inget från det här passet sparas.')) return;
      endPass('hem');
      break;

    case 'delete-pass':
      if (!confirm('Radera passet för gott?')) return;
      state.history = state.history.filter(p => p.id !== btn.dataset.id);
      save(); render();
      $main.focus({ preventScroll: true });
      announce('Passet är raderat.');
      break;
    case 'delete-custom':
      if (!confirm('Radera övningen? Gamla pass med den visas som "Okänd övning".')) return;
      state.custom = state.custom.filter(c => c.id !== btn.dataset.id);
      delete state.notes[btn.dataset.id];
      Object.keys(state.rotation).forEach(k => { if (state.rotation[k] === btn.dataset.id) delete state.rotation[k]; });
      if (exFilter && !allGroups().includes(exFilter)) exFilter = null;
      save(); render();
      $main.focus({ preventScroll: true });
      announce('Övningen är raderad.');
      break;

    case 'edit-note': openNote(btn.dataset.id); break;
    case 'delete-note': saveNote(''); break;

    case 'schema-edit':
      schemaEdit = !schemaEdit;
      rerender();
      break;
    case 'rot-swap': {
      const m = { type: 'rot', group: btn.dataset.group, week: Number(btn.dataset.week), slot: Number(btn.dataset.slot) };
      m.current = rotWeek(m.group, m.week)[m.slot];
      if (m.current) openPicker(m);
      break;
    }
    case 'rot-reset':
      if (pickerMode.type === 'rot') setRotation(pickerMode, rotBase(pickerMode.group, pickerMode.week)[pickerMode.slot]);
      break;
    case 'rot-reset-all':
      if (!confirm('Återställa hela schemat till förslaget? Dina byten tas bort.')) return;
      state.rotation = {};
      save(); render();
      $main.focus({ preventScroll: true });
      announce('Schemat är återställt.');
      break;

    case 'hist-tab':
      histTab = btn.dataset.tab === 'framsteg' ? 'framsteg' : 'pass';
      rerender();
      break;
    case 'hist-period':
      histPeriod = Number(btn.dataset.weeks) || 0;
      rerender();
      break;

    case 'show-pass':
      histTab = 'pass';
      show('historik');
      showPass(btn.dataset.id);
      break;

    case 'export': exportData(); break;

    case 'open-settings':
      renderSettings();
      $settings.showModal();
      break;
    case 'set-theme': {
      if (!THEMES.some(t => t.id === btn.dataset.id)) return;
      state.settings.theme = btn.dataset.id;
      save();
      applyTheme();
      const list = document.getElementById('theme-list');
      list.innerHTML = themeButtons();
      const again = list.querySelector('[aria-pressed="true"]');
      if (again) again.focus();
      break;
    }
  }
});

// Tryck utanför en dialogruta stänger den
[$picker, $settings, $noteDialog].forEach(d => d.addEventListener('click', ev => {
  if (ev.target === d) d.close();
}));

// Inställningar sparas direkt när du ändrar dem
$settings.addEventListener('change', ev => {
  const el = ev.target;
  const st = state.settings;
  if (el.dataset.setting === 'step' && STEP_EQUIPMENT.includes(el.dataset.eq)) {
    const v = Number(el.value);
    if (v > 0 && STEP_OPTIONS.includes(v)) st.steps[el.dataset.eq] = v;
    else delete st.steps[el.dataset.eq];
  } else if (el.dataset.setting === 'rest') {
    const v = Number(el.value);
    st.rest = REST_OPTIONS.includes(v) ? v : 90;
    if (!st.rest) clearTimer();
  } else if (el.dataset.setting === 'sound') {
    st.sound = el.checked;
    if (st.sound) beep(); // Så hör du direkt hur det låter
  } else {
    return;
  }
  save();
});
// När rutan stängs ritas vyn om, så att nya inställningar syns direkt
$settings.addEventListener('close', () => rerender());

document.getElementById('note-form').addEventListener('submit', ev => {
  ev.preventDefault();
  saveNote($noteText.value);
});

// Spara direkt när du skriver kilo eller reps
$main.addEventListener('input', ev => {
  const el = ev.target;
  if (el.id === 'ex-search') {
    exQuery = el.value;
    renderExList();
    return;
  }
  if (el.tagName !== 'INPUT' || !el.dataset.field || !state.active) return;
  const e = state.active.exercises[Number(el.dataset.i)];
  if (!e) return;
  if (el.dataset.field === 'kg') e.kg = parseNum(el.value);
  else e.reps = el.value === '' ? '' : (parseInt(el.value, 10) || 0);
  save();
});

$main.addEventListener('change', ev => {
  if (ev.target.id === 'import-file' && ev.target.files[0]) {
    importData(ev.target.files[0]);
    ev.target.value = '';
  }
  if (ev.target.id === 'week-select') {
    chosenWeek = Number(ev.target.value);
    rerender();
  }
});

$main.addEventListener('submit', ev => {
  if (ev.target.id !== 'add-ex-form') return;
  ev.preventDefault();
  const name = document.getElementById('new-ex-name').value.trim();
  const group = document.getElementById('new-ex-group').value;
  const eq = document.getElementById('new-ex-eq').value;
  if (!name) return;
  if (EXERCISES.concat(state.custom).some(e => !e.hidden && e.name.toLowerCase() === name.toLowerCase())) {
    announce(`${name} finns redan.`);
    return;
  }
  state.custom.push({ id: 'egen-' + uid(), name, group, ...(eqById(eq) ? { eq } : {}) });
  save(); render();
  announce(`${name} är tillagd.`);
});

$search.addEventListener('input', renderPicker);

// Byt färger direkt om mobilen växlar mellan ljust och mörkt läge
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// När appen blir synlig igen: räkna om tiden direkt och håll skärmen tänd om en tid fortfarande går
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !timerOf()) return;
  onTick();
  const t = timerOf();
  if (t && !t.done) keepAwake(true);
});

applyTheme();
render();
resumeTimer();

'use strict';

// ---------- Data ----------
// Allt sparas i webbläsarens lagring (localStorage) på din mobil.
// Inget skickas till någon server.
//
// Det som sparas:
//   active:   pågående pass  { id, start, title, week, exercises: [{ exId, kg, reps, done }] }
//   history:  sparade pass   { id, start, end, title, week, exercises: [{ exId, sets: [{ kg, reps }], targetSets, targetReps }] }
//   custom:   egna övningar  { id, name, group }
//   settings: inställningar  { theme }
// Bara sista setet sparas per övning. Äldre pass kan ha flera set – då räknas det sista.

const KEY = 'gymma-v1';

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
const $themeDialog = document.getElementById('theme-dialog');
const $themeList = document.getElementById('theme-list');
const $status = document.getElementById('status');

let view = 'hem';
let chosenWeek = null; // Vecka du valt själv på startsidan (null = denna veckas)
let openIdx = null;    // Vilken övning som är öppen i passet (null = första som inte är klar)
let showHow = false;   // Visas de stora bilderna för den öppna övningen?
let state = load();

function emptyState() {
  return { active: null, history: [], custom: [], settings: { theme: 'gron' } };
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
    }));

  s.custom = (Array.isArray(s.custom) ? s.custom : [])
    .filter(c => c && c.id && c.name)
    .map(c => ({ ...c, group: c.group || 'Övrigt' }));

  s.settings = { theme: 'gron', ...(s.settings && typeof s.settings === 'object' ? s.settings : {}) };
  if (!THEMES.some(t => t.id === s.settings.theme)) s.settings.theme = 'gron';

  // Ett pass som pågick i en äldre version (med flera set) görs om till "sista setet".
  if (s.active && Array.isArray(s.active.exercises)) {
    s.active.exercises = s.active.exercises.filter(e => e && e.exId).map(e => {
      if (!Array.isArray(e.sets)) return e;
      const last = e.sets[e.sets.length - 1] || {};
      return { exId: e.exId, kg: last.kg ?? '', reps: last.reps ?? '', done: !!last.done };
    });
  } else {
    s.active = null;
  }
  return s;
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
  palette: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
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
  const ms = new Date(b) - new Date(a);
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 60000)) : null;
}

// Vilken vecka i treveckorsrotationen är det? Räknas i hela veckor från en fast måndag,
// så att rotationen fortsätter i samma takt över årsskiften.
const ROTATION_START = Date.UTC(2026, 10, 9); // Måndag 9 november 2026 = vecka 1
function currentWeek() {
  const m = mondayOf(new Date());
  const weeks = Math.round((Date.UTC(m.getFullYear(), m.getMonth(), m.getDate()) - ROTATION_START) / (7 * DAY_MS));
  return ((weeks % 3) + 3) % 3; // 0, 1 eller 2
}
const activeWeek = () => (chosenWeek == null ? currentWeek() : chosenWeek);

const todaysSchedule = () => SCHEDULE.find(s => s.day === new Date().getDay());
const groupsTitle = s => cap(s.groups.map(g => g.toLowerCase()).join(' och '));
const dayTitle = s => `${s.name} – ${s.groups.map(g => g.toLowerCase()).join(' och ')}`;
const exercisesFor = (s, week) => s.groups.flatMap(g => (ROTATION[g] || [])[week] || []);

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

function weekCount() {
  const monday = mondayOf(new Date());
  return state.history.filter(p => new Date(p.start) >= monday).length;
}

// Plus och minus på vikten: 1 kg i taget upp till 10 kg, sedan 2,5 kg.
function stepKg(value, dir) {
  const v = Number(value) || 0;
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
  return Number(prev.reps) >= repsFor(exId) ? stepKg(prev.kg, 1) : null;
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

// ---------- Vy: Hem ----------

function weekStrip() {
  const now = new Date();
  const monday = mondayOf(now);
  const trained = new Set(state.history.map(p => dayKey(new Date(p.start))));
  let h = '<ol class="weekstrip" aria-label="Den här veckan">';
  for (let k = 0; k < 7; k++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + k);
    const isToday = dayKey(d) === dayKey(now);
    const done = trained.has(dayKey(d));
    const planned = SCHEDULE.some(s => s.day === d.getDay());
    const cls = [done ? 'done' : '', isToday ? 'today' : '', !planned && !done ? 'rest' : ''].filter(Boolean).join(' ');
    const what = done ? 'tränat' : planned ? 'pass i schemat' : 'vilodag';
    h += `<li>
      <span class="d" aria-hidden="true">${DAYS_SHORT[d.getDay()]}</span>
      <span class="dot ${cls}" aria-hidden="true">${done ? icon('check') : d.getDate()}</span>
      <span class="sr-only">${cap(DAYS_LONG[d.getDay()])} ${d.getDate()}${isToday ? ', i dag' : ''}: ${what}</span>
    </li>`;
  }
  return h + '</ol>';
}

function weekSelect() {
  const now = currentWeek();
  return `<span class="weekchip">
    <label class="sr-only" for="week-select">Vecka i rotationen</label>
    <select id="week-select">
      ${[0, 1, 2].map(w => `<option value="${w}" ${w === activeWeek() ? 'selected' : ''}>Vecka ${w + 1} av 3${w === now ? ' (nu)' : ''}</option>`).join('')}
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
      <p>${done} av ${plural(a.exercises.length, 'övning', 'övningar')} klara</p>
      <button type="button" class="btn primary wide" data-action="goto" data-view="pass">${icon('play')} Fortsätt passet</button>
    </section>`;
  } else {
    const today = todaysSchedule();
    const week = activeWeek();
    if (today) {
      h += `<section class="hero">
        <div class="hero-top"><p class="overline">Dagens pass</p>${weekSelect()}</div>
        <h2>${esc(groupsTitle(today))}</h2>
        <div class="hero-cols">
          ${today.groups.map(g => `<div>
            <h3>${esc(g)}</h3>
            <ul>${((ROTATION[g] || [])[week] || []).map(id => `<li>${thumb(id)}<span>${esc(exName(id))}</span></li>`).join('')}</ul>
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
  h += `<dl class="stat-row">
    <div><dt>pass denna vecka</dt><dd>${weekCount()} av ${SCHEDULE.length}</dd></div>
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

function activeCard(e, i) {
  const name = exName(e.exId);
  const prev = lastResultFor(e.exId);
  const ex = exById(e.exId);
  const sek = isSek(e.exId);
  const picture = ex && ex.img
    ? `<button type="button" class="thumb-btn" data-action="toggle-how" aria-expanded="${showHow}" aria-label="Visa hur övningen görs">${thumb(e.exId, 'lg')}</button>`
    : thumb(e.exId, 'lg');
  return `<section class="card active-card" id="ex-${i}" aria-labelledby="ex-name-${i}">
    <div class="active-head">
      ${picture}
      <div class="grow">
        <h4 id="ex-name-${i}" tabindex="-1">${esc(name)}</h4>
        ${exPart(e.exId) ? `<span class="chip">${esc(exPart(e.exId))}</span>` : ''}
        <span class="chip">${DEFAULT_SETS} × ${repsFor(e.exId)} ${unitOf(e.exId)}</span>
      </div>
      <button type="button" class="icon-btn" data-action="remove-ex" data-i="${i}" aria-label="Ta bort ${esc(name)} från passet">${icon('close')}</button>
    </div>
    ${showHow ? howImgs(e.exId) : ''}
    ${hintFor(e, prev)}
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
    <span class="txt"><span class="name">${esc(name)}</span><span class="meta">${prev ? `Förra: ${esc(formatResult(prev, e.exId))}` : esc(exPart(e.exId) || 'Inte loggad än')}</span></span>
    ${icon('expand')}
  </button>`;
}

function viewPass() {
  const a = state.active;
  const t = splitTitle(a.title);
  const total = a.exercises.length;
  const done = a.exercises.filter(e => e.done).length;
  const open = currentOpen();
  const mins = minutesBetween(a.start, new Date());

  let h = `${t.over ? `<p class="overline">${esc(t.over)}</p>` : ''}
    <h2 class="pass-title">${esc(t.main)}</h2>
    ${progressBar(done, total)}
    <p class="muted small">${done} av ${plural(total, 'övning', 'övningar')} klara${mins ? ` · ${mins} min` : ''}</p>`;

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

function viewSchema() {
  const now = currentWeek();
  let h = `<h2>Schema</h2>
    <p>Varje muskelgrupp får 3 övningar per pass – en för varje del av muskeln. Övningarna byts ut i en rotation på 3 veckor. Denna vecka är <strong>vecka ${now + 1}</strong>.</p>`;
  SCHEDULE.forEach(s => {
    h += `<section class="card"><h3>${esc(dayTitle(s))}</h3>`;
    s.groups.forEach(g => {
      h += `<h4 class="group-head">${esc(g)}</h4><ol class="weeks">
        ${(ROTATION[g] || []).map((ids, w) => `<li class="${w === now ? 'now' : ''}">
          <span class="wk">Vecka ${w + 1}${w === now ? ' (nu)' : ''}</span>
          <ul class="plain">${ids.map(id => `<li>${esc(exName(id))} <span class="muted">– ${esc(exPart(id))}</span></li>`).join('')}</ul>
        </li>`).join('')}
      </ol>`;
    });
    h += '</section>';
  });
  h += '<p class="muted">Vill du byta övningar? Ändra i filen exercises.js under ROTATION.</p>';
  return h;
}

// ---------- Vy: Historik ----------

function trendChip(t) {
  if (t.dir === 'up') return `<span class="trend up">${icon('up')}<span class="sr-only">Ökning: </span>${esc(t.text)}</span>`;
  if (t.dir === 'down') return `<span class="trend">${icon('down')}<span class="sr-only">Minskning: </span>${esc(t.text)}</span>`;
  return `<span class="trend">${esc(t.text)}</span>`;
}

function viewHistorik() {
  let h = '<h2>Historik</h2>';
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
    const mins = minutesBetween(p.start, p.end);
    const meta = [
      p.week ? `Vecka ${p.week}` : '',
      mins ? `${mins} min` : '',
      plural(p.exercises.length, 'övning', 'övningar'),
      ups ? plural(ups, 'ökning', 'ökningar') : '',
    ].filter(Boolean).join(' · ');
    const title = `${shortDate(p.start)} · ${splitTitle(p.title, 'Pass').main}`;

    h += `<details class="card pass" ${idx === 0 ? 'open' : ''}>
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

function viewOvningar() {
  return `<h2>Övningar</h2>
    <div class="search-field">
      ${icon('search')}
      <label for="ex-search" class="sr-only">Sök övning eller muskeldel</label>
      <input id="ex-search" type="search" placeholder="Sök övning eller muskeldel …" autocomplete="off" value="${esc(exQuery)}">
    </div>
    <div class="chips" role="group" aria-label="Filtrera på muskelgrupp">
      ${[null, ...allGroups()].map(g => `<button type="button" class="filter-chip" data-action="filter-group"
        data-group="${esc(g ?? '')}" aria-pressed="${exFilter === g}">${exFilter === g ? icon('check') : ''}${esc(g ?? 'Alla')}</button>`).join('')}
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
        <button type="submit" class="btn primary">Lägg till</button>
      </form>
    </section>`;
}

// När ligger övningen i schemat? "Mån v. 2"
function scheduleFor(ex) {
  const weeks = (ROTATION[ex.group] || []).map((ids, w) => (ids.includes(ex.id) ? w + 1 : 0)).filter(Boolean);
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
  return `<details class="ex-item">
    <summary>
      ${thumb(ex.id)}
      <span class="txt"><span class="name">${esc(ex.name)}</span>${meta ? `<span class="meta">${esc(meta)}</span>` : ''}</span>
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
      ${custom ? `<div class="card-foot"><button type="button" class="text-btn danger" data-action="delete-custom" data-id="${esc(ex.id)}" aria-label="Radera övningen ${esc(ex.name)}">${icon('delete')} Radera övningen</button></div>` : ''}
    </div>
  </details>`;
}

function renderExList() {
  const $list = document.getElementById('ex-list');
  if (!$list) return;
  const q = exQuery.trim().toLowerCase();
  const matches = e => !q || e.name.toLowerCase().includes(q) || (e.part || '').toLowerCase().includes(q)
    || e.group.toLowerCase().includes(q);
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
      sel = ['action', 'i', 'field', 'dir', 'group', 'day', 'id'].filter(k => el.dataset[k] != null)
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
  view = v;
  render();
  window.scrollTo(0, 0);
  $main.focus({ preventScroll: true });
}

function scrollToEl(el) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
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

function renderThemes() {
  $themeList.innerHTML = THEMES.map(t => `<button type="button" class="theme-opt" data-theme="${t.id}"
    data-action="set-theme" data-id="${t.id}" aria-pressed="${state.settings.theme === t.id}">
    <span class="swatch" aria-hidden="true"><span></span></span>${esc(t.name)}
    ${state.settings.theme === t.id ? icon('check') : ''}
  </button>`).join('');
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
  endPass('historik', 'Bra jobbat! Passet är sparat.');
}

function openPicker() {
  $search.value = '';
  renderPicker();
  $picker.showModal();
  $search.focus();
}

function renderPicker() {
  const q = $search.value.trim().toLowerCase();
  let h = '';
  allGroups().forEach(g => {
    const list = allExercises().filter(e => e.group === g
      && (e.name.toLowerCase().includes(q) || (e.part || '').toLowerCase().includes(q)));
    if (!list.length) return;
    h += `<h3>${esc(g)}</h3><div class="stack">
      ${list.map(e => `<button type="button" class="btn small pick" data-action="pick" data-id="${esc(e.id)}">
        ${thumb(e.id)}
        <span>${esc(e.name)}${e.part ? `<span class="sub">${esc(e.part)}</span>` : ''}</span>
      </button>`).join('')}
    </div>`;
  });
  $pickerList.innerHTML = h || '<p>Ingen övning hittades. Lägg till den under Övningar.</p>';
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
      state = normalize({ ...emptyState(), ...s });
      openIdx = null;
      showHow = false;
      save();
      applyTheme();
      render();
      announce('Kopian är inläst.');
    } catch (e) {
      announce('Filen kunde inte läsas. Är det en kopia från Gymma?');
    }
  };
  reader.onerror = () => announce('Filen kunde inte läsas.');
  reader.readAsText(file);
}

// ---------- Händelser ----------

const PASS_ACTIONS = ['open-ex', 'toggle-how', 'step', 'bump', 'done', 'remove-ex', 'pick', 'finish', 'cancel'];

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
        const v = stepKg(e.kg, dir);
        e.kg = v === 0 ? '' : v;
      } else {
        e.reps = stepReps(e.reps, dir, e.exId);
      }
      save(); rerender();
      break;
    }
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
      a.exercises.splice(i, 1);
      openIdx = null;
      showHow = false;
      save(); render();
      $main.focus({ preventScroll: true });
      break;

    case 'open-picker': openPicker(); break;
    case 'close-dialog': btn.closest('dialog').close(); break;
    case 'pick': {
      a.exercises.push(newEntry(btn.dataset.id));
      openIdx = a.exercises.length - 1;
      showHow = false;
      save();
      $picker.close();
      render();
      focusPassStep();
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
      if (exFilter && !allGroups().includes(exFilter)) exFilter = null;
      save(); render();
      $main.focus({ preventScroll: true });
      announce('Övningen är raderad.');
      break;

    case 'export': exportData(); break;

    case 'open-theme':
      renderThemes();
      $themeDialog.showModal();
      break;
    case 'set-theme': {
      if (!THEMES.some(t => t.id === btn.dataset.id)) return;
      state.settings.theme = btn.dataset.id;
      save();
      applyTheme();
      renderThemes();
      const again = $themeList.querySelector('[aria-pressed="true"]');
      if (again) again.focus();
      break;
    }
  }
});

// Tryck utanför en dialogruta stänger den
[$picker, $themeDialog].forEach(d => d.addEventListener('click', ev => {
  if (ev.target === d) d.close();
}));

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
  if (!name) return;
  if (EXERCISES.concat(state.custom).some(e => !e.hidden && e.name.toLowerCase() === name.toLowerCase())) {
    announce(`${name} finns redan.`);
    return;
  }
  state.custom.push({ id: 'egen-' + uid(), name, group });
  save(); render();
  announce(`${name} är tillagd.`);
});

$search.addEventListener('input', renderPicker);

// Byt färger direkt om mobilen växlar mellan ljust och mörkt läge
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

applyTheme();
render();

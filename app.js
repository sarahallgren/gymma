'use strict';

// ---------- Data ----------
// Allt sparas i webbläsarens lagring (localStorage) på din mobil.
// Inget skickas till någon server.
//
// Ett sparat pass ser ut så här:
//   { id, start, end, title, week, exercises: [{ exId, sets: [{ kg, reps }], targetSets, targetReps }] }
// Sedan version 3 sparas bara sista setet. Äldre pass kan ha flera set – då räknas det sista.

const KEY = 'gymma-v1';
const $main = document.getElementById('main');
const $picker = document.getElementById('picker');
const $search = document.getElementById('picker-search');
const $pickerList = document.getElementById('picker-list');
const $status = document.getElementById('status');

let view = 'hem';
let chosenWeek = null; // Vecka du valt själv på startsidan (null = denna veckas)
let state = load();

function emptyState() {
  return { active: null, history: [], custom: [] };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.history)) return normalize({ ...emptyState(), ...s });
  } catch (e) { /* tom eller trasig lagring */ }
  return emptyState();
}

// Ett pass som pågick i en äldre version (med flera set) görs om till "sista setet".
function normalize(s) {
  if (s.active && Array.isArray(s.active.exercises)) {
    s.active.exercises = s.active.exercises.map(e => {
      if (!Array.isArray(e.sets)) return e;
      const last = e.sets[e.sets.length - 1] || {};
      return { exId: e.exId, kg: last.kg ?? '', reps: last.reps ?? '', done: !!last.done };
    });
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

// ---------- Hjälpfunktioner ----------

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const allExercises = () => EXERCISES.concat(state.custom);
// Muskelgrupper att visa – plus grupper från egna övningar som inte finns i listan
const allGroups = () => GROUPS.concat([...new Set(state.custom.map(c => c.group))].filter(g => !GROUPS.includes(g)));
const exById = id => allExercises().find(e => e.id === id);
const exName = id => (exById(id) || { name: 'Okänd övning' }).name;
const exPart = id => (exById(id) || {}).part || '';
const exGroup = id => (exById(id) || {}).group || 'Övrigt';
const isSek = id => (exById(id) || {}).unit === 'sek';
const repsFor = id => (exById(id) || {}).defaultReps || DEFAULT_REPS;

function parseNum(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : '';
}
const fmtNum = n => (n === '' || n == null ? '' : String(n).replace('.', ','));

function dateStr(iso) {
  return new Date(iso).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
}
function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}
function minutesBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000));
}

// "40 kg × 10 reps" eller "30 sek"
function formatResult(r, exId) {
  if (!r) return '';
  const amount = `${r.reps || 0} ${isSek(exId) ? 'sek' : 'reps'}`;
  return r.kg === '' || r.kg == null || r.kg === 0 ? amount : `${fmtNum(r.kg)} kg × ${amount}`;
}

// Vilken vecka i treveckorsrotationen är det? (Vecka 1, 2 eller 3, utifrån veckonumret)
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}
const currentWeek = () => (isoWeek(new Date()) - 1) % 3; // 0, 1 eller 2
const activeWeek = () => (chosenWeek == null ? currentWeek() : chosenWeek);

const todaysSchedule = () => SCHEDULE.find(s => s.day === new Date().getDay());
const dayTitle = s => `${s.name} – ${s.groups.map(g => g.toLowerCase()).join(' och ')}`;
const exercisesFor = (s, week) => s.groups.flatMap(g => (ROTATION[g] || [])[week] || []);

// Bilder som visar hur övningen görs (start och slut)
function howTo(exId) {
  const ex = exById(exId);
  if (!ex || !ex.img) return '';
  return `<details class="how">
    <summary>Visa hur övningen görs</summary>
    <div class="how-imgs">
      <figure><img src="bilder/${esc(ex.id)}-0.jpg" alt="${esc(ex.name)}, startläge" loading="lazy" width="480" height="320"><figcaption>Start</figcaption></figure>
      <figure><img src="bilder/${esc(ex.id)}-1.jpg" alt="${esc(ex.name)}, slutläge" loading="lazy" width="480" height="320"><figcaption>Slut</figcaption></figure>
    </div>
  </details>`;
}

// Sista setet förra gången du gjorde övningen
function lastResultFor(exId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = state.history[i].exercises.find(x => x.exId === exId);
    if (e && e.sets && e.sets.length) return e.sets[e.sets.length - 1];
  }
  return null;
}

function bestFor(exId) {
  let best = 0;
  for (const p of state.history) {
    for (const e of p.exercises) {
      if (e.exId !== exId) continue;
      for (const s of e.sets) best = Math.max(best, Number(s.kg) || 0);
    }
  }
  return best;
}

function weekCount() {
  const d = new Date();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return state.history.filter(p => new Date(p.start) >= monday).length;
}

let toastTimer;
function announce(msg) {
  $status.textContent = msg;
  $status.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $status.classList.remove('show'), 3000);
}

// ---------- Vyer ----------

function weekPicker() {
  const now = currentWeek();
  return `<div class="seg" role="group" aria-label="Välj vecka i rotationen">
    ${[0, 1, 2].map(w => `<button type="button" data-action="week" data-week="${w}"
      aria-pressed="${w === activeWeek()}">Vecka ${w + 1}${w === now ? '<span class="sub">denna vecka</span>' : ''}</button>`).join('')}
  </div>`;
}

function dayCard(s, primary) {
  const week = activeWeek();
  return `<button type="button" class="btn ${primary ? 'primary' : ''}" data-action="start" data-day="${s.day}">
    ${esc(dayTitle(s))}
    <span class="sub">${exercisesFor(s, week).map(id => esc(exName(id))).join(', ')}</span>
  </button>`;
}

function viewHem() {
  let h = '';
  if (state.active) {
    h += `<section class="card accent">
      <h2>Pass pågår</h2>
      <p>${esc(state.active.title || 'Eget pass')} · startat ${timeStr(state.active.start)}</p>
      <button type="button" class="btn primary" data-action="goto" data-view="pass">Fortsätt passet</button>
    </section>`;
  } else {
    const today = todaysSchedule();
    h += `<section class="card accent">
      <h2>${today ? 'Dagens pass' : 'Vilodag i dag'}</h2>
      ${weekPicker()}
      ${today
        ? dayCard(today, true)
        : '<p>Inget pass i schemat i dag. Vill du träna ändå? Välj ett pass nedanför.</p>'}
    </section>
    <section class="card">
      <h2>${today ? 'Andra pass' : 'Välj pass'}</h2>
      <div class="stack">
        ${SCHEDULE.filter(s => s !== today).map(s => dayCard(s, false)).join('')}
        <button type="button" class="btn ghost" data-action="start">Tomt pass – välj övningar själv</button>
      </div>
    </section>`;
  }

  const last = state.history[state.history.length - 1];
  h += `<section class="card">
    <h2>Din träning</h2>
    <dl class="stats">
      <div><dt>Pass denna vecka</dt><dd>${weekCount()}</dd></div>
      <div><dt>Pass totalt</dt><dd>${state.history.length}</dd></div>
    </dl>
    ${last
      ? `<p>Senaste passet: ${esc(dateStr(last.start))}.</p>`
      : '<p>Inga pass ännu. Starta ditt första ovanför!</p>'}
  </section>`;
  return h;
}

function viewPass() {
  const a = state.active;
  let h = `<h2>${esc(a.title || 'Eget pass')}</h2>
    <p class="muted">Kör ${DEFAULT_SETS} set per övning. Skriv vikt och hur många du orkade i <strong>sista setet</strong>, och tryck på Klar.</p>`;

  if (!a.exercises.length) h += '<p>Lägg till din första övning.</p>';

  let group = null;
  a.exercises.forEach((e, i) => {
    const g = exGroup(e.exId);
    if (g !== group) {
      group = g;
      h += `<h3 class="group-head">${esc(g)}</h3>`;
    }
    const name = exName(e.exId);
    const prev = lastResultFor(e.exId);
    const unit = isSek(e.exId) ? 'sek' : 'reps';
    h += `<section class="card ex ${e.done ? 'is-done' : ''}" id="ex-${i}" aria-labelledby="ex-name-${i}">
      <div class="ex-head">
        <div>
          <h4 id="ex-name-${i}">${esc(name)}</h4>
          ${exPart(e.exId) ? `<span class="chip">${esc(exPart(e.exId))}</span>` : ''}
        </div>
        <button type="button" class="icon-btn" data-action="remove-ex" data-i="${i}" aria-label="Ta bort ${esc(name)}">✕</button>
      </div>
      <p class="goal">Mål: ${DEFAULT_SETS} set × ${repsFor(e.exId)} ${unit}</p>
      ${prev ? `<p class="muted">Förra gången, sista setet: <strong>${esc(formatResult(prev, e.exId))}</strong></p>` : ''}
      ${howTo(e.exId)}
      <div class="last-set">
        <div class="field">
          <label for="kg-${i}">Kg</label>
          <input id="kg-${i}" type="text" inputmode="decimal" value="${esc(fmtNum(e.kg))}" data-i="${i}" data-field="kg">
        </div>
        <div class="field">
          <label for="reps-${i}">${unit === 'sek' ? 'Sek' : 'Reps'} i sista setet</label>
          <input id="reps-${i}" type="text" inputmode="numeric" pattern="[0-9]*" value="${esc(e.reps)}" data-i="${i}" data-field="reps">
        </div>
        <button type="button" class="check" data-action="toggle" data-i="${i}" aria-pressed="${!!e.done}"
          aria-label="${esc(name)} klar">✓<span class="check-label">Klar</span></button>
      </div>
    </section>`;
  });

  h += `<div class="stack">
    <button type="button" class="btn" data-action="open-picker">+ Lägg till övning</button>
    <button type="button" class="btn primary" data-action="finish">Avsluta och spara passet</button>
    <button type="button" class="btn ghost danger" data-action="cancel">Avbryt passet</button>
  </div>`;
  return h;
}

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

function viewHistorik() {
  let h = '<h2>Historik</h2>';
  if (!state.history.length) h += '<p>Här hamnar dina pass när du avslutat dem.</p>';

  [...state.history].reverse().forEach(p => {
    h += `<section class="card">
      <div class="ex-head">
        <h3>${esc(dateStr(p.start))}</h3>
        <button type="button" class="icon-btn" data-action="delete-pass" data-id="${esc(p.id)}" aria-label="Radera passet ${esc(dateStr(p.start))}">✕</button>
      </div>
      <p class="muted">${p.title ? `${esc(p.title)} · ` : ''}${minutesBetween(p.start, p.end)} min</p>
      <ul class="plain">
        ${p.exercises.map(e => `<li><strong>${esc(exName(e.exId))}</strong>: ${esc(formatResult(e.sets[e.sets.length - 1], e.exId))}</li>`).join('')}
      </ul>
    </section>`;
  });

  h += `<section class="card">
    <h2>Säkerhetskopia</h2>
    <p>Dina pass finns bara i den här webbläsaren. Spara en kopia ibland, till exempel i OneDrive.</p>
    <div class="row">
      <button type="button" class="btn small" data-action="export">Spara kopia</button>
      <label class="btn small ghost" for="import-file">Läs in kopia</label>
      <input id="import-file" type="file" accept="application/json,.json" class="sr-only">
    </div>
  </section>`;
  return h;
}

function viewOvningar() {
  let h = '<h2>Övningar</h2>';
  allGroups().forEach(g => {
    const list = allExercises().filter(e => e.group === g);
    if (!list.length) return;
    h += `<section class="card"><h3>${esc(g)}</h3><ul class="plain list">
      ${list.map(e => {
        const best = bestFor(e.id);
        const custom = state.custom.some(c => c.id === e.id);
        return `<li>
          <div class="li-row">
            <span>${esc(e.name)}
              <span class="muted small">${[e.part, best ? `bästa ${fmtNum(best)} kg` : ''].filter(Boolean).map(esc).join(' · ')}</span>
            </span>
            ${custom ? `<button type="button" class="icon-btn" data-action="delete-custom" data-id="${esc(e.id)}" aria-label="Radera ${esc(e.name)}">✕</button>` : ''}
          </div>
          ${howTo(e.id)}
        </li>`;
      }).join('')}
    </ul></section>`;
  });

  h += `<section class="card">
    <h2>Lägg till egen övning</h2>
    <form id="add-ex-form" class="stack">
      <label for="new-ex-name">Namn</label>
      <input id="new-ex-name" name="exname" type="text" required maxlength="40" autocomplete="off">
      <label for="new-ex-group">Muskelgrupp</label>
      <select id="new-ex-group" name="exgroup">${GROUPS.map(g => `<option>${esc(g)}</option>`).join('')}</select>
      <button type="submit" class="btn primary">Lägg till</button>
    </form>
  </section>`;
  return h;
}

const VIEWS = { hem: viewHem, pass: viewPass, schema: viewSchema, historik: viewHistorik, ovningar: viewOvningar };

function render() {
  if (view === 'pass' && !state.active) view = 'hem';
  document.querySelector('.tabs [data-view="pass"]').hidden = !state.active;
  document.querySelectorAll('.tabs button').forEach(b => {
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $main.innerHTML = VIEWS[view]();
}

// Rita om men behåll fokus på samma knapp/fält
function rerender() {
  const el = document.activeElement;
  let sel = null;
  if (el && $main.contains(el)) {
    if (el.id) sel = `#${CSS.escape(el.id)}`;
    else if (el.dataset && el.dataset.action) {
      sel = ['action', 'i', 'week'].filter(k => el.dataset[k] != null)
        .map(k => `[data-${k}="${el.dataset[k]}"]`).join('');
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

// ---------- Åtgärder ----------

// Ny övning i passet: vikten från förra gången och målet i reps är ifyllt
function newEntry(exId) {
  const prev = lastResultFor(exId);
  return { exId, kg: prev ? prev.kg : '', reps: repsFor(exId), done: false };
}

function startPass(day) {
  const s = SCHEDULE.find(x => String(x.day) === String(day));
  const week = activeWeek();
  state.active = {
    id: uid(),
    start: new Date().toISOString(),
    title: s ? `${dayTitle(s)} · vecka ${week + 1}` : 'Eget pass',
    week: s ? week + 1 : null,
    exercises: (s ? exercisesFor(s, week) : []).filter(exById).map(newEntry),
  };
  save();
  show('pass');
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
    state.active = null;
    save();
    show('hem');
    announce('Passet avslutades utan att sparas.');
    return;
  }
  const skipped = a.exercises.length - exercises.length;
  if (skipped > 0 && !confirm(`${skipped} övning(ar) är inte markerade som klara och sparas inte. Avsluta ändå?`)) return;

  state.history.push({
    id: a.id, start: a.start, end: new Date().toISOString(),
    title: a.title, week: a.week, exercises,
  });
  state.active = null;
  save();
  show('historik');
  announce('Bra jobbat! Passet är sparat.');
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
    const list = allExercises().filter(e => e.group === g && e.name.toLowerCase().includes(q));
    if (!list.length) return;
    h += `<h3>${esc(g)}</h3><div class="stack">
      ${list.map(e => `<button type="button" class="btn small pick" data-action="pick" data-id="${esc(e.id)}">
        ${e.img ? `<img src="bilder/${esc(e.id)}-0.jpg" alt="" loading="lazy" width="64" height="43">` : ''}
        <span>${esc(e.name)}${e.part ? `<span class="sub">${esc(e.part)}</span>` : ''}</span>
      </button>`).join('')}
    </div>`;
  });
  $pickerList.innerHTML = h || '<p>Ingen övning hittades. Lägg till den under Övningar.</p>';
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gymma-kopia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
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
      save();
      render();
      announce('Kopian är inläst.');
    } catch (e) {
      announce('Filen kunde inte läsas. Är det en kopia från Gymma?');
    }
  };
  reader.readAsText(file);
}

// ---------- Händelser ----------

document.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const { action } = btn.dataset;
  const i = Number(btn.dataset.i);
  const a = state.active;

  switch (action) {
    case 'goto': show(btn.dataset.view); break;
    case 'week': chosenWeek = Number(btn.dataset.week); rerender(); break;
    case 'start': startPass(btn.dataset.day); break;

    case 'toggle':
      a.exercises[i].done = !a.exercises[i].done;
      save(); rerender();
      break;
    case 'remove-ex':
      if (!confirm(`Ta bort ${exName(a.exercises[i].exId)} från passet?`)) return;
      a.exercises.splice(i, 1);
      save(); render();
      break;

    case 'open-picker': openPicker(); break;
    case 'close-picker': $picker.close(); break;
    case 'pick': {
      a.exercises.push(newEntry(btn.dataset.id));
      save();
      $picker.close();
      render();
      const card = document.getElementById(`ex-${a.exercises.length - 1}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const first = card.querySelector('input');
        if (first) first.focus({ preventScroll: true });
      }
      break;
    }

    case 'finish': finishPass(); break;
    case 'cancel':
      if (!confirm('Avbryta passet? Inget från det här passet sparas.')) return;
      state.active = null;
      save(); show('hem');
      break;

    case 'delete-pass':
      if (!confirm('Radera passet för gott?')) return;
      state.history = state.history.filter(p => p.id !== btn.dataset.id);
      save(); render();
      break;
    case 'delete-custom':
      if (!confirm('Radera övningen? Gamla pass med den visas som "Okänd övning".')) return;
      state.custom = state.custom.filter(c => c.id !== btn.dataset.id);
      save(); render();
      break;

    case 'export': exportData(); break;
  }
});

// Spara direkt när du skriver kilo eller reps
$main.addEventListener('input', ev => {
  const el = ev.target;
  if (!el.dataset.field || !state.active) return;
  const e = state.active.exercises[Number(el.dataset.i)];
  if (el.dataset.field === 'kg') e.kg = parseNum(el.value);
  else e.reps = el.value === '' ? '' : (parseInt(el.value, 10) || 0);
  save();
});

$main.addEventListener('change', ev => {
  if (ev.target.id === 'import-file' && ev.target.files[0]) {
    importData(ev.target.files[0]);
    ev.target.value = '';
  }
});

$main.addEventListener('submit', ev => {
  if (ev.target.id !== 'add-ex-form') return;
  ev.preventDefault();
  const name = document.getElementById('new-ex-name').value.trim();
  const group = document.getElementById('new-ex-group').value;
  if (!name) return;
  if (allExercises().some(e => e.name.toLowerCase() === name.toLowerCase())) {
    announce(`${name} finns redan.`);
    return;
  }
  state.custom.push({ id: 'egen-' + uid(), name, group });
  save(); render();
  announce(`${name} är tillagd.`);
});

$search.addEventListener('input', renderPicker);

render();

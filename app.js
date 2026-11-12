'use strict';

// ---------- Data ----------
// Allt sparas i webbläsarens lagring (localStorage) på din mobil.
// Inget skickas till någon server.

const KEY = 'gymma-v1';
const $main = document.getElementById('main');
const $picker = document.getElementById('picker');
const $search = document.getElementById('picker-search');
const $pickerList = document.getElementById('picker-list');
const $status = document.getElementById('status');

let view = 'hem';
let state = load();

function emptyState() {
  return { active: null, history: [], custom: [] };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.history)) return { ...emptyState(), ...s };
  } catch (e) { /* tom eller trasig lagring */ }
  return emptyState();
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
const exById = id => allExercises().find(e => e.id === id);
const exName = id => (exById(id) || { name: 'Okänd övning' }).name;

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

const unitOf = exId => ((exById(exId) || {}).unit === 'sek' ? 'sek' : 'reps');

// "40 kg × 12, 12, 10 · 42,5 kg × 8"   (för sekunder: "30, 30 sek")
function formatSets(sets, exId) {
  const parts = [];
  for (const s of sets) {
    const last = parts[parts.length - 1];
    if (last && last.kg === s.kg) last.reps.push(s.reps || 0);
    else parts.push({ kg: s.kg, reps: [s.reps || 0] });
  }
  const suffix = unitOf(exId) === 'sek' ? ' sek' : '';
  return parts.map(p => (p.kg === '' ? '' : `${fmtNum(p.kg)} kg × `) + p.reps.join(', ') + suffix).join(' · ');
}

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

const todaysTemplate = () => TEMPLATES.find(t => t.day === new Date().getDay());

function volume(pass) {
  return pass.exercises.reduce((sum, e) =>
    sum + e.sets.reduce((s, set) => s + (Number(set.kg) || 0) * (Number(set.reps) || 0), 0), 0);
}

// Senaste gången du gjorde en övning
function lastSetsFor(exId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = state.history[i].exercises.find(x => x.exId === exId);
    if (e && e.sets.length) return e.sets;
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

function viewHem() {
  let h = '';
  if (state.active) {
    h += `<section class="card accent">
      <h2>Pass pågår</h2>
      <p>Startat ${timeStr(state.active.start)} · ${state.active.exercises.length} övningar</p>
      <button type="button" class="btn primary" data-action="goto" data-view="pass">Fortsätt passet</button>
    </section>`;
  } else {
    const today = todaysTemplate();
    const tplButton = (t, primary) => `
      <button type="button" class="btn ${primary ? 'primary' : ''}" data-action="start" data-template="${esc(t.id)}">
        ${esc(t.name)}
        <span class="sub">${t.exercises.map(id => esc(exName(id))).join(', ')}</span>
      </button>`;

    if (today) {
      h += `<section class="card accent">
        <h2>Dagens pass</h2>
        ${tplButton(today, true)}
      </section>`;
    } else {
      h += `<section class="card accent">
        <h2>Vilodag i dag</h2>
        <p>Inget pass i schemat i dag. Vill du träna ändå? Välj ett pass nedanför.</p>
      </section>`;
    }
    h += `<section class="card">
      <h2>${today ? 'Andra pass' : 'Välj pass'}</h2>
      <div class="stack">
        ${TEMPLATES.filter(t => t !== today).map(t => tplButton(t, false)).join('')}
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
  let h = `<h2>Pågående pass</h2>
    <p class="muted">Startat ${timeStr(a.start)}. Bocka av varje set när du gjort det. Bara avbockade set med reps sparas.</p>`;

  if (!a.exercises.length) h += '<p>Lägg till din första övning.</p>';

  a.exercises.forEach((e, i) => {
    const name = exName(e.exId);
    const prev = lastSetsFor(e.exId);
    const unitLabel = unitOf(e.exId) === 'sek' ? 'Sek' : 'Reps';
    h += `<section class="card ex" id="ex-${i}">
      <div class="ex-head">
        <h3>${esc(name)}</h3>
        <button type="button" class="icon-btn" data-action="remove-ex" data-i="${i}" aria-label="Ta bort ${esc(name)}">✕</button>
      </div>
      ${prev ? `<p class="muted">Förra gången: ${esc(formatSets(prev, e.exId))}</p>` : ''}
      ${howTo(e.exId)}
      <table class="sets">
        <caption class="sr-only">Set för ${esc(name)}</caption>
        <thead><tr><th scope="col">Set</th><th scope="col">Kg</th><th scope="col">${unitLabel}</th><th scope="col">Klar</th></tr></thead>
        <tbody>
        ${e.sets.map((s, j) => `
          <tr class="${s.done ? 'done' : ''}">
            <th scope="row">${j + 1}</th>
            <td><input type="text" inputmode="decimal" value="${esc(fmtNum(s.kg))}"
                 data-i="${i}" data-j="${j}" data-field="kg" aria-label="Kilo, set ${j + 1}"></td>
            <td><input type="text" inputmode="numeric" pattern="[0-9]*" value="${esc(s.reps)}"
                 data-i="${i}" data-j="${j}" data-field="reps" aria-label="${unitLabel}, set ${j + 1}"></td>
            <td><button type="button" class="check" data-action="toggle" data-i="${i}" data-j="${j}"
                 aria-pressed="${s.done}" aria-label="Set ${j + 1} klart">✓</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="row">
        <button type="button" class="btn small" data-action="add-set" data-i="${i}">+ Set</button>
        ${e.sets.length > 1 ? `<button type="button" class="btn small ghost" data-action="remove-set" data-i="${i}">Ta bort sista set</button>` : ''}
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

function viewHistorik() {
  let h = '<h2>Historik</h2>';
  if (!state.history.length) h += '<p>Här hamnar dina pass när du avslutat dem.</p>';

  [...state.history].reverse().forEach(p => {
    h += `<section class="card">
      <div class="ex-head">
        <h3>${esc(dateStr(p.start))}</h3>
        <button type="button" class="icon-btn" data-action="delete-pass" data-id="${esc(p.id)}" aria-label="Radera passet ${esc(dateStr(p.start))}">✕</button>
      </div>
      <p class="muted">${minutesBetween(p.start, p.end)} min · totalt ${fmtNum(Math.round(volume(p)))} kg lyft</p>
      <ul class="plain">
        ${p.exercises.map(e => `<li><strong>${esc(exName(e.exId))}</strong>: ${esc(formatSets(e.sets, e.exId))}</li>`).join('')}
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
  GROUPS.forEach(g => {
    const list = allExercises().filter(e => e.group === g);
    if (!list.length) return;
    h += `<section class="card"><h3>${esc(g)}</h3><ul class="plain list">
      ${list.map(e => {
        const best = bestFor(e.id);
        const custom = state.custom.some(c => c.id === e.id);
        return `<li>
          <span>${esc(e.name)}${best ? ` <span class="muted">· bästa ${fmtNum(best)} kg</span>` : ''}</span>
          ${custom ? `<button type="button" class="icon-btn" data-action="delete-custom" data-id="${esc(e.id)}" aria-label="Radera ${esc(e.name)}">✕</button>` : ''}
        </li>`;
      }).join('')}
    </ul></section>`;
  });

  h += `<section class="card">
    <h2>Lägg till egen övning</h2>
    <form id="add-ex-form" class="stack">
      <label for="new-ex-name">Namn</label>
      <input id="new-ex-name" name="name" type="text" required maxlength="40" autocomplete="off">
      <label for="new-ex-group">Muskelgrupp</label>
      <select id="new-ex-group" name="group">${GROUPS.map(g => `<option>${esc(g)}</option>`).join('')}</select>
      <button type="submit" class="btn primary">Lägg till</button>
    </form>
  </section>`;
  return h;
}

const VIEWS = { hem: viewHem, pass: viewPass, historik: viewHistorik, ovningar: viewOvningar };

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
  if (el && $main.contains(el) && el.dataset) {
    sel = ['action', 'field', 'i', 'j'].filter(k => el.dataset[k] != null)
      .map(k => `[data-${k}="${el.dataset[k]}"]`).join('');
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

// Nya set: alltid DEFAULT_SETS st med målet DEFAULT_REPS.
// Kilona hämtas från förra gången, så du ser direkt vad du ska lyfta.
function newSetsFor(exId) {
  const ex = exById(exId) || {};
  const reps = ex.defaultReps || DEFAULT_REPS;
  const prev = lastSetsFor(exId) || [];
  const lastKg = prev.length ? prev[prev.length - 1].kg : '';
  return Array.from({ length: DEFAULT_SETS }, (_, k) => ({
    kg: prev[k] ? prev[k].kg : lastKg,
    reps,
    done: false,
  }));
}

function startPass(templateId) {
  const t = TEMPLATES.find(x => x.id === templateId);
  state.active = {
    id: uid(),
    start: new Date().toISOString(),
    exercises: (t ? t.exercises : []).filter(exById).map(exId => ({ exId, sets: newSetsFor(exId) })),
  };
  save();
  show('pass');
}

function finishPass() {
  const a = state.active;
  const exercises = a.exercises
    .map(e => ({ exId: e.exId, sets: e.sets.filter(s => s.done && Number(s.reps) > 0).map(s => ({ kg: s.kg, reps: s.reps })) }))
    .filter(e => e.sets.length);

  if (!exercises.length) {
    if (!confirm('Inga set är avbockade. Vill du avsluta utan att spara något?')) return;
    state.active = null;
    save();
    show('hem');
    announce('Passet avslutades utan att sparas.');
    return;
  }
  state.history.push({ id: a.id, start: a.start, end: new Date().toISOString(), exercises });
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
  GROUPS.forEach(g => {
    const list = allExercises().filter(e => e.group === g && e.name.toLowerCase().includes(q));
    if (!list.length) return;
    h += `<h3>${esc(g)}</h3><div class="stack">
      ${list.map(e => `<button type="button" class="btn small pick" data-action="pick" data-id="${esc(e.id)}">
        ${e.img ? `<img src="bilder/${esc(e.id)}-0.jpg" alt="" loading="lazy" width="64" height="43">` : ''}
        <span>${esc(e.name)}</span>
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
      state = { ...emptyState(), ...s };
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
  const j = Number(btn.dataset.j);
  const a = state.active;

  switch (action) {
    case 'goto': show(btn.dataset.view); break;
    case 'start': startPass(btn.dataset.template); break;

    case 'toggle': {
      const s = a.exercises[i].sets[j];
      s.done = !s.done;
      save(); rerender();
      break;
    }
    case 'add-set': {
      const sets = a.exercises[i].sets;
      const last = sets[sets.length - 1] || { kg: '', reps: '' };
      sets.push({ kg: last.kg, reps: last.reps, done: false });
      save(); rerender();
      break;
    }
    case 'remove-set':
      a.exercises[i].sets.pop();
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
      const id = btn.dataset.id;
      a.exercises.push({ exId: id, sets: newSetsFor(id) });
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
  const s = state.active.exercises[Number(el.dataset.i)].sets[Number(el.dataset.j)];
  if (el.dataset.field === 'kg') s.kg = parseNum(el.value);
  else s.reps = el.value === '' ? '' : (parseInt(el.value, 10) || 0);
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

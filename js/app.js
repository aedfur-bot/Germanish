// Entry point: service worker, seeding, hash router, persistent header.
import { h, mount, toast } from './ui.js';
import { ensureSeeded } from './seed.js';
import * as store from './store.js';
import { dayKey } from './day.js';
import { PHASES } from './content/phases.js';

const ROUTES = {
  today: () => import('./views/today.js'),
  progress: () => import('./views/progress.js'),
  grammar: () => import('./views/grammar.js'),
  review: () => import('./views/review.js'),
  input: () => import('./views/input.js'),
  output: () => import('./views/output.js'),
  errors: () => import('./views/errors.js'),
  settings: () => import('./views/settings.js'),
};

const view = document.getElementById('view');
let currentDay = dayKey();
let cleanup = null;

function parseHash() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'today').split('/').map(decodeURIComponent);
  return { name: ROUTES[parts[0]] ? parts[0] : 'today', params: parts.slice(1) };
}

async function route() {
  const { name, params } = parseHash();
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} }
  cleanup = null;
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
  try {
    const mod = await ROUTES[name]();
    mount(view);
    cleanup = await mod.render(view, params);
  } catch (e) {
    console.error(e);
    mount(view, h('div.card', h('h2', 'Something went wrong'), h('pre', { style: { whiteSpace: 'pre-wrap' } }, String(e?.stack || e))));
  }
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

export function rerender() { route(); }

async function refreshChrome() {
  const [s, day, prog, streak] = await Promise.all([store.getSettings(), store.getDay(), store.getProgress(), store.computeStreak()]);
  const q = store.quotaFor(s.mode);
  // tab badges
  for (const [b, info] of Object.entries(store.BLOCKS)) {
    const a = document.querySelector(`.tabs a[data-tab="${info.key}"]`);
    if (!a) continue;
    let badge = a.querySelector('.badge');
    if (!badge) a.append(badge = h('span.badge'));
    const done = Math.min(day.counts[b] || 0, q[b]);
    badge.textContent = `${done}/${q[b]}`;
    badge.classList.toggle('ok', done >= q[b]);
  }
  // streak
  const st = document.getElementById('streak');
  mount(st, h('span', '🔥 ', h('b', String(streak.streak)), streak.streak === 1 ? ' day' : ' days'),
    streak.freezeUsedThisWeek ? h('span.faint', ' · freeze used') : null);
  // mini roadmap
  const mini = document.getElementById('roadmap-mini');
  mount(mini, PHASES.map((p) => {
    const items = p.n === 4 ? [...p.items, ...(prog.customTargets || [])] : p.items;
    const ticked = items.filter((i) => prog.checks[i.id]).length;
    const state = p.n < prog.phase ? 'done' : p.n === prog.phase ? 'current' : '';
    return h('div.seg', { class: state, title: `Phase ${p.n} — ${p.name} (${ticked}/${items.length})` },
      h('div.fill', { style: { width: state === 'done' ? '0' : `${(ticked / items.length) * 100}%` } }),
      h('span', `${p.n} · ${state === 'done' ? '✓' : `${ticked}/${items.length}`}`));
  }));
}

document.getElementById('roadmap-mini').addEventListener('click', () => { location.hash = '#/progress'; });

store.on(() => refreshChrome());
window.addEventListener('hashchange', route);

// Study-day rollover at 04:00 while the app is open.
function checkRollover() {
  const d = dayKey();
  if (d !== currentDay) { currentDay = d; refreshChrome(); route(); toast('New study day — good morning!'); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRollover(); });
setInterval(checkRollover, 60_000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
}

(async () => {
  mount(view, h('div.empty', 'Loading…'));
  await ensureSeeded();
  await refreshChrome();
  await route();
})();

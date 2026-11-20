import { h, mount, tasksDots, segmented } from '../ui.js';
import * as store from '../store.js';
import { PHASES } from '../content/phases.js';
import { prettyDay, dayKey } from '../day.js';
import { deckStats } from '../srs.js';

export async function render(el) {
  const draw = async () => {
    const [s, day, prog, streak, deck] = await Promise.all([
      store.getSettings(), store.getDay(), store.getProgress(), store.computeStreak(), deckStats(),
    ]);
    const q = store.quotaFor(s.mode);
    const phase = PHASES[prog.phase];
    const totalQ = Object.values(q).reduce((a, b) => a + b, 0);
    const totalDone = [1, 2, 3, 4, 5].reduce((a, b) => a + Math.min(day.counts[b] || 0, q[b]), 0);
    const next = [1, 2, 3, 4, 5].find((b) => (day.counts[b] || 0) < q[b]);

    mount(el,
      h('div.row.between', { style: { marginBottom: '12px' } },
        h('div', h('h1', 'Today'), h('small', prettyDay(dayKey()), ' · day resets at 04:00')),
        segmented(Object.keys(store.MODES).map((k) => [k, k]), s.mode,
          async (m) => { await store.setMode(m); draw(); })),

      h('div.card',
        h('div.row.between', h('b', `${totalDone}/${totalQ} tasks`), day.completedAt ? h('span.pill.green', 'Day complete ✓') : h('span.pill', 'in progress')),
        h('div.progress', { style: { marginTop: '8px' } }, h('div', { style: { width: `${(totalDone / totalQ) * 100}%` } })),
        next ? h('a.btn.primary.block', { href: `#/${store.BLOCKS[next].key}`, style: { marginTop: '12px' } },
          `Next: Block ${next} — ${store.BLOCKS[next].name}`) : null),

      h('div.card', h('h2', 'Session blocks'), h('small.muted', 'Fixed order: input → retrieval → input → output → error review.'),
        [1, 2, 3, 4, 5].map((b) => {
          const done = Math.min(day.counts[b] || 0, q[b]);
          const info = store.BLOCKS[b];
          return h('a.block-row.list-item', { href: `#/${info.key}`, class: done >= q[b] ? 'complete' : '' },
            h('span.num', done >= q[b] ? '✓' : String(b)),
            h('div.grow', h('div', info.name), h('small', `${q[b]} × ${info.unit}`, b === 2 ? ` · ${deck.due} due, ${deck.fresh} new` : '')),
            tasksDots(done, q[b]));
        })),

      h('a.card', { href: '#/progress', style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
        h('div.row.between', h('h2', `Phase ${phase.n} — ${phase.name}`), h('span.pill.gold', phase.level)),
        h('p.muted', { style: { margin: 0 } }, phase.focus)),

      h('div.card',
        h('h2', 'Streak'),
        h('p', h('b', String(streak.streak)), ` day${streak.streak === 1 ? '' : 's'} · best ${streak.best}`),
        h('small', 'A day counts when all five blocks hit their quota. One missed day per week is covered by an automatic freeze',
          streak.freezeUsedThisWeek ? ' — already used this week.' : ' — still available this week.')),
    );
  };
  await draw();
  return store.on((w) => { if (w === 'day') draw(); });
}

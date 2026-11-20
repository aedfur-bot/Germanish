// Phase roadmap (tech-tree style) with user-ticked checklists and supporting stats.
import { h, mount, toast, confirmBox, fmtDate } from '../ui.js';
import * as store from '../store.js';
import { PHASES, allItems } from '../content/phases.js';
import { computeStats } from '../stats.js';
import { uid } from '../db.js';

export async function render(el, params) {
  let selected = params[0] != null ? Number(params[0]) : null;

  const draw = async () => {
    const [prog, stats] = await Promise.all([store.getProgress(), computeStats()]);
    if (selected == null) selected = prog.phase;
    const sel = PHASES[selected];
    const items = allItems(selected, prog);
    const ticked = items.filter((i) => prog.checks[i.id]).length;
    const allTicked = items.length > 0 && ticked === items.length;

    const toggle = async (id, on) => {
      const p = await store.getProgress();
      if (on) p.checks[id] = Date.now(); else delete p.checks[id];
      await store.saveProgress(p);
      draw();
    };

    const advance = async (to, via) => {
      const p = await store.getProgress();
      p.history = [...(p.history || []), { from: p.phase, phase: to, at: Date.now(), via }];
      p.phase = to;
      await store.saveProgress(p);
      selected = to;
      toast(`Now in Phase ${to} — ${PHASES[to].name}`);
      draw();
    };

    mount(el,
      h('h1', 'Roadmap'),
      h('p.muted', 'Tick items yourself when you judge them done. The numbers beside each item are there to inform that judgement, not to decide it.'),
      h('div.roadmap', { role: 'list' },
        PHASES.flatMap((p, i) => {
          const its = allItems(p.n, prog);
          const t = its.filter((x) => prog.checks[x.id]).length;
          const state = p.n < prog.phase ? 'done' : p.n === prog.phase ? 'current' : 'locked';
          const node = h('button.node', {
            role: 'listitem', class: `${state} ${p.n === selected ? 'selected' : ''}`,
            onclick: () => { selected = p.n; draw(); },
            'aria-label': `Phase ${p.n} ${p.name}, ${state}`,
          },
          h('div.ph', `Phase ${p.n}`, state === 'done' ? ' ✓' : state === 'locked' ? ' 🔒' : ' ●'),
          h('div.nm', p.name), h('div.lv', p.level),
          h('div.ck', p.ongoing ? `${t} targets met` : `${t}/${its.length}`));
          return i ? [h('div.edge', { class: p.n <= prog.phase ? 'done' : '' }), node] : [node];
        })),

      h('div.card',
        h('div.row.between',
          h('h2', `Phase ${sel.n} — ${sel.name}`),
          h('span.pill', { class: selected === prog.phase ? 'gold' : selected < prog.phase ? 'green' : '' },
            selected === prog.phase ? 'current' : selected < prog.phase ? 'completed' : 'locked')),
        h('p.muted', sel.focus),
        h('ul.checklist',
          items.map((it) => h('li',
            h('input', { type: 'checkbox', id: `ck-${it.id}`, checked: !!prog.checks[it.id], onchange: (e) => toggle(it.id, e.target.checked) }),
            h('label', { for: `ck-${it.id}`, style: { color: 'var(--text)', fontSize: '.95rem', margin: 0, cursor: 'pointer' } },
              it.label,
              h('div.stat', stats[it.stat] || ''),
              prog.checks[it.id] ? h('div.stat', `ticked ${fmtDate(prog.checks[it.id])}`) : null),
            it.custom ? h('button.btn.small.ghost', { onclick: async () => {
              const p = await store.getProgress();
              p.customTargets = p.customTargets.filter((t) => t.id !== it.id); delete p.checks[it.id];
              await store.saveProgress(p); draw();
            }, 'aria-label': 'Remove target' }, '✕') : null))),

        sel.n === 4 ? h('form.row', { style: { marginTop: '10px' }, onsubmit: async (e) => {
          e.preventDefault();
          const v = e.target.elements.t.value.trim(); if (!v) return;
          const p = await store.getProgress();
          p.customTargets = [...(p.customTargets || []), { id: uid('p4-'), label: v }];
          await store.saveProgress(p); draw();
        } }, h('input.grow', { name: 't', type: 'text', placeholder: 'Add a deliberate-practice target (e.g. "dative after mit/bei in speech")' }),
        h('button.btn', { type: 'submit' }, 'Add')) : null,

        h('div.row', { style: { marginTop: '14px' } },
          selected === prog.phase && selected < 4
            ? h('button.btn.primary', { disabled: !allTicked, onclick: async () => {
              if (await confirmBox(`All items ticked. Move on to Phase ${selected + 1} — ${PHASES[selected + 1].name}?`, 'Advance')) advance(selected + 1, 'checklist');
            } }, allTicked ? `Confirm: advance to Phase ${selected + 1}` : `${ticked}/${items.length} ticked — advance when all are done`)
            : null,
          selected !== prog.phase
            ? h('button.btn', { onclick: async () => {
              if (await confirmBox(`Manual override: switch your current phase to Phase ${selected} (${sel.name})? Checklist ticks are kept.`, 'Switch phase')) advance(selected, 'override');
            } }, `Override: make Phase ${selected} current`)
            : null),
        selected === prog.phase && sel.ongoing ? h('p.muted', { style: { marginTop: '8px' } }, 'Phase 4 has no exit — keep refining your targets.') : null),

      h('div.card',
        h('h3', 'What this phase means for each block'),
        h('ul', { style: { paddingLeft: '18px', margin: 0 } },
          [1, 2, 3, 4, 5].map((b) => h('li', { style: { marginBottom: '4px' } }, h('b', `${store.BLOCKS[b].name}: `), sel.blocks[b])))),

      prog.history?.length ? h('details.card', h('summary', 'Phase history'),
        h('ul', prog.history.slice().reverse().map((x) => h('li', `${fmtDate(x.at)}: Phase ${x.from ?? '?'} → ${x.phase} (${x.via})`)))) : null,
    );
  };
  await draw();
}
